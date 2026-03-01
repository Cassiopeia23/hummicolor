import type { Point } from '../types';

type RenderParams = {
  ctx: CanvasRenderingContext2D;
  source: CanvasImageSource;
  width: number;
  height: number;
  polygon: Point[];
  closed: boolean;
  color: [number, number, number];
  opacity: number;
  shadingMode: boolean;
};

const drawPolygonPath = (ctx: CanvasRenderingContext2D, polygon: Point[]): void => {
  if (polygon.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i += 1) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
};

export const renderFrame = ({
  ctx,
  source,
  width,
  height,
  polygon,
  closed,
  color,
  opacity,
  shadingMode,
}: RenderParams): void => {
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  if (!closed || polygon.length < 3 || opacity <= 0) {
    return;
  }

  drawPolygonPath(ctx, polygon);
  ctx.save();
  ctx.clip();

  if (shadingMode) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const alpha = Math.max(0, Math.min(1, opacity));

    for (let i = 0; i < data.length; i += 4) {
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      const shade = 0.45 + lum * 0.75;
      const tr = Math.max(0, Math.min(255, color[0] * shade));
      const tg = Math.max(0, Math.min(255, color[1] * shade));
      const tb = Math.max(0, Math.min(255, color[2] * shade));

      data[i] = Math.round(data[i] * (1 - alpha) + tr * alpha);
      data[i + 1] = Math.round(data[i + 1] * (1 - alpha) + tg * alpha);
      data[i + 2] = Math.round(data[i + 2] * (1 - alpha) + tb * alpha);
    }

    ctx.putImageData(imageData, 0, 0);
  } else {
    ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();

  drawPolygonPath(ctx, polygon);
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.filter = 'blur(1px)';
  ctx.stroke();
  ctx.restore();
};
