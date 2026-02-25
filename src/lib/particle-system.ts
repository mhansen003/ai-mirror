interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number; // 0-360
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 40;

export class ParticleSystem {
  private particles: Particle[] = [];

  constructor() {
    // Seed initial particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const maxLife = 200 + Math.random() * 300;
    return {
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0005,
      vy: -0.0002 - Math.random() * 0.0005, // float upward
      size: 1 + Math.random() * 2.5,
      alpha: 0,
      hue: Math.random() > 0.5 ? 180 : 280, // cyan or magenta
      life: Math.random() * maxLife, // stagger start
      maxLife,
    };
  }

  update() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      // Fade in, stay, fade out
      const progress = p.life / p.maxLife;
      if (progress < 0.2) {
        p.alpha = progress / 0.2;
      } else if (progress > 0.8) {
        p.alpha = (1 - progress) / 0.2;
      } else {
        p.alpha = 1;
      }
      p.alpha *= 0.4; // keep subtle

      // Respawn when dead or offscreen
      if (p.life >= p.maxLife || p.y < -0.05 || p.x < -0.05 || p.x > 1.05) {
        this.particles[i] = this.createParticle();
        this.particles[i].life = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      const px = p.x * width;
      const py = p.y * height;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
      ctx.fill();

      // Tiny glow
      ctx.beginPath();
      ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.15})`;
      ctx.fill();
    }
  }
}

/** Draw horizontal scan lines over the canvas */
export function drawScanLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  const lineSpacing = 4;
  const scrollOffset = (time * 0.02) % lineSpacing;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  for (let y = scrollOffset; y < height; y += lineSpacing) {
    ctx.fillRect(0, y, width, 1);
  }

  // Moving bright scan line
  const scanY = ((time * 0.5) % (height + 100)) - 50;
  const grad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
  grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.04)');
  grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, scanY - 20, width, 40);
}
