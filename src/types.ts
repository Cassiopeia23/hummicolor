export type Point = {
  x: number;
  y: number;
};

export type DemoColor = {
  code: string;
  rgb: [number, number, number];
};

export type MaskData = {
  width: number;
  height: number;
  points: Point[];
  closed: boolean;
};
