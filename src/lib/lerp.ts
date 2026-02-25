import { ExpressionState, DEFAULT_EXPRESSION } from '@/types/expressions';

/** Linear interpolation between two values */
export function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

/** Smooth an entire ExpressionState toward a target */
export function lerpExpression(
  current: ExpressionState,
  target: ExpressionState,
  factor: number
): ExpressionState {
  const result = { ...DEFAULT_EXPRESSION };
  for (const key of Object.keys(result) as (keyof ExpressionState)[]) {
    result[key] = lerp(current[key], target[key], factor);
  }
  return result;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Remap a value from one range to another */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}
