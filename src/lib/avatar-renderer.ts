import type { ExpressionState, Point2D, BehaviorOutput } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import { getBaseGeometry } from './avatar-geometry';
import { ParticleSystem, drawScanLines } from './particle-system';

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
  jawDetail: '#00cccc',
  earAccent: '#7733ff',
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
    behavior: BehaviorOutput | null,
    fallbackExpr: ExpressionState = DEFAULT_EXPRESSION
  ) {
    this.time++;
    this.breathCycle += 0.02;
    this.particles.update();

    const expr = behavior?.avatarExpression ?? fallbackExpr;
    const energy = behavior?.energy ?? 0.5;

    // Clear background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Flash effect from behavior engine
    if (behavior?.flashColor) {
      ctx.fillStyle = behavior.flashColor;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }

    // Use the smaller dimension to keep proportions
    const scale = Math.min(width, height);
    const offsetX = (width - scale) / 2;
    const offsetY = (height - scale) / 2;

    const toCanvas = (p: Point2D): Point2D => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const geo = getBaseGeometry();

    // Apply head rotation
    ctx.save();
    ctx.translate(width / 2, height / 2);
    const rollDeg = expr.headRoll * (180 / Math.PI);
    ctx.rotate((rollDeg * Math.PI) / 180 * 0.3);
    ctx.translate(-width / 2, -height / 2);

    const breathOffset = Math.sin(this.breathCycle) * 0.003;

    // --- AMBIENT FACE GLOW ---
    const faceCenter = toCanvas({ x: 0.5, y: 0.48 });
    const glowRadius = scale * 0.35;
    const ambientGrad = ctx.createRadialGradient(
      faceCenter.x, faceCenter.y, 0,
      faceCenter.x, faceCenter.y, glowRadius
    );
    ambientGrad.addColorStop(0, `rgba(0, 255, 255, ${0.03 + energy * 0.03})`);
    ambientGrad.addColorStop(0.5, `rgba(100, 50, 255, ${0.015 + energy * 0.02})`);
    ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, width, height);

    // --- CIRCUIT/TECH LINES on face ---
    this.drawCircuitLines(ctx, toCanvas, scale, breathOffset, energy);

    // --- FACE OUTLINE ---
    this.drawGlowPath(ctx, geo.faceOutline.map(p =>
      toCanvas({ x: p.x, y: p.y + breathOffset })
    ), COLORS.faceOutline, 2.5, true, 0.8 + energy * 0.2);

    // --- JAW DETAIL LINES ---
    const jawMid = toCanvas({ x: 0.5, y: 0.80 + breathOffset });
    const jawL = toCanvas({ x: 0.36, y: 0.70 + breathOffset });
    const jawR = toCanvas({ x: 0.64, y: 0.70 + breathOffset });
    this.drawGlowPath(ctx, [jawL, jawMid, jawR], COLORS.jawDetail, 1, false, 0.25);

    // --- INNER FACE STRUCTURE LINES ---
    // Cheekbone accents
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.72, y: 0.35 + breathOffset }),
      toCanvas({ x: 0.68, y: 0.45 + breathOffset }),
    ], COLORS.jawDetail, 1, false, 0.2);
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.28, y: 0.35 + breathOffset }),
      toCanvas({ x: 0.32, y: 0.45 + breathOffset }),
    ], COLORS.jawDetail, 1, false, 0.2);

    // Temple accents
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.74, y: 0.28 + breathOffset }),
      toCanvas({ x: 0.78, y: 0.32 + breathOffset }),
      toCanvas({ x: 0.76, y: 0.36 + breathOffset }),
    ], COLORS.earAccent, 0.8, false, 0.3);
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.26, y: 0.28 + breathOffset }),
      toCanvas({ x: 0.22, y: 0.32 + breathOffset }),
      toCanvas({ x: 0.24, y: 0.36 + breathOffset }),
    ], COLORS.earAccent, 0.8, false, 0.3);

    // --- EYES (detailed) ---
    const blinkL = 1 - expr.eyeBlinkLeft;
    const blinkR = 1 - expr.eyeBlinkRight;
    const wideL = 1 + expr.eyeWideLeft * 0.4;
    const wideR = 1 + expr.eyeWideRight * 0.4;

    this.drawDetailedEye(ctx, toCanvas(geo.leftEye.center),
      geo.leftEye.radiusX * scale,
      geo.leftEye.radiusY * scale * blinkL * wideL,
      toCanvas(geo.leftPupil), expr, blinkL, scale, energy, true);

    this.drawDetailedEye(ctx, toCanvas(geo.rightEye.center),
      geo.rightEye.radiusX * scale,
      geo.rightEye.radiusY * scale * blinkR * wideR,
      toCanvas(geo.rightPupil), expr, blinkR, scale, energy, false);

    // --- EYELASHES / EYE LINES ---
    if (blinkL > 0.3) {
      const elY = toCanvas(geo.leftEye.center).y - geo.leftEye.radiusY * scale * blinkL * wideL;
      this.drawGlowPath(ctx, [
        { x: toCanvas(geo.leftEye.center).x - geo.leftEye.radiusX * scale * 0.7, y: elY - 2 },
        { x: toCanvas(geo.leftEye.center).x, y: elY - 4 },
        { x: toCanvas(geo.leftEye.center).x + geo.leftEye.radiusX * scale * 0.7, y: elY - 2 },
      ], COLORS.eye, 1, false, 0.4);
    }
    if (blinkR > 0.3) {
      const erY = toCanvas(geo.rightEye.center).y - geo.rightEye.radiusY * scale * blinkR * wideR;
      this.drawGlowPath(ctx, [
        { x: toCanvas(geo.rightEye.center).x - geo.rightEye.radiusX * scale * 0.7, y: erY - 2 },
        { x: toCanvas(geo.rightEye.center).x, y: erY - 4 },
        { x: toCanvas(geo.rightEye.center).x + geo.rightEye.radiusX * scale * 0.7, y: erY - 2 },
      ], COLORS.eye, 1, false, 0.4);
    }

    // --- EYEBROWS ---
    const browUpL = expr.browOuterUpLeft + expr.browInnerUp * 0.5;
    const browUpR = expr.browOuterUpRight + expr.browInnerUp * 0.5;
    const browDownL = expr.browDownLeft;
    const browDownR = expr.browDownRight;

    this.drawGlowPath(ctx, geo.leftBrow.map(p =>
      toCanvas({ x: p.x, y: p.y - browUpL * 0.03 + browDownL * 0.015 + breathOffset })
    ), COLORS.brow, 3, false);

    this.drawGlowPath(ctx, geo.rightBrow.map(p =>
      toCanvas({ x: p.x, y: p.y - browUpR * 0.03 + browDownR * 0.015 + breathOffset })
    ), COLORS.brow, 3, false);

    // --- NOSE (more detail) ---
    const noseTop = toCanvas({ x: 0.5 + expr.headYaw * 0.02, y: 0.42 + breathOffset });
    const noseMid = toCanvas({ x: 0.5 + expr.headYaw * 0.02, y: 0.48 + breathOffset });
    const noseBot = toCanvas({ x: 0.5 + expr.headYaw * 0.02, y: 0.52 + breathOffset });
    const nostrilL = toCanvas({ x: 0.46 + expr.headYaw * 0.02, y: 0.54 + breathOffset });
    const nostrilR = toCanvas({ x: 0.54 + expr.headYaw * 0.02, y: 0.54 + breathOffset });

    // Nose bridge
    this.drawGlowPath(ctx, [noseTop, noseMid, noseBot], COLORS.nose, 1.2, false, 0.35);
    // Nose wings
    this.drawGlowPath(ctx, [nostrilL, noseBot, nostrilR], COLORS.nose, 1, false, 0.3);
    // Nostril dots
    this.drawDot(ctx, nostrilL, 2, COLORS.nose, 0.4);
    this.drawDot(ctx, nostrilR, 2, COLORS.nose, 0.4);

    // --- MOUTH ---
    this.drawMouth(ctx, toCanvas(geo.mouth.center),
      geo.mouth.width * scale, geo.mouth.height * scale,
      expr, scale, breathOffset, energy);

    // --- CHEEK PUFF ---
    if (expr.cheekPuff > 0.1) {
      const cheekAlpha = expr.cheekPuff * 0.25;
      const cheekSize = scale * 0.04 * (1 + expr.cheekPuff * 0.6);
      this.drawDot(ctx, toCanvas({ x: 0.28, y: 0.52 + breathOffset }), cheekSize, COLORS.cheekBlush, cheekAlpha);
      this.drawDot(ctx, toCanvas({ x: 0.72, y: 0.52 + breathOffset }), cheekSize, COLORS.cheekBlush, cheekAlpha);
    }

    // --- FOREHEAD DETAIL (tech marks) ---
    this.drawForeheadDetail(ctx, toCanvas, scale, breathOffset, energy);

    ctx.restore();

    // --- PARTICLES & SCAN LINES ---
    this.particles.draw(ctx, width, height);
    drawScanLines(ctx, width, height, this.time);

    // --- BEHAVIOR TEXT (challenge/taunt) ---
    if (behavior) {
      this.drawBehaviorUI(ctx, width, height, scale, behavior);
    }
  }

  private drawDetailedEye(
    ctx: CanvasRenderingContext2D,
    center: Point2D,
    rx: number,
    ry: number,
    pupilCenter: Point2D,
    expr: ExpressionState,
    openness: number,
    scale: number,
    energy: number,
    isLeft: boolean
  ) {
    if (ry < 1) {
      // Closed eye — glowing line
      ctx.beginPath();
      ctx.moveTo(center.x - rx, center.y);
      ctx.lineTo(center.x + rx, center.y);
      this.applyGlowStroke(ctx, COLORS.eye, 2.5);
      return;
    }

    // Outer eye glow halo
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx + 6, ry + 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(68, 102, 255, ${0.03 + energy * 0.03})`;
    ctx.fill();

    // Eye shape
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
    this.applyGlowStroke(ctx, COLORS.eye, 2);

    // Dark fill inside eye
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx - 1, ry - 1, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 5, 20, 0.7)';
    ctx.fill();

    // Iris (larger, more detailed)
    const irisR = Math.min(rx, ry) * 0.7;
    const pupilOffsetX = expr.headYaw * scale * 0.015;
    const pupilOffsetY = expr.headPitch * scale * 0.01;
    const irisX = pupilCenter.x + pupilOffsetX;
    const irisY = pupilCenter.y + pupilOffsetY;

    // Outer iris ring
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    const outerIrisGrad = ctx.createRadialGradient(irisX, irisY, irisR * 0.5, irisX, irisY, irisR);
    outerIrisGrad.addColorStop(0, 'rgba(0, 255, 204, 0.4)');
    outerIrisGrad.addColorStop(1, 'rgba(68, 102, 255, 0.6)');
    ctx.fillStyle = outerIrisGrad;
    ctx.globalAlpha = openness;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Inner iris glow
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR * 0.5, 0, Math.PI * 2);
    const innerIrisGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, irisR * 0.5);
    innerIrisGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * openness})`);
    innerIrisGrad.addColorStop(0.4, `rgba(0, 255, 204, ${0.6 * openness})`);
    innerIrisGrad.addColorStop(1, `rgba(68, 102, 255, ${0.3 * openness})`);
    ctx.fillStyle = innerIrisGrad;
    ctx.fill();

    // Pupil (dark center)
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(5, 5, 30, ${openness * 0.8})`;
    ctx.fill();

    // Iris detail rings
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR * 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 204, ${0.2 * openness})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Iris spokes (radial lines)
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2 + this.time * 0.005;
      const innerR = irisR * 0.25;
      const outerR = irisR * 0.7;
      ctx.beginPath();
      ctx.moveTo(irisX + Math.cos(angle) * innerR, irisY + Math.sin(angle) * innerR);
      ctx.lineTo(irisX + Math.cos(angle) * outerR, irisY + Math.sin(angle) * outerR);
      ctx.strokeStyle = `rgba(0, 255, 204, ${0.1 * openness})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Primary highlight (top-left)
    ctx.beginPath();
    ctx.arc(irisX - irisR * 0.25, irisY - irisR * 0.25, irisR * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * openness})`;
    ctx.fill();

    // Secondary highlight (bottom-right, smaller)
    ctx.beginPath();
    ctx.arc(irisX + irisR * 0.15, irisY + irisR * 0.2, irisR * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 220, 255, ${0.4 * openness})`;
    ctx.fill();

    // Animated energy ring around iris
    if (energy > 0.6) {
      const ringAngle = this.time * 0.03;
      const ringAlpha = (energy - 0.6) * 0.5;
      ctx.beginPath();
      ctx.arc(irisX, irisY, irisR * 0.9, ringAngle, ringAngle + Math.PI * 1.2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${ringAlpha * openness})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawMouth(
    ctx: CanvasRenderingContext2D,
    center: Point2D,
    baseWidth: number,
    baseHeight: number,
    expr: ExpressionState,
    scale: number,
    breathOffset: number,
    energy: number
  ) {
    const smileL = expr.mouthSmileLeft;
    const smileR = expr.mouthSmileRight;
    const avgSmile = (smileL + smileR) / 2;
    const openAmount = expr.mouthOpen;
    const pucker = expr.mouthPucker;
    const frown = expr.mouthFrown;

    const mouthWidth = baseWidth * (1 + avgSmile * 0.5 - pucker * 0.4);
    const mouthHeight = baseHeight + openAmount * scale * 0.06;
    const curveAmount = (avgSmile - frown) * scale * 0.025;

    const leftX = center.x - mouthWidth / 2;
    const rightX = center.x + mouthWidth / 2;
    const cy = center.y + breathOffset * scale;
    const leftCornerY = cy - smileL * scale * 0.01;
    const rightCornerY = cy - smileR * scale * 0.01;

    // Mouth glow area
    if (openAmount > 0.1 || avgSmile > 0.2) {
      ctx.beginPath();
      ctx.ellipse(center.x, cy, mouthWidth * 0.6, mouthHeight * 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 255, ${0.03 + energy * 0.02})`;
      ctx.fill();
    }

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

    // Lip corners (small accent dots)
    this.drawDot(ctx, { x: leftX, y: leftCornerY }, 1.5, COLORS.mouth, 0.5);
    this.drawDot(ctx, { x: rightX, y: rightCornerY }, 1.5, COLORS.mouth, 0.5);

    // Interior fill when mouth open
    if (openAmount > 0.05) {
      ctx.beginPath();
      ctx.moveTo(leftX, leftCornerY);
      ctx.quadraticCurveTo(center.x, cy - curveAmount - mouthHeight / 2, rightX, rightCornerY);
      ctx.quadraticCurveTo(center.x, cy + curveAmount + mouthHeight, leftX, leftCornerY);
      const mouthGrad = ctx.createRadialGradient(center.x, cy, 0, center.x, cy, mouthHeight * 2);
      mouthGrad.addColorStop(0, `rgba(255, 0, 180, ${openAmount * 0.2})`);
      mouthGrad.addColorStop(1, `rgba(100, 0, 100, ${openAmount * 0.1})`);
      ctx.fillStyle = mouthGrad;
      ctx.fill();

      // Teeth hint (horizontal line) when mouth very open
      if (openAmount > 0.3) {
        const teethY = cy + mouthHeight * 0.2;
        ctx.beginPath();
        ctx.moveTo(leftX + mouthWidth * 0.15, teethY);
        ctx.lineTo(rightX - mouthWidth * 0.15, teethY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${openAmount * 0.15})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    // Pucker circle
    if (pucker > 0.2) {
      ctx.beginPath();
      ctx.arc(center.x, cy, scale * 0.025 * pucker, 0, Math.PI * 2);
      this.applyGlowStroke(ctx, COLORS.mouth, 2);
    }
  }

  private drawCircuitLines(
    ctx: CanvasRenderingContext2D,
    toCanvas: (p: Point2D) => Point2D,
    scale: number,
    breathOffset: number,
    energy: number
  ) {
    const alpha = 0.08 + energy * 0.08;

    // Right side circuit traces
    const rightTraces: Point2D[][] = [
      [{ x: 0.76, y: 0.40 }, { x: 0.82, y: 0.40 }, { x: 0.82, y: 0.50 }],
      [{ x: 0.74, y: 0.55 }, { x: 0.80, y: 0.55 }, { x: 0.80, y: 0.45 }, { x: 0.84, y: 0.45 }],
      [{ x: 0.68, y: 0.68 }, { x: 0.75, y: 0.68 }, { x: 0.75, y: 0.62 }],
    ];
    // Left side (mirror)
    const leftTraces: Point2D[][] = rightTraces.map(trace =>
      trace.map(p => ({ x: 1 - p.x, y: p.y }))
    );

    for (const trace of [...rightTraces, ...leftTraces]) {
      const mapped = trace.map(p => toCanvas({ x: p.x, y: p.y + breathOffset }));
      ctx.beginPath();
      ctx.moveTo(mapped[0].x, mapped[0].y);
      for (let i = 1; i < mapped.length; i++) {
        ctx.lineTo(mapped[i].x, mapped[i].y);
      }
      ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Endpoint dots
      const last = mapped[mapped.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 2})`;
      ctx.fill();
    }

    // Animated pulse along circuit line
    if (energy > 0.5) {
      const pulseProgress = (this.time % 120) / 120;
      const traceIdx = Math.floor(this.time / 120) % rightTraces.length;
      const trace = rightTraces[traceIdx].map(p => toCanvas({ x: p.x, y: p.y + breathOffset }));
      const segIdx = Math.floor(pulseProgress * (trace.length - 1));
      const segT = (pulseProgress * (trace.length - 1)) - segIdx;
      if (segIdx < trace.length - 1) {
        const px = trace[segIdx].x + (trace[segIdx + 1].x - trace[segIdx].x) * segT;
        const py = trace[segIdx].y + (trace[segIdx + 1].y - trace[segIdx].y) * segT;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${0.6 * energy})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${0.15 * energy})`;
        ctx.fill();
      }
    }
  }

  private drawForeheadDetail(
    ctx: CanvasRenderingContext2D,
    toCanvas: (p: Point2D) => Point2D,
    scale: number,
    breathOffset: number,
    energy: number
  ) {
    // Central diamond/gem on forehead
    const gem = toCanvas({ x: 0.5, y: 0.19 + breathOffset });
    const gemSize = scale * 0.012;

    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - gemSize);
    ctx.lineTo(gem.x + gemSize * 0.7, gem.y);
    ctx.lineTo(gem.x, gem.y + gemSize);
    ctx.lineTo(gem.x - gemSize * 0.7, gem.y);
    ctx.closePath();

    const gemGrad = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, gemSize);
    gemGrad.addColorStop(0, `rgba(0, 255, 255, ${0.6 + energy * 0.3})`);
    gemGrad.addColorStop(1, `rgba(100, 50, 255, ${0.3 + energy * 0.2})`);
    ctx.fillStyle = gemGrad;
    ctx.fill();
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + energy * 0.3})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Gem glow
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, gemSize * 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 255, ${0.04 + energy * 0.04})`;
    ctx.fill();

    // Lines extending from gem
    const lineAlpha = 0.15 + energy * 0.1;
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.47, y: 0.19 + breathOffset }),
      toCanvas({ x: 0.42, y: 0.20 + breathOffset }),
    ], '#7733ff', 0.6, false, lineAlpha);
    this.drawGlowPath(ctx, [
      toCanvas({ x: 0.53, y: 0.19 + breathOffset }),
      toCanvas({ x: 0.58, y: 0.20 + breathOffset }),
    ], '#7733ff', 0.6, false, lineAlpha);

    // Small data ticks on forehead
    for (let i = 0; i < 3; i++) {
      const tx = 0.44 + i * 0.03;
      const tickTop = toCanvas({ x: tx, y: 0.22 + breathOffset });
      const tickBot = toCanvas({ x: tx, y: 0.235 + breathOffset });
      ctx.beginPath();
      ctx.moveTo(tickTop.x, tickTop.y);
      ctx.lineTo(tickBot.x, tickBot.y);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.12 + energy * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const tx = 0.53 + i * 0.03;
      const tickTop = toCanvas({ x: tx, y: 0.22 + breathOffset });
      const tickBot = toCanvas({ x: tx, y: 0.235 + breathOffset });
      ctx.beginPath();
      ctx.moveTo(tickTop.x, tickTop.y);
      ctx.lineTo(tickBot.x, tickBot.y);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.12 + energy * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  private drawBehaviorUI(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
    behavior: BehaviorOutput
  ) {
    // Main challenge text
    if (behavior.displayText) {
      const fontSize = scale * 0.028;
      ctx.font = `bold ${fontSize}px Orbitron, monospace`;
      ctx.textAlign = 'center';

      // Text glow
      ctx.shadowColor = this.getModeColor(behavior.mode);
      ctx.shadowBlur = 15;
      ctx.fillStyle = this.getModeColor(behavior.mode);
      ctx.globalAlpha = 0.6 + Math.sin(this.time * 0.06) * 0.2;
      ctx.fillText(behavior.displayText, width / 2, height - scale * 0.08);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Sub text (score, timer, etc.)
    if (behavior.subText) {
      const subSize = scale * 0.018;
      ctx.font = `${subSize}px 'Share Tech Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
      ctx.fillText(behavior.subText, width / 2, height - scale * 0.04);
    }

    // Mode indicator (top)
    const modeLabel = behavior.mode.replace(/_/g, ' ').toUpperCase();
    const modeSize = scale * 0.014;
    ctx.font = `${modeSize}px 'Share Tech Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200, 200, 255, 0.3)`;
    ctx.fillText(`[ ${modeLabel} ]`, width / 2, scale * 0.06);

    // Energy bar (bottom-left corner)
    const barWidth = scale * 0.12;
    const barHeight = 3;
    const barX = width / 2 - barWidth / 2;
    const barY = height - scale * 0.015;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const energyColor = behavior.energy > 0.7 ? '#ff2d8a' : behavior.energy > 0.4 ? '#00ffff' : '#4466ff';
    ctx.fillStyle = energyColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(barX, barY, barWidth * behavior.energy, barHeight);
    ctx.globalAlpha = 1;
  }

  private getModeColor(mode: string): string {
    switch (mode) {
      case 'staring_contest': return '#00ffff';
      case 'dont_smile': return '#ff00ff';
      case 'copy_me': return '#00ffcc';
      case 'react': return '#ff2d8a';
      case 'judging': return '#7733ff';
      case 'taunt': return '#ff2d8a';
      default: return '#00ffff';
    }
  }

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

    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth + 8;
    ctx.globalAlpha = alpha * 0.08;
    ctx.stroke();

    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth + 4;
    ctx.globalAlpha = alpha * 0.2;
    ctx.stroke();

    drawPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha * 0.9;
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  private applyGlowStroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width + 6;
    ctx.globalAlpha = 0.1;
    ctx.stroke();
    ctx.lineWidth = width + 3;
    ctx.globalAlpha = 0.25;
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();
  }

  private drawDot(ctx: CanvasRenderingContext2D, pos: Point2D, radius: number, color: string, alpha: number) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.1;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
