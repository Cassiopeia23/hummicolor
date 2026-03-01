import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent } from 'react';
import type { DemoColor, MaskData, Point } from '../types';
import { exportMask, findNearestVertex, fromNormalizedPoints, parseMask, toNormalizedPoints } from '../utils/mask';
import { renderFrame } from '../utils/render';

type WebcamCanvasProps = {
  selectedColor: DemoColor;
  opacityPercent: number;
  shadingMode: boolean;
  arLightMode: boolean;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export default function WebcamCanvas({
  selectedColor,
  opacityPercent,
  shadingMode,
  arLightMode,
}: WebcamCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraDenied, setCameraDenied] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [lightVector, setLightVector] = useState({ x: 0, y: -0.3 });

  const canUseCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const isLikelySecureContext =
    typeof window !== 'undefined' &&
    (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const startCamera = useCallback(async (): Promise<void> => {
    if (!canUseCamera) {
      setCameraDenied(true);
      setCameraErrorMessage('Dein Browser unterstützt keine Kamera-API (getUserMedia).');
      return;
    }

    if (!isLikelySecureContext) {
      setCameraDenied(true);
      setCameraErrorMessage('Kamera braucht HTTPS oder localhost. Öffne die App über https://.');
      return;
    }

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CANVAS_WIDTH },
          height: { ideal: CANVAS_HEIGHT },
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.srcObject = stream;
      video.onloadeddata = () => {
        setIsVideoReady(true);
      };

      await video.play();

      videoRef.current = video;
      setIsVideoReady(video.readyState >= 2);
      setCameraDenied(false);
      setCameraErrorMessage('');
    } catch (error) {
      setIsVideoReady(false);
      setCameraDenied(true);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setCameraErrorMessage('Kamera blockiert. Bitte Berechtigung im Browser aktivieren.');
          return;
        }
        if (error.name === 'NotFoundError') {
          setCameraErrorMessage('Keine Kamera gefunden.');
          return;
        }
      }

      setCameraErrorMessage('Kamera konnte nicht gestartet werden. Nutze sonst den Bild-Upload.');
    }
  }, [canUseCamera, isLikelySecureContext]);

  const source = useMemo<CanvasImageSource | null>(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      return videoRef.current;
    }
    return imageEl;
  }, [imageEl, isVideoReady]);

  useEffect(() => {
    void startCamera();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (!arLightMode || typeof window === 'undefined') {
      return;
    }

    const onTilt = (event: DeviceOrientationEvent): void => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const x = Math.max(-1, Math.min(1, gamma / 60));
      const y = Math.max(-1, Math.min(1, beta / 90));
      setLightVector({ x, y });
    };

    window.addEventListener('deviceorientation', onTilt);
    return () => window.removeEventListener('deviceorientation', onTilt);
  }, [arLightMode]);

  useEffect(() => {
    const draw = (): void => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      if (source) {
        renderFrame({
          ctx,
          source,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          polygon: points,
          closed: isClosed,
          color: selectedColor.rgb,
          opacity: opacityPercent / 100,
          shadingMode,
          lightVector: arLightMode ? lightVector : undefined,
        });
      } else {
        ctx.fillStyle = '#20242d';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#64b5ff';
      ctx.fillStyle = '#ffffff';

      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        if (isClosed && points.length > 2) {
          ctx.closePath();
        }
        ctx.stroke();
      }

      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [source, points, isClosed, selectedColor, opacityPercent, shadingMode, arLightMode, lightVector]);

  const relativePoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return { x, y };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>): void => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const p = relativePoint(event);
    const idx = findNearestVertex(points, p);
    if (idx >= 0) {
      setDragIdx(idx);
      return;
    }

    if (!isClosed) {
      setPoints((prev) => [...prev, p]);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (dragIdx === null) {
      return;
    }
    const p = relativePoint(event);
    setPoints((prev) => prev.map((point, idx) => (idx === dragIdx ? p : point)));
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>): void => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragIdx(null);
  };

  const closePolygon = (): void => {
    if (points.length >= 3) {
      setIsClosed(true);
    }
  };

  const clearMask = (): void => {
    setPoints([]);
    setIsClosed(false);
  };

  const savePng = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paintroom-demo.png';
    a.click();
  };

  const saveMaskJson = (): void => {
    const normalized = toNormalizedPoints(points, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data: MaskData = {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      points: normalized,
      closed: isClosed,
    };
    const blob = new Blob([exportMask(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paintroom-mask.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoadMask = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const parsed = parseMask(text);
    if (!parsed) {
      return;
    }
    setPoints(fromNormalizedPoints(parsed.points, CANVAS_WIDTH, CANVAS_HEIGHT));
    setIsClosed(parsed.closed);
  };

  const onUploadImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImageEl(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <section className="canvas-area">
      <div className="toolbar">
        {!isVideoReady && (
          <button onClick={() => void startCamera()}>Enable camera</button>
        )}
        <button onClick={closePolygon} disabled={points.length < 3 || isClosed}>
          Close polygon
        </button>
        <button onClick={clearMask}>Clear mask</button>
        <button onClick={savePng}>Save PNG</button>
        <button onClick={saveMaskJson}>Save mask JSON</button>
        <label className="file-btn">
          Load mask JSON
          <input type="file" accept="application/json" onChange={onLoadMask} />
        </label>
        {cameraDenied && (
          <>
            <label className="file-btn">
              Upload image fallback
              <input type="file" accept="image/*" onChange={onUploadImage} />
            </label>
            {cameraErrorMessage && <p className="camera-hint">{cameraErrorMessage}</p>}
          </>
        )}
      </div>

      <div className="stage-shell">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </section>
  );
}
