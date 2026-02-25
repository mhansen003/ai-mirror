export interface ExpressionState {
  // Mouth
  mouthOpen: number;       // 0-1, jaw opening
  mouthSmileLeft: number;  // 0-1
  mouthSmileRight: number; // 0-1
  mouthPucker: number;     // 0-1
  mouthFrown: number;      // 0-1, average of left+right frown

  // Eyes
  eyeBlinkLeft: number;    // 0-1
  eyeBlinkRight: number;   // 0-1
  eyeWideLeft: number;     // 0-1
  eyeWideRight: number;    // 0-1

  // Eyebrows
  browInnerUp: number;     // 0-1
  browDownLeft: number;    // 0-1
  browDownRight: number;   // 0-1
  browOuterUpLeft: number; // 0-1
  browOuterUpRight: number;// 0-1

  // Cheeks & Jaw
  cheekPuff: number;       // 0-1
  jawLeft: number;         // 0-1
  jawRight: number;        // 0-1

  // Head rotation (radians)
  headPitch: number;       // up/down
  headYaw: number;         // left/right
  headRoll: number;        // tilt
}

export const DEFAULT_EXPRESSION: ExpressionState = {
  mouthOpen: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  mouthPucker: 0,
  mouthFrown: 0,
  eyeBlinkLeft: 0,
  eyeBlinkRight: 0,
  eyeWideLeft: 0,
  eyeWideRight: 0,
  browInnerUp: 0,
  browDownLeft: 0,
  browDownRight: 0,
  browOuterUpLeft: 0,
  browOuterUpRight: 0,
  cheekPuff: 0,
  jawLeft: 0,
  jawRight: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
};

export interface Point2D {
  x: number;
  y: number;
}
