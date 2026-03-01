import type { DemoColor } from '../types';

const hueLabels = ['Y', 'Y10R', 'Y90R', 'R', 'R90B', 'B', 'B50G', 'G', 'G50Y', 'Y'];

const clampChannel = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sat = s / 100;
  const light = l / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c;
    gPrime = x;
  } else if (h < 120) {
    rPrime = x;
    gPrime = c;
  } else if (h < 180) {
    gPrime = c;
    bPrime = x;
  } else if (h < 240) {
    gPrime = x;
    bPrime = c;
  } else if (h < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return [
    clampChannel((rPrime + m) * 255),
    clampChannel((gPrime + m) * 255),
    clampChannel((bPrime + m) * 255),
  ];
};

const pickHueLabel = (hue: number): string => {
  const idx = Math.floor((hue / 360) * (hueLabels.length - 1));
  return hueLabels[idx];
};

export const generateNcsStylePalette = (): DemoColor[] => {
  const hues = Array.from({ length: 12 }, (_, i) => i * 30);
  const satLevels = [20, 50, 80];
  const lightnessLevels = [85, 60, 35, 20];
  const lightnessBuckets = [5, 10, 20, 40];
  const chromaBuckets = [0, 20, 40, 60, 80];

  const palette: DemoColor[] = [];

  for (const hue of hues) {
    for (let lIndex = 0; lIndex < lightnessLevels.length; lIndex += 1) {
      for (let sIndex = 0; sIndex < satLevels.length; sIndex += 1) {
        const s = satLevels[sIndex];
        const l = lightnessLevels[lIndex];
        const rgb = hslToRgb(hue, s, l);
        const darkness = lightnessBuckets[lIndex].toString().padStart(2, '0');
        const chroma = chromaBuckets[sIndex + 1].toString().padStart(2, '0');
        const suffix = pickHueLabel(hue);

        palette.push({
          code: `NCS S ${darkness}${chroma}-${suffix}`,
          rgb,
        });
      }
    }
  }

  return palette;
};
