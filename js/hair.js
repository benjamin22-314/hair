import { BACKDROPS } from './config.js';

const RAINBOW_HEX = ['#ff5ca8', '#ff9f43', '#ffd43b', '#52d669', '#38b6ff', '#9b5cff'];

function hexToRgb(hex) {
  if (!hex || hex === 'rainbow') return [255, 110, 175];
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeHex(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${cl(r * factor)}, ${cl(g * factor)}, ${cl(b * factor)})`;
}

function lightenHex(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${cl(r + (255 - r) * amount)}, ${cl(g + (255 - g) * amount)}, ${cl(b + (255 - b) * amount)})`;
}

export class HairSalonEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 1000;
    this.H = 800;
    this.canvas.width = this.W;
    this.canvas.height = this.H;

    this.cx = 500;
    this.cy = 405;
    this.headRx = 146;
    this.headRy = 158;

    this.customer = null;
    this.strands = [];
    this.stylePreset = 'loose';
    this.glasses = null;
    this.accessories = [];
    this.particles = [];
    this.backdropId = 'salon';

    this.backdropImages = {};
    this.preloadBackdrops();

    // Animation state
    this.time = 0;
    this.blinkTimer = 2.5;
    this.blinking = 0;
    this.expression = 'happy'; // happy | surprised | giggle | proud
    this.expressionTimer = 0;
    this.toolCursor = null; // { x, y, icon, active }
    this.running = false;
    this.lastFrame = 0;
  }

  preloadBackdrops() {
    BACKDROPS.forEach((b) => {
      if (!b.image) return;
      const img = new Image();
      img.src = b.image;
      img.onload = () => {
        this.backdropImages[b.id] = img;
      };
    });
  }

  loadCustomer(customer) {
    this.customer = customer;
    this.stylePreset = 'loose';
    this.glasses = customer.defaultGlasses ? { ...customer.defaultGlasses } : null;
    this.accessories = [];
    this.particles = [];
    this.expression = 'happy';
    this.expressionTimer = 0;
    this.buildStrands(customer);
  }

  buildStrands(customer) {
    const strands = [];
    const baseColor = customer.defaultHair;
    const baseLen = customer.defaultLength;
    const baseCurl = customer.defaultCurl;

    // 44 back strands spanning around the sides and top
    const backCount = 44;
    for (let i = 0; i < backCount; i++) {
      const t = i / (backCount - 1); // 0 = left, 1 = right
      const angle = Math.PI * (0.98 + t * 1.04); // left ear over top to right ear
      const rx = this.headRx * 1.02;
      const ry = this.headRy * 0.96;
      const ax = this.cx + Math.cos(angle) * rx;
      const ay = this.cy + Math.sin(angle) * ry - 10;
      const sideFactor = Math.abs(t - 0.5) * 2; // 1 at sides, 0 at center top
      strands.push({
        layer: 'back',
        index: i,
        t,
        ax,
        ay,
        maxLen: 260 + sideFactor * 110 + (i % 3) * 14,
        length: Math.min(1, baseLen + (i % 4) * 0.03),
        thickness: 34 + (i % 3) * 4,
        color: baseColor,
        curl: baseCurl,
        crimp: 0,
        wet: 0,
        foam: 0,
        glitter: 0,
        sway: 0,
        swayVel: 0,
        outward: (t - 0.5) * 1.35
      });
    }

    // 24 front/bangs & crown strands
    const frontCount = 24;
    for (let i = 0; i < frontCount; i++) {
      const t = i / (frontCount - 1);
      const angle = Math.PI * (1.12 + t * 0.76);
      const ax = this.cx + Math.cos(angle) * (this.headRx * 0.96);
      const ay = this.cy + Math.sin(angle) * (this.headRy * 0.94) - 8;
      const isSide = t < 0.22 || t > 0.78;
      strands.push({
        layer: 'front',
        index: i,
        t,
        ax,
        ay,
        maxLen: isSide ? 235 : 108,
        length: isSide ? Math.min(1, baseLen * 0.88) : Math.min(0.85, baseLen * 0.68),
        thickness: isSide ? 28 : 24,
        color: baseColor,
        curl: baseCurl * 0.7,
        crimp: 0,
        wet: 0,
        foam: 0,
        glitter: 0,
        sway: 0,
        swayVel: 0,
        outward: (t - 0.5) * 1.15
      });
    }

    this.strands = strands;
  }

  getSnapshot() {
    return {
      stylePreset: this.stylePreset,
      glasses: this.glasses ? { ...this.glasses } : null,
      accessories: this.accessories.map((a) => ({ ...a })),
      strands: this.strands.map((s) => ({
        length: s.length,
        color: s.color,
        curl: s.curl,
        crimp: s.crimp,
        wet: s.wet,
        foam: s.foam,
        glitter: s.glitter
      }))
    };
  }

  restoreSnapshot(snap) {
    if (!snap) return;
    this.stylePreset = snap.stylePreset;
    this.glasses = snap.glasses ? { ...snap.glasses } : null;
    this.accessories = snap.accessories.map((a) => ({ ...a }));
    snap.strands.forEach((st, i) => {
      if (this.strands[i]) Object.assign(this.strands[i], st);
    });
  }

  setExpression(expr, duration = 1.0) {
    this.expression = expr;
    this.expressionTimer = Math.max(this.expressionTimer, duration);
  }

  setBackdrop(id) {
    this.backdropId = id;
  }

  setStylePreset(id) {
    this.stylePreset = id;
    this.strands.forEach((s) => {
      s.swayVel += (Math.random() - 0.5) * 24;
    });
    this.setExpression('proud', 1.2);
  }

  setGlasses(shape, color) {
    if (!shape || shape === 'none') {
      this.glasses = null;
    } else {
      this.glasses = {
        shape,
        color: color || (this.glasses && this.glasses.color) || '#e84c8a'
      };
      this.setExpression('proud', 1.2);
    }
  }

  colorAllHair(hex) {
    this.strands.forEach((s, i) => {
      s.color = hex === 'rainbow' ? RAINBOW_HEX[i % RAINBOW_HEX.length] : hex;
    });
    for (let i = 0; i < 24; i++) {
      this.spawnSparkle(
        this.cx + (Math.random() - 0.5) * 340,
        this.cy - 80 + (Math.random() - 0.5) * 280,
        hex === 'rainbow' ? RAINBOW_HEX[i % RAINBOW_HEX.length] : hex
      );
    }
    this.setExpression('proud', 1.3);
  }

  growAllHair() {
    this.strands.forEach((s) => {
      s.length = Math.min(1.0, s.length + 0.35);
      s.swayVel += (Math.random() - 0.5) * 16;
    });
    for (let i = 0; i < 18; i++) {
      this.spawnSparkle(
        this.cx + (Math.random() - 0.5) * 320,
        this.cy - 40 + (Math.random() - 0.5) * 260,
        '#6ef7c8'
      );
    }
    this.setExpression('happy', 1.0);
  }

  addAccessory(item) {
    this.accessories.push({
      uid: Date.now() + Math.random(),
      id: item.id,
      emoji: item.emoji,
      x: item.defaultX * this.W + (Math.random() - 0.5) * 24,
      y: item.defaultY * this.H + (Math.random() - 0.5) * 16,
      scale: item.scale || 1.0
    });
    this.spawnSparkle(item.defaultX * this.W, item.defaultY * this.H, '#ffd43b');
    this.setExpression('proud', 1.0);
  }

  clearAccessories() {
    this.accessories = [];
  }

  findAccessoryAt(x, y) {
    for (let i = this.accessories.length - 1; i >= 0; i--) {
      const a = this.accessories[i];
      if (Math.hypot(a.x - x, a.y - y) < 48 * a.scale) {
        return a;
      }
    }
    return null;
  }

  // Compute approximate tip position for hit-testing tools
  getStrandPoints(s) {
    const len = s.maxLen * Math.max(0.08, s.length);
    const spiky = this.stylePreset === 'mohawk' && s.t > 0.3 && s.t < 0.7;
    const dirY = spiky ? -0.9 : 1;
    const midX = s.ax + s.outward * len * 0.34 + s.sway * 0.45;
    const midY = s.ay + dirY * len * 0.52;
    const tipX = s.ax + s.outward * len * 0.52 + s.sway;
    const tipY = s.ay + dirY * len;
    return { midX, midY, tipX, tipY, len };
  }

  applyTool(tool, x, y, dx, dy, options = {}) {
    let touched = false;
    const radius = tool === 'dryer' ? 125 : (tool === 'clippers' ? 72 : 68);

    this.strands.forEach((s, idx) => {
      const pt = this.getStrandPoints(s);
      const dMid = Math.hypot(pt.midX - x, pt.midY - y);
      const dTip = Math.hypot(pt.tipX - x, pt.tipY - y);
      const dRoot = Math.hypot(s.ax - x, s.ay - y);
      const d = Math.min(dMid, dTip, dRoot);

      if (d < radius) {
        touched = true;
        const strength = 1 - d / radius;

        if (tool === 'scissors') {
          const prevLen = s.length;
          // Cut proportional to how high up the strand the scissors are
          const desired = Math.max(0.12, Math.min(s.length, (dRoot / Math.max(60, s.maxLen))));
          s.length = Math.max(0.12, Math.min(s.length, s.length - 0.065 * strength, desired + 0.08));
          s.swayVel += dx * 0.25;
          if (prevLen - s.length > 0.015) {
            this.spawnClipping(pt.tipX, pt.tipY, s.color);
            this.setExpression('surprised', 0.65);
          }
        } else if (tool === 'clippers') {
          const prevLen = s.length;
          s.length = Math.max(0.08, s.length - 0.12 * strength);
          s.swayVel += (Math.random() - 0.5) * 14;
          if (prevLen - s.length > 0.02) {
            this.spawnClipping(x + (Math.random() - 0.5) * 24, y, s.color);
            this.setExpression('surprised', 0.6);
          }
        } else if (tool === 'grow') {
          s.length = Math.min(1.0, s.length + 0.075 * strength);
          s.swayVel += (Math.random() - 0.5) * 8;
          if (Math.random() < 0.25) {
            this.spawnSparkle(pt.tipX, pt.tipY, '#6ef7c8');
          }
          this.setExpression('happy', 0.5);
        } else if (tool === 'dye') {
          const col = options.color || '#ff5ca8';
          s.color = col === 'rainbow' ? RAINBOW_HEX[idx % RAINBOW_HEX.length] : col;
          s.swayVel += dx * 0.18;
          if (Math.random() < 0.22) {
            this.spawnSparkle(x + (Math.random() - 0.5) * 32, y + (Math.random() - 0.5) * 32, s.color);
          }
        } else if (tool === 'glitter') {
          s.glitter = Math.min(1, s.glitter + 0.25);
          if (Math.random() < 0.4) {
            this.spawnSparkle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, '#fff4a3');
          }
          this.setExpression('proud', 0.6);
        } else if (tool === 'comb') {
          s.curl = Math.max(0, s.curl - 0.14 * strength);
          s.crimp = Math.max(0, s.crimp - 0.14 * strength);
          s.swayVel += dx * 0.38;
        } else if (tool === 'curler') {
          s.curl = Math.min(1, s.curl + 0.16 * strength);
          s.crimp = Math.max(0, s.crimp - 0.12);
          s.swayVel += (Math.random() - 0.5) * 10;
        } else if (tool === 'crimper') {
          s.crimp = Math.min(1, s.crimp + 0.18 * strength);
          s.curl = Math.max(0, s.curl - 0.12);
          s.swayVel += dx * 0.15;
        } else if (tool === 'shampoo') {
          s.foam = Math.min(1, s.foam + 0.16 * strength);
          s.wet = Math.min(1, s.wet + 0.1 * strength);
          s.swayVel += dx * 0.2;
          if (Math.random() < 0.35) {
            this.spawnBubble(x + (Math.random() - 0.5) * 44, y + (Math.random() - 0.5) * 44);
          }
          this.setExpression('giggle', 0.7);
        } else if (tool === 'shower') {
          s.foam = Math.max(0, s.foam - 0.22 * strength);
          s.glitter = Math.max(0, s.glitter - 0.12 * strength);
          s.wet = Math.min(1, s.wet + 0.22 * strength);
          s.curl = Math.max(0.05, s.curl - 0.04 * strength);
          s.swayVel += (Math.random() - 0.5) * 8;
        } else if (tool === 'dryer') {
          s.wet = Math.max(0, s.wet - 0.22 * strength);
          s.foam = Math.max(0, s.foam - 0.14 * strength);
          const pushDir = pt.tipX >= x ? 1 : -1;
          s.swayVel += pushDir * (26 * strength);
          this.setExpression('giggle', 0.5);
        }
      }
    });

    // Ambient tool particles even if slightly outside strands
    if (tool === 'shower') {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          type: 'water',
          x: x + (Math.random() - 0.5) * 55,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: 7 + Math.random() * 6,
          size: 4 + Math.random() * 4,
          life: 0.55
        });
      }
    } else if (tool === 'dryer') {
      this.particles.push({
        type: 'wind',
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: (this.cx - x) * 0.08 + (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 3,
        size: 32 + Math.random() * 24,
        life: 0.35
      });
    }

    return touched;
  }

  spawnClipping(x, y, color) {
    this.particles.push({
      type: 'clip',
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: -2 + Math.random() * 2,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.22,
      color,
      size: 16 + Math.random() * 14,
      life: 1.2
    });
  }

  spawnBubble(x, y) {
    this.particles.push({
      type: 'bubble',
      x,
      y,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -1.5 - Math.random() * 2,
      size: 8 + Math.random() * 14,
      life: 1.3
    });
  }

  spawnSparkle(x, y, color) {
    this.particles.push({
      type: 'sparkle',
      x,
      y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -1.2 - Math.random() * 2,
      color,
      size: 8 + Math.random() * 10,
      life: 0.85
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.update(dt);
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
  }

  update(dt) {
    this.time += dt;

    // Blinking
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinking = 0.14;
      this.blinkTimer = 2.6 + Math.random() * 3.0;
    }
    if (this.blinking > 0) this.blinking = Math.max(0, this.blinking - dt);

    // Expression decay
    if (this.expressionTimer > 0) {
      this.expressionTimer -= dt;
      if (this.expressionTimer <= 0) this.expression = 'happy';
    }

    // Spring physics on strands
    for (let i = 0; i < this.strands.length; i++) {
      const s = this.strands[i];
      const idle = Math.sin(this.time * 1.8 + i * 0.45) * 2.2;
      const spring = (-s.sway + idle) * 16;
      s.swayVel = (s.swayVel + spring * dt) * Math.pow(0.08, dt);
      s.sway += s.swayVel * dt * 6;
      if (s.sway > 110) s.sway = 110;
      if (s.sway < -110) s.sway = -110;
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'clip') {
        p.vy += 0.42;
        p.rot += p.vrot;
      } else if (p.type === 'water') {
        p.vy += 0.35;
      }
    }
  }

  render(forPhoto = false) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    this.drawBackdrop(ctx);
    if (!this.customer) return;

    // Subtle salon chair back
    this.drawChair(ctx);

    // Style-specific back buns/pigtails/ponytail
    this.drawPresetBack(ctx);

    // Back hair strands
    this.strands.forEach((s) => {
      if (s.layer === 'back') this.drawStrand(ctx, s);
    });

    // Body, neck, head, face
    this.drawCharacter(ctx);

    // Front hair strands
    this.strands.forEach((s) => {
      if (s.layer === 'front') this.drawStrand(ctx, s);
    });

    // Shampoo foam blobs on hair
    this.drawFoam(ctx);

    // Glasses (drawn over front hair / face so they're always crisp and visible!)
    if (this.glasses && this.glasses.shape !== 'none') {
      this.drawGlasses(ctx, this.glasses);
    }

    // Accessories
    this.drawAccessories(ctx);

    // Particles
    if (!forPhoto) {
      this.drawParticles(ctx);
    }
  }

  drawBackdrop(ctx) {
    const bd = BACKDROPS.find((b) => b.id === this.backdropId) || BACKDROPS[0];
    const img = this.backdropImages[bd.id];
    if (img && img.complete && img.naturalWidth > 0) {
      const scale = Math.max(this.W / img.naturalWidth, this.H / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (this.W - dw) / 2, (this.H - dh) / 2, dw, dh);
      // Soft light vignette in center so customer always pops
      const grad = ctx.createRadialGradient(this.cx, this.cy, 80, this.cx, this.cy, 440);
      grad.addColorStop(0, 'rgba(255,255,255,0.22)');
      grad.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.W, this.H);
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, bd.fallback[0]);
    grad.addColorStop(1, bd.fallback[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    if (bd.pattern === 'stars') {
      ctx.fillStyle = 'rgba(255, 240, 150, 0.85)';
      for (let i = 0; i < 34; i++) {
        const sx = ((i * 197) % 940) + 30;
        const sy = ((i * 131) % 720) + 30;
        const r = 4 + (i % 4) * 2.5;
        this.drawStarShape(ctx, sx, sy, 4, r, r * 0.42);
        ctx.fill();
      }
    } else if (bd.pattern === 'hearts') {
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.28;
      for (let i = 0; i < 18; i++) {
        const hx = ((i * 211) % 920) + 40;
        const hy = ((i * 149) % 700) + 50;
        ctx.fillText(i % 2 === 0 ? '💖' : '✨', hx, hy);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawChair(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 196, 224, 0.55)';
    ctx.strokeStyle = 'rgba(220, 120, 165, 0.45)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(this.cx - 210, this.cy + 145, 420, 290, 90);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  getDominantHairColor(side = 'all') {
    if (!this.strands.length) return '#ff5ca8';
    const subset = this.strands.filter((s) => {
      if (side === 'left') return s.t < 0.4;
      if (side === 'right') return s.t > 0.6;
      return true;
    });
    const pick = subset[Math.floor(subset.length / 2)] || this.strands[0];
    return pick.color;
  }

  drawPresetBack(ctx) {
    if (this.stylePreset === 'loose' || this.stylePreset === 'mohawk') return;
    ctx.save();
    const leftCol = this.getDominantHairColor('left');
    const rightCol = this.getDominantHairColor('right');
    const topCol = this.getDominantHairColor('all');

    if (this.stylePreset === 'buns') {
      [
        { x: this.cx - 145, y: this.cy - 155, col: leftCol },
        { x: this.cx + 145, y: this.cy - 155, col: rightCol }
      ].forEach((b) => {
        ctx.fillStyle = b.col;
        ctx.strokeStyle = shadeHex(b.col, 0.68);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 74, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Highlight arc
        ctx.strokeStyle = lightenHex(b.col, 0.35);
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(b.x - 8, b.y - 8, 46, Math.PI * 1.1, Math.PI * 1.6);
        ctx.stroke();
      });
    } else if (this.stylePreset === 'pigtails') {
      [
        { x: this.cx - 165, y: this.cy - 30, dir: -1, col: leftCol },
        { x: this.cx + 165, y: this.cy - 30, dir: 1, col: rightCol }
      ].forEach((p) => {
        ctx.fillStyle = p.col;
        ctx.strokeStyle = shadeHex(p.col, 0.68);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x + p.dir * 130, p.y - 20, p.x + p.dir * 145, p.y + 180, p.x + p.dir * 48, p.y + 250);
        ctx.bezierCurveTo(p.x + p.dir * 10, p.y + 200, p.x - p.dir * 10, p.y + 90, p.x, p.y);
        ctx.fill();
        ctx.stroke();
        // Hair tie
        ctx.fillStyle = '#ff5ca8';
        ctx.beginPath();
        ctx.ellipse(p.x + p.dir * 14, p.y + 4, 16, 26, p.dir * 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (this.stylePreset === 'ponytail') {
      ctx.fillStyle = topCol;
      ctx.strokeStyle = shadeHex(topCol, 0.68);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(this.cx, this.cy - 175);
      ctx.bezierCurveTo(this.cx - 135, this.cy - 265, this.cx - 205, this.cy - 40, this.cx - 120, this.cy + 130);
      ctx.bezierCurveTo(this.cx - 60, this.cy + 20, this.cx + 45, this.cy - 115, this.cx, this.cy - 175);
      ctx.fill();
      ctx.stroke();
      // Scrunchie
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.ellipse(this.cx, this.cy - 172, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawStrand(ctx, s) {
    const len = s.maxLen * Math.max(0.08, s.length);
    const spiky = this.stylePreset === 'mohawk' && s.t > 0.26 && s.t < 0.74;
    const dirY = spiky ? -0.92 : 1;

    const steps = 10;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const baseX = s.ax + s.outward * len * (0.28 * f + 0.25 * f * f) + s.sway * f * f;
      const baseY = s.ay + dirY * len * f;
      let wave = 0;
      if (s.curl > 0.04) {
        wave += Math.sin(f * Math.PI * (3 + s.curl * 3.5) + s.index) * (20 * s.curl * f);
      }
      if (s.crimp > 0.04) {
        const zig = ((i % 2 === 0) ? 1 : -1) * (16 * s.crimp * f);
        wave += zig;
      }
      pts.push({ x: baseX + wave, y: baseY });
    }

    const baseCol = s.wet > 0.2 ? shadeHex(s.color, 1 - s.wet * 0.22) : s.color;
    const outlineCol = shadeHex(s.color, 0.65);
    const shineCol = lightenHex(s.color, 0.32);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    };

    // Outline
    trace();
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = s.thickness + 6;
    ctx.stroke();

    // Main hair fill
    trace();
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = s.thickness;
    ctx.stroke();

    // Soft glossy highlight
    trace();
    ctx.strokeStyle = shineCol;
    ctx.globalAlpha = s.wet > 0.2 ? 0.52 : 0.26;
    ctx.lineWidth = s.thickness * 0.28;
    ctx.stroke();

    // Glitter dots
    if (s.glitter > 0.08) {
      ctx.globalAlpha = Math.min(1, s.glitter);
      for (let i = 2; i < pts.length; i += 2) {
        const twinkle = 0.55 + 0.45 * Math.sin(this.time * 7 + s.index + i);
        ctx.fillStyle = i % 4 === 0 ? '#ffffff' : '#fff28c';
        ctx.beginPath();
        ctx.arc(pts[i].x + (i % 2 ? 4 : -4), pts[i].y, 3.2 * twinkle, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawFoam(ctx) {
    ctx.save();
    this.strands.forEach((s, i) => {
      if (s.foam < 0.12) return;
      const pt = this.getStrandPoints(s);
      const r = 14 + s.foam * 22;
      const bx = (s.ax + pt.midX) * 0.5;
      const by = (s.ay + pt.midY) * 0.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(180, 225, 255, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(bx - r * 0.3, by - r * 0.3, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawCharacter(ctx) {
    const c = this.customer;
    const cx = this.cx;
    const cy = this.cy;

    ctx.save();

    // Shoulders & shirt
    ctx.fillStyle = c.shirt;
    ctx.strokeStyle = shadeHex(c.shirt, 0.72);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 175, this.H + 20);
    ctx.quadraticCurveTo(cx - 165, cy + 195, cx - 58, cy + 185);
    ctx.lineTo(cx + 58, cy + 185);
    ctx.quadraticCurveTo(cx + 165, cy + 195, cx + 175, this.H + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shirt collar / stripe accent
    ctx.fillStyle = c.shirtAccent;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 202, 54, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = c.skinShade;
    ctx.beginPath();
    ctx.roundRect(cx - 34, cy + 135, 68, 72, 26);
    ctx.fill();

    // Monster cute striped horns!
    if (c.isMonster) {
      this.drawMonsterHorn(ctx, cx - 92, cy - 122, -0.32, c.hornColor, c.hornStripe);
      this.drawMonsterHorn(ctx, cx + 92, cy - 122, 0.32, c.hornColor, c.hornStripe);
    }

    // Ears
    [-1, 1].forEach((dir) => {
      ctx.fillStyle = c.skin;
      ctx.strokeStyle = c.skinShade;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(cx + dir * (this.headRx - 4), cy + 14, 24, 34, dir * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.skinShade;
      ctx.beginPath();
      ctx.ellipse(cx + dir * (this.headRx - 2), cy + 16, 11, 17, dir * 0.12, 0, Math.PI * 2);
      ctx.fill();
    });

    // Head shape with soft shading gradient
    const headGrad = ctx.createRadialGradient(cx - 35, cy - 45, 20, cx, cy, this.headRy * 1.15);
    headGrad.addColorStop(0, lightenHex(c.skin, 0.12));
    headGrad.addColorStop(0.75, c.skin);
    headGrad.addColorStop(1, c.skinShade);

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = shadeHex(c.skinShade, 0.85);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, this.headRx, this.headRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Monster fluffy cheek tufts / spots
    if (c.isMonster) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(cx - 86, cy - 62, 16, 11, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + 88, cy - 52, 12, 9, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rosy cheeks
    ctx.fillStyle = c.cheeks;
    ctx.globalAlpha = this.expression === 'giggle' ? 0.55 : 0.36;
    ctx.beginPath();
    ctx.ellipse(cx - 78, cy + 44, 28, 17, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 78, cy + 44, 28, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Freckles
    if (c.freckles) {
      ctx.fillStyle = shadeHex(c.skinShade, 0.78);
      [-82, -68, -75, 68, 82, 75].forEach((dx, i) => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 36 + (i % 3) * 7, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Eyebrows
    ctx.strokeStyle = c.isMonster ? '#3a225d' : shadeHex(c.defaultHair, 0.85);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const browLift = this.expression === 'surprised' ? -10 : 0;
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(cx + dir * 32, cy - 36 + browLift);
      ctx.quadraticCurveTo(cx + dir * 56, cy - 48 + browLift, cx + dir * 78, cy - 34 + browLift);
      ctx.stroke();
    });

    // Eyes
    const eyeY = cy + 6;
    const eyeDx = 54;
    const isClosed = this.blinking > 0 || this.expression === 'giggle';
    [-1, 1].forEach((dir) => {
      const ex = cx + dir * eyeDx;
      if (isClosed) {
        ctx.strokeStyle = '#382433';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(ex, eyeY + 6, 18, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
      } else {
        const er = c.isMonster ? 24 : 21;
        // White sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, er, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = c.eyeColor;
        ctx.beginPath();
        ctx.arc(ex, eyeY + 1, er * 0.66, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#1d131c';
        ctx.beginPath();
        ctx.arc(ex, eyeY + 1, er * 0.36, 0, Math.PI * 2);
        ctx.fill();
        // Big sparkle highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 6, eyeY - 6, er * 0.24, 0, Math.PI * 2);
        ctx.arc(ex + 6, eyeY + 6, er * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Cute nose
    ctx.fillStyle = c.isMonster ? '#ff85b3' : c.skinShade;
    ctx.beginPath();
    if (c.isMonster) {
      ctx.ellipse(cx, cy + 36, 16, 11, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, cy + 38, 8, 0, Math.PI * 2);
    }
    ctx.fill();

    // Mouth with expressions
    ctx.strokeStyle = '#a83c5c';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    if (this.expression === 'surprised') {
      ctx.fillStyle = '#d95375';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 84, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.expression === 'giggle' || this.expression === 'proud') {
      ctx.fillStyle = '#d95375';
      ctx.beginPath();
      ctx.arc(cx, cy + 72, 34, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Cute tongue
      ctx.fillStyle = '#ff9bb5';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 94, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy + 68, 32, 0.16 * Math.PI, 0.84 * Math.PI);
      ctx.stroke();
    }

    // Monster cute tiny smiling fangs!
    if (c.isMonster && this.expression !== 'surprised') {
      ctx.fillStyle = '#ffffff';
      [-18, 18].forEach((fx) => {
        ctx.beginPath();
        ctx.moveTo(cx + fx - 7, cy + 78);
        ctx.lineTo(cx + fx, cy + 91);
        ctx.lineTo(cx + fx + 7, cy + 78);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.restore();
  }

  drawMonsterHorn(ctx, x, y, rot, color, stripe) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.strokeStyle = shadeHex(stripe, 0.82);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-24, 24);
    ctx.quadraticCurveTo(-18, -32, 0, -56);
    ctx.quadraticCurveTo(18, -32, 24, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stripes
    ctx.strokeStyle = stripe;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, 0);
    ctx.moveTo(-9, -20);
    ctx.lineTo(9, -20);
    ctx.stroke();
    ctx.restore();
  }

  drawGlasses(ctx, glasses) {
    const cx = this.cx;
    const eyeY = this.cy + 6;
    const eyeDx = 56;
    const shape = glasses.shape;
    const isShades = shape === 'shades';

    ctx.save();

    let strokeStyle = glasses.color || '#e84c8a';
    if (strokeStyle === 'rainbow') {
      const grad = ctx.createLinearGradient(cx - 115, eyeY, cx + 115, eyeY);
      RAINBOW_HEX.forEach((hex, i) => grad.addColorStop(i / (RAINBOW_HEX.length - 1), hex));
      strokeStyle = grad;
    }

    const lensFill = isShades ? 'rgba(38, 28, 52, 0.82)' : 'rgba(255, 255, 255, 0.24)';

    // Temple arms to ears
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - eyeDx - 40, eyeY - 4);
    ctx.lineTo(cx - this.headRx - 2, eyeY + 4);
    ctx.moveTo(cx + eyeDx + 40, eyeY - 4);
    ctx.lineTo(cx + this.headRx + 2, eyeY + 4);
    ctx.stroke();

    // Nose bridge
    ctx.beginPath();
    ctx.moveTo(cx - 16, eyeY - 2);
    ctx.quadraticCurveTo(cx, eyeY - 12, cx + 16, eyeY - 2);
    ctx.stroke();

    // Lenses
    [-1, 1].forEach((dir) => {
      const lx = cx + dir * eyeDx;
      ctx.beginPath();
      if (shape === 'round') {
        ctx.arc(lx, eyeY, 40, 0, Math.PI * 2);
      } else if (shape === 'square') {
        ctx.roundRect(lx - 42, eyeY - 34, 84, 68, 16);
      } else if (shape === 'shades') {
        ctx.roundRect(lx - 44, eyeY - 32, 88, 62, [10, 10, 26, 26]);
      } else if (shape === 'cat') {
        const outer = dir * 48;
        const inner = -dir * 36;
        ctx.moveTo(lx + inner, eyeY - 16);
        ctx.quadraticCurveTo(lx, eyeY - 26, lx + outer, eyeY - 38);
        ctx.quadraticCurveTo(lx + dir * 42, eyeY + 34, lx, eyeY + 34);
        ctx.quadraticCurveTo(lx + inner, eyeY + 30, lx + inner, eyeY - 16);
        ctx.closePath();
      } else if (shape === 'heart') {
        this.traceHeart(ctx, lx, eyeY + 2, 43);
      } else if (shape === 'star') {
        this.drawStarShape(ctx, lx, eyeY, 5, 46, 24);
      }

      ctx.fillStyle = lensFill;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 10;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Cute glossy lens glare
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lx - 18, eyeY - 14);
      ctx.lineTo(lx - 6, eyeY - 22);
      ctx.stroke();
    });

    ctx.restore();
  }

  traceHeart(ctx, x, y, size) {
    const s = size * 0.85;
    ctx.moveTo(x, y + s * 0.72);
    ctx.bezierCurveTo(x - s * 1.2, y + s * 0.1, x - s * 1.05, y - s * 0.95, x, y - s * 0.32);
    ctx.bezierCurveTo(x + s * 1.05, y - s * 0.95, x + s * 1.2, y + s * 0.1, x, y + s * 0.72);
    ctx.closePath();
  }

  drawStarShape(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  }

  drawAccessories(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.accessories.forEach((a) => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.font = `${Math.round(74 * a.scale)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.shadowColor = 'rgba(70, 30, 60, 0.22)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillText(a.emoji, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.type === 'clip') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.size / 2, 0);
        ctx.quadraticCurveTo(0, -6, p.size / 2, 0);
        ctx.stroke();
        ctx.restore();
      } else if (p.type === 'bubble') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.strokeStyle = 'rgba(140, 210, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'water') {
        ctx.fillStyle = '#58c4ff';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.65, p.size * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'wind') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3.5, p.y + p.vy * 2);
        ctx.stroke();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color || '#ffd43b';
        this.drawStarShape(ctx, p.x, p.y, 4, p.size, p.size * 0.38);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  capturePhotoBlob() {
    this.render(true);
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }
}
