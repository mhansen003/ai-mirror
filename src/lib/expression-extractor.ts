import type { ExpressionState } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

/**
 * Extract a clean ExpressionState from MediaPipe's blendshape output.
 * MediaPipe gives us 52 ARKit-compatible blendshapes — we pick the ones
 * we need and extract head rotation from the facial transformation matrix.
 */
export function extractExpression(result: FaceLandmarkerResult): ExpressionState | null {
  if (!result.faceBlendshapes || result.faceBlendshapes.length === 0) {
    return null;
  }

  const blendshapes = result.faceBlendshapes[0].categories;
  const bs: Record<string, number> = {};
  for (const cat of blendshapes) {
    bs[cat.categoryName] = cat.score;
  }

  // Extract head rotation from the facial transformation matrix
  let headPitch = 0;
  let headYaw = 0;
  let headRoll = 0;

  if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
    const matrix = result.facialTransformationMatrixes[0];
    // The matrix is a 4x4 column-major transformation matrix
    // We extract Euler angles from the rotation part
    const m = matrix.data;
    // Rotation matrix indices (column-major): R00=m[0], R01=m[4], R02=m[8], R10=m[1], R11=m[5], R12=m[9], R20=m[2], R21=m[6], R22=m[10]
    headPitch = Math.asin(-m[6]);  // R21
    headYaw = Math.atan2(m[2], m[10]); // R20, R22
    headRoll = Math.atan2(m[4], m[5]); // R01, R11
  }

  return {
    mouthOpen: bs['jawOpen'] ?? 0,
    mouthSmileLeft: bs['mouthSmileLeft'] ?? 0,
    mouthSmileRight: bs['mouthSmileRight'] ?? 0,
    mouthPucker: bs['mouthPucker'] ?? 0,
    mouthFrown: ((bs['mouthFrownLeft'] ?? 0) + (bs['mouthFrownRight'] ?? 0)) / 2,
    eyeBlinkLeft: bs['eyeBlinkLeft'] ?? 0,
    eyeBlinkRight: bs['eyeBlinkRight'] ?? 0,
    eyeWideLeft: bs['eyeWideLeft'] ?? 0,
    eyeWideRight: bs['eyeWideRight'] ?? 0,
    browInnerUp: bs['browInnerUp'] ?? 0,
    browDownLeft: bs['browDownLeft'] ?? 0,
    browDownRight: bs['browDownRight'] ?? 0,
    browOuterUpLeft: bs['browOuterUpLeft'] ?? 0,
    browOuterUpRight: bs['browOuterUpRight'] ?? 0,
    cheekPuff: bs['cheekPuff'] ?? 0,
    jawLeft: bs['jawLeft'] ?? 0,
    jawRight: bs['jawRight'] ?? 0,
    headPitch,
    headYaw,
    headRoll,
  };
}
