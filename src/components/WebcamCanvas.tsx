import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import type { DemoColor, MaskData, Point } from '../types';
import { exportMask, findNearestVertex, fromNormalizedPoints, parseMask, toNormalizedPoints } from '../utils/mask';
import { renderFrame } from '../utils/render';

type WebcamCanvasProps = {
  selectedColor: DemoColor;
  opacityPercent: number;
  shadingMode: boolean;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export default function WebcamCanvas({
  selectedColor,
  opacityPercent,
  shadingMode,
}: WebcamCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraDenied, setCameraDenied] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const source = useMemo<CanvasImageSource | null>(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      return videoRef.current;
    }
    return imageEl;
  }, [imageEl, isVideoReady]);

  useEffect(() => {
    const startCamera = async (): Promise<void> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          audio: false,
        });
        streamRef.current = stream;

        const video = document.createElement('video');
        video.playsInline = true;
        video.muted = true;
        video.srcObject = stream;
        video.onloadeddata = () => {
          setIsVideoReady(true);
        };
        await video.play();
        videoRef.current = video;
        setIsVideoReady(video.readyState >= 2);
        setCameraDenied(false);
      } catch {
        setIsVideoReady(false);
        setCameraDenied(true);
      }
    };

    void startCamera();

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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
  }, [source, points, isClosed, selectedColor, opacityPercent, shadingMode]);

  const relativePoint = (event: MouseEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return { x, y };
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>): void => {
    if (isClosed) {
      return;
    }
    const p = relativePoint(event);
    setPoints((prev) => [...prev, p]);
  };

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>): void => {
    const p = relativePoint(event);
    const idx = findNearestVertex(points, p);
    if (idx >= 0) {
      setDragIdx(idx);
    }
  };

  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>): void => {
    if (dragIdx === null) {
      return;
    }
    const p = relativePoint(event);
    setPoints((prev) => prev.map((point, idx) => (idx === dragIdx ? p : point)));
  };

  const handleMouseUp = (): void => {
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
          <label className="file-btn">
            Upload image fallback
            <input type="file" accept="image/*" onChange={onUploadImage} />
          </label>
        )}
      </div>

      <div className="stage-shell">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </section>
  );
}
