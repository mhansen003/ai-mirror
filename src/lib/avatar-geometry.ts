import type { Point2D } from '@/types/expressions';

/**
 * Base geometry control points for the avatar face.
 * All coordinates are normalized (0-1), scaled to canvas at render time.
 * The face is centered at (0.5, 0.48) with proportions inspired by
 * anime/cyberpunk aesthetic — slightly larger eyes, angular jawline.
 */

export interface FaceGeometry {
  faceOutline: Point2D[];
  leftEye: { center: Point2D; radiusX: number; radiusY: number };
  rightEye: { center: Point2D; radiusX: number; radiusY: number };
  leftPupil: Point2D;
  rightPupil: Point2D;
  leftBrow: Point2D[];
  rightBrow: Point2D[];
  nose: Point2D[];
  mouth: { center: Point2D; width: number; height: number };
  jawLine: Point2D[];
}

export function getBaseGeometry(): FaceGeometry {
  return {
    faceOutline: [
      { x: 0.5, y: 0.15 },     // top of forehead
      { x: 0.62, y: 0.17 },    // right forehead
      { x: 0.72, y: 0.25 },    // right temple
      { x: 0.76, y: 0.38 },    // right cheekbone
      { x: 0.74, y: 0.52 },    // right cheek
      { x: 0.68, y: 0.65 },    // right jaw
      { x: 0.58, y: 0.76 },    // right chin
      { x: 0.5, y: 0.80 },     // chin center
      { x: 0.42, y: 0.76 },    // left chin
      { x: 0.32, y: 0.65 },    // left jaw
      { x: 0.26, y: 0.52 },    // left cheek
      { x: 0.24, y: 0.38 },    // left cheekbone
      { x: 0.28, y: 0.25 },    // left temple
      { x: 0.38, y: 0.17 },    // left forehead
    ],

    leftEye: { center: { x: 0.37, y: 0.40 }, radiusX: 0.065, radiusY: 0.032 },
    rightEye: { center: { x: 0.63, y: 0.40 }, radiusX: 0.065, radiusY: 0.032 },

    leftPupil: { x: 0.37, y: 0.40 },
    rightPupil: { x: 0.63, y: 0.40 },

    leftBrow: [
      { x: 0.29, y: 0.32 },
      { x: 0.34, y: 0.29 },
      { x: 0.40, y: 0.29 },
      { x: 0.45, y: 0.31 },
    ],
    rightBrow: [
      { x: 0.55, y: 0.31 },
      { x: 0.60, y: 0.29 },
      { x: 0.66, y: 0.29 },
      { x: 0.71, y: 0.32 },
    ],

    nose: [
      { x: 0.5, y: 0.42 },   // bridge top
      { x: 0.5, y: 0.52 },   // bridge bottom
      { x: 0.46, y: 0.55 },  // left nostril
      { x: 0.54, y: 0.55 },  // right nostril
    ],

    mouth: { center: { x: 0.5, y: 0.65 }, width: 0.14, height: 0.02 },

    jawLine: [
      { x: 0.32, y: 0.65 },
      { x: 0.42, y: 0.76 },
      { x: 0.5, y: 0.80 },
      { x: 0.58, y: 0.76 },
      { x: 0.68, y: 0.65 },
    ],
  };
}
