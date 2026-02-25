import type { ExpressionState, Point2D } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import { getBaseGeometry } from './avatar-geometry';
import { ParticleSystem, drawScanLines } from './particle-system';
import { remap } from './lerp';

const COLORS = {
  bg: '#050510',
  faceOutline: '#00ffff',
  eye: '#4466ff',
  eyeGlow: '#6688ff',
  iris: '#00ffcc',
  pupil: '#ffffff',
  mouth: '#ff00ff',
  brow: '#ff2d8a',
  nose: '#00ffff',
  cheekBlush: '#ff2d8a',
};

export class AvatarRenderer {
  private particles: ParticleSystem;
  private time = 0;
  private breathCycle = 0;

  constructor() {
    this.particles = new ParticleSystem();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    expr: ExpressionState = DEFAULT_EXPRESSION
  ) {
    this.time++;
    this.breathCycle += 0.02;
    this.particles.update();

    // Clear background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Use the smaller dimension to keep proportions
    const scale = Math.min(width, height);
    const offsetX = (width - scale) / 2;
    const offsetY = (height - scale) / 2;

    // Helper to convert normalized coords to canvas coords
    const toCanvas = (p: Point2D): Point2D => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const geo = getBaseGeometry();

    // Apply head rotation transforms
    ctx.save();
    ctx.translate(width / 2, height / 2);
    // Subtle rotation based on head pose
    const yawDeg = expr.headYaw * (180 / Math.PI);
    const pitchDeg = expr.headPitch * (180 / Math.PI);
    const rollDeg = expr.headRoll * (180 / Math.PI);
    ctx.rotate((rollDeg * Math.PI) / 180 * 0.3); // dampen rotation
    ctx.translate(-width / 2, -height / 2);

    // Idle breathing offset
    const breathOffset = Math.sin(this.breathCycle) * 0.003;

    // --- FACE OUTLINE ---
    this.drawGlowPath(ctx, geo.faceOutline.map(p =>
      toCanvas({ x: p.x, y: p.y + breathOffset })
    ), COLORS.faceOutline, 2.5, true);

    // --- EYES ---
    const blinkL = 1 - expr.eyeBlinkLeft;
    const blinkR = 1 - expr.eyeBlinkRight;
    const wideL = 1 + expr.eyeWideLeft * 0.4;
    const wideR = 1 + expr.eyeWideRight * 0.4;

    // Left eye
    this.drawEye(ctx, toCanvas(geo.leftEye.center),
      geo.leftEye.radiusX * scale,
      geo.leftEye.radiusY * scale * blinkL * wideL,
      toCanvas(geo.leftPupil),
      expr, blinkL, scale);

    // Right eye
    this.drawEye(ctx, toCanvas(geo.rightEye.center),
      geo.rightEye.radiusX * scale,
      geo.rightEye.radiusY * scale * blinkR * wideR,
      toCanvas(geo.rightPupil),
      expr, blinkR, scale);

    // --- EYEBROWS ---
    const browUpL = expr.browOuterUpLeft + expr.browInnerUp * 0.5;
    const browUpR = expr.browOuterUpRight + expr.browInnerUp * 0.5;
    const browDownL = expr.browDownLeft;
    const browDownR = expr.browDownRight;

    this.drawGlowPath(ctx, geo.leftBrow.map(p =>
      toCanvas({ x: p.x, y: p.y - browUpL * 0.03 + browDownL * 0.015 + breathOffset })
    ), COLORS.brow, 2.5, false);

    this.drawGlowPath(ctx, geo.rightBrow.map(p =>
      toCanvas({ x: p.x, y: p.y - browUpR * 0.03 + browDownR * 0.015 + breathOffset })
    ), COLORS.brow, 2.5, false);

    // --- NOSE ---
    const nosePoints = [geo.nose[0], geo.nose[1]].map(p =>
      toCanvas({ x: p.x + expr.headYaw * 0.02, y: p.y + breathOffset })
    );
    this.drawGlowPath(ctx, nosePoints, COLORS.nose, 1.2, false, 0.4);

    // Nostrils (small dots)
    const nostrilL = toCanvas({
      x: geo.nose[2].x + expr.headYaw * 0.02,
      y: geo.nose[2].y + breathOffset
    });
    const nostrilR = toCanvas({
      x: geo.nose[3].x + expr.headYaw * 0.02,
      y: geo.nose[3].y + breathOffset
    });
    this.drawDot(ctx, nostrilL, 2, COLORS.nose, 0.5);
    this.drawDot(ctx, nostrilR, 2, COLORS.nose, 0.5);

    // --- MOUTH ---
    this.drawMouth(ctx, toCanvas(geo.mouth.center),
      geo.mouth.width * scale,
      geo.mouth.height * scale,
      expr, scale, breathOffset);

    // --- CHEEK PUFF ---
    if (expr.cheekPuff > 0.1) {
      const cheekAlpha = expr.cheekPuff * 0.2;
      const cheekSize = scale * 0.04 * (1 + expr.cheekPuff * 0.5);
      const leftCheek = toCanvas({ x: 0.28, y: 0.52 + breathOffset });
      const rightCheek = toCanvas({ x: 0.72, y: 0.52 + breathOffset });
      this.drawDot(ctx, leftCheek, cheekSize, COLORS.cheekBlush, cheekAlpha);
      this.drawDot(ctx, rightCheek, cheekSize, COLORS.cheekBlush, cheekAlpha);
    }

    // --- HEAD YAW INDICATOR (subtle) ---
    if (Math.abs(yawDeg) > 3) {
      const indicatorX = width / 2 + yawDeg * 1.5;
      ctx.beginPath();
      ctx.arc(indicatorX, height * 0.12, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${Math.min(Math.abs(yawDeg) / 30, 0.5)})`;
      ctx.fill();
    }

    ctx.restore();

    // --- PARTICLES & SCAN LINES (not affected by head rotation) ---
    this.particles.draw(ctx, width, height);
    drawScanLines(ctx, width, height, this.time);

    // --- STATUS TEXT ---
    const smileAmount = (expr.mouthSmileLeft + expr.mouthSmileRight) / 2;
    let statusText = 'ANALYZING';
    if (smileAmount > 0.3) statusText = 'SMILE DETECTED';
    else if (expr.mouthOpen > 0.3) statusText = 'MOUTH OPEN';
    else if (expr.eyeBlinkLeft > 0.5 && expr.eyeBlinkRight > 0.5) statusText = 'BLINK';
    else if (expr.browInnerUp > 0.3) statusText = 'SURPRISED';
    else if (expr.mouthPucker > 0.3) statusText = 'PUCKER';

    ctx.font = `${scale * 0.022}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(0, 255, 255, ${0.4 + Math.sin(this.time * 0.05) * 0.2})`;
    ctx.fillText(statusText, width / 2, height - scale * 0.05);

    // Pitch indicator text
    if (Math.abs(pitchDeg) > 5) {
      const pitchLabel = pitchDeg > 0 ? '▼ HEAD DOWN' : '▲ HEAD UP';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.fillText(pitchLabel, width / 2, height - scale * 0.02);
    }
  }

  private drawEye(
    ctx: CanvasRenderingContext2D,
    center: Point2D,
    rx: number,
    ry: number,
    pupilCenter: Point2D,
    expr: ExpressionState,
    openness: number,
    scale: number
  ) {
    if (ry < 1) {
      // Eye is nearly closed — draw a line
      ctx.beginPath();
      ctx.moveTo(center.x - rx, center.y);
      ctx.lineTo(center.x + rx, center.y);
      this.applyGlowStroke(ctx, COLORS.eye, 2);
      return;
    }

    // Eye shape (outer glow)
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    this.applyGlowStroke(ctx, COLORS.eye, 2);

    // Iris
    const irisR = Math.min(rx, ry) * 0.6;
    const pupilOffsetX = expr.headYaw * scale * 0.015;
    const pupilOffsetY = expr.headPitch * scale * 0.01;
    const irisX = pupilCenter.x + pupilOffsetX;
    const irisY = pupilCenter.y + pupilOffsetY;

    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    const irisGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, irisR);
    irisGrad.addColorStop(0, COLORS.pupil);
    irisGrad.addColorStop(0.3, COLORS.iris);
    irisGrad.addColorStop(1, COLORS.eye);
    ctx.fillStyle = irisGrad;
    ctx.globalAlpha = openness;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Pupil highlight
    ctx.beginPath();
    ctx.arc(irisX - irisR * 0.2, irisY - irisR * 0.2, irisR * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.globalAlpha = openness;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    center: Point2D,
    baseWidth: number,
    baseHeight: number,
    expr: ExpressionState,
    scale: number,
    breathOffset: number
  ) {
    const smileL = expr.mouthSmileLeft;
    const smileR = expr.mouthSmileRight;
    const avgSmile = (smileL + smileR) / 2;
    const openAmount = expr.mouthOpen;
    const pucker = expr.mouthPucker;
    const frown = expr.mouthFrown;

    // Mouth width changes with smile and pucker
    const mouthWidth = baseWidth * (1 + avgSmile * 0.5 - pucker * 0.4);
    // Mouth height changes with open
    const mouthHeight = baseHeight + openAmount * scale * 0.06;
    // Vertical curve for smile/frown
    const curveAmount = (avgSmile - frown) * scale * 0.025;

    const leftX = center.x - mouthWidth / 2;
    const rightX = center.x + mouthWidth / 2;
    const cy = center.y + breathOffset * scale;

    // Corner adjustments for asymmetric smile
    const leftCornerY = cy - smileL * scale * 0.01;
    const rightCornerY = cy - smileR * scale * 0.01;

    // Upper lip
    ctx.beginPath();
    ctx.moveTo(leftX, leftCornerY);
    ctx.quadraticCurveTo(center.x, cy - curveAmount - mouthHeight / 2, rightX, rightCornerY);
    this.applyGlowStroke(ctx, COLORS.mouth, 2.5);

    // Lower lip
    ctx.beginPath();
    ctx.moveTo(leftX, leftCornerY);
    ctx.quadraticCurveTo(center.x, cy + curveAmount + mouthHeight, rightX, rightCornerY);
    this.applyGlowStroke(ctx, COLORS.mouth, 2.5);

    // Fill mouth interior when open
    if (openAmount > 0.05) {
      ctx.beginPath();
      ctx.moveTo(leftX, leftCornerY);
      ctx.quadraticCurveTo(center.x, cy - curveAmount - mouthHeight / 2, rightX, rightCornerY);
      ctx.quadraticCurveTo(center.x, cy + curveAmount + mouthHeight, leftX, leftCornerY);
      ctx.fillStyle = `rgba(255, 0, 255, ${openAmount * 0.15})`;
      ctx.fill();
    }

    // Pucker — draw small circle
    if (pucker > 0.2) {
      ctx.beginPath();
      ctx.arc(center.x, cy, scale * 0.02 * pucker, 0, Math.PI * 2);
      this.applyGlowStroke(ctx, COLORS.mouth, 1.5);
    }
  }

  /** Draw a path with multi-layer neon glow */
  private drawGlowPath(
    ctx: CanvasRenderingContext2D,
    points: Point2D[],
    color: string,
    lineWidth: number,
    closePath: boolean,
    alpha: number = 1
  ) {
    if (points.length < 2) return;

    const drawPath = () => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        // Use Catmull-Rom-like smooth curves
        if (i < points.length - 1) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        } else if (closePath) {
          const xc = (points[i].x + points[0].x) / 2;
          const yc = (points[i].y + points[0].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        } else {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      if (closePath) ctx.closePath();
    };

    ctx.globalAlpha = alpha;

    // Outer glow (wide, transparent)
    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth + 8;
    ctx.globalAlpha = alpha * 0.08;
    ctx.stroke();

    // Mid glow
    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth + 4;
    ctx.globalAlpha = alpha * 0.2;
    ctx.stroke();

    // Core line (bright)
    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha * 0.9;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  /** Apply neon glow stroke to current path */
  private applyGlowStroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
    // Outer glow
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width + 6;
    ctx.globalAlpha = 0.1;
    ctx.stroke();

    // Mid glow
    ctx.lineWidth = width + 3;
    ctx.globalAlpha = 0.25;
    ctx.stroke();

    // Core
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();
  }

  private drawDot(
    ctx: CanvasRenderingContext2D,
    pos: Point2D,
    radius: number,
    color: string,
    alpha: number
  ) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.1;
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}
