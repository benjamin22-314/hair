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
  constructor(canvas, { preloadBackdrops = true } = {}) {
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
    this.whiskers = [];
    this.stylePreset = 'loose';
    this.presetState = this.defaultPresetState();
    this.glasses = null;
    this.accessories = [];
    this.activeAccUid = null;
    this.particles = [];
    this.backdropId = 'salon';

    this.backdropImages = {};
    if (preloadBackdrops) this.preloadBackdrops();

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

  defaultPresetState() {
    return {
      leftColor: null,
      rightColor: null,
      topColor: null,
      leftGlitter: 0,
      rightGlitter: 0,
      topGlitter: 0,
      pigtailScale: 1.0,
      ponytailScale: 1.0
    };
  }

  loadCustomer(customer) {
    this.customer = customer;
    this.stylePreset = 'loose';
    this.presetState = this.defaultPresetState();
    this.glasses = customer.defaultGlasses ? { ...customer.defaultGlasses } : null;
    this.accessories = [];
    this.particles = [];
    this.expression = 'happy';
    this.expressionTimer = 0;
    this.buildStrands(customer);
    this.buildWhiskers(customer);
  }

  buildWhiskers(customer) {
    if (!customer || (!customer.isCat && !customer.isDog)) {
      this.whiskers = [];
      return;
    }
    const list = [];
    const offsets = [
      { dy: 46, ang: -0.28 },
      { dy: 58, ang: 0.0 },
      { dy: 70, ang: 0.28 }
    ];
    [-1, 1].forEach((side) => {
      offsets.forEach((o, i) => {
        list.push({
          side,
          index: i + (side > 0 ? 3 : 0),
          ax: this.cx + side * 46,
          ay: this.cy + o.dy,
          angle: o.ang,
          maxLen: 175,
          length: 0.74,
          color: '#fffaf2',
          curl: 0,
          crimp: 0,
          glitter: 0,
          foam: 0,
          wet: 0,
          sway: 0,
          swayVel: 0
        });
      });
    });
    this.whiskers = list;
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
      presetState: { ...this.presetState },
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
      })),
      whiskers: this.whiskers.map((w) => ({
        length: w.length,
        color: w.color,
        curl: w.curl,
        crimp: w.crimp,
        wet: w.wet,
        foam: w.foam,
        glitter: w.glitter
      }))
    };
  }

  restoreSnapshot(snap) {
    if (!snap) return;
    this.stylePreset = snap.stylePreset;
    this.presetState = snap.presetState ? { ...snap.presetState } : this.defaultPresetState();
    this.glasses = snap.glasses ? { ...snap.glasses } : null;
    this.accessories = snap.accessories.map((a) => ({ ...a }));
    snap.strands.forEach((st, i) => {
      if (this.strands[i]) Object.assign(this.strands[i], st);
    });
    if (snap.whiskers) {
      snap.whiskers.forEach((wt, i) => {
        if (this.whiskers[i]) Object.assign(this.whiskers[i], wt);
      });
    }
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
    this.whiskers.forEach((w, i) => {
      w.color = hex === 'rainbow' ? RAINBOW_HEX[i % RAINBOW_HEX.length] : hex;
    });
    if (hex === 'rainbow') {
      this.presetState.leftColor = RAINBOW_HEX[0];
      this.presetState.rightColor = RAINBOW_HEX[4];
      this.presetState.topColor = RAINBOW_HEX[5];
    } else {
      this.presetState.leftColor = hex;
      this.presetState.rightColor = hex;
      this.presetState.topColor = hex;
    }
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
    this.whiskers.forEach((w) => {
      w.length = Math.min(1.3, w.length + 0.30);
      w.swayVel += (Math.random() - 0.5) * 18;
    });
    this.presetState.pigtailScale = Math.min(1.15, this.presetState.pigtailScale + 0.25);
    this.presetState.ponytailScale = Math.min(1.15, this.presetState.ponytailScale + 0.25);
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

  // Compute effective visual length for a strand based on active hairstyle preset
  getVisualStrandLength(s) {
    let len = s.maxLen * Math.max(0.08, s.length);
    if (this.stylePreset === 'buns') {
      if (s.layer === 'back') len = Math.min(len, 72);
    } else if (this.stylePreset === 'pigtails') {
      if (s.layer === 'back') len = Math.min(len, 86);
    } else if (this.stylePreset === 'ponytail') {
      if (s.layer === 'back') len = Math.min(len, 68);
    } else if (this.stylePreset === 'mohawk') {
      const inCrest = s.t >= 0.30 && s.t <= 0.70;
      if (!inCrest) len = Math.min(len, 38);
      else len = Math.min(len, 185);
    }
    return len;
  }

  // Compute approximate tip position for hit-testing tools
  getStrandPoints(s) {
    const len = this.getVisualStrandLength(s);
    const spiky = this.stylePreset === 'mohawk' && s.t >= 0.30 && s.t <= 0.70;
    const dirY = spiky ? -0.92 : 1;
    const spread = spiky ? (s.t - 0.5) * 2.1 : s.outward;
    const midX = s.ax + spread * len * 0.36 + s.sway * 0.45;
    const midY = s.ay + dirY * len * 0.52;
    const tipX = s.ax + spread * len * 0.58 + s.sway;
    const tipY = s.ay + dirY * len;
    return { midX, midY, tipX, tipY, len };
  }

  getWhiskerDistance(w, x, y) {
    const wLen = w.maxLen * Math.max(0.18, w.length);
    const dirX = Math.cos(w.angle) * w.side;
    const dirY = Math.sin(w.angle);
    const tipX = w.ax + dirX * wLen;
    const tipY = w.ay + dirY * wLen + w.sway;

    let d = Infinity;
    for (let k = 0; k <= 4; k++) {
      const f = k / 4;
      const arch = -Math.sin(f * Math.PI) * 8;
      const px = w.ax + (tipX - w.ax) * f;
      const py = w.ay + (tipY - w.ay) * f + arch;
      const dist = Math.hypot(px - x, py - y);
      if (dist < d) d = dist;
    }
    return { d, tipX, tipY };
  }

  detectStrokeTarget(tool, x, y) {
    if (!this.whiskers.length) return 'hair';
    if (tool === 'shampoo' || tool === 'shower' || tool === 'dryer') return 'both';
    for (let i = 0; i < this.whiskers.length; i++) {
      if (this.getWhiskerDistance(this.whiskers[i], x, y).d < 34) {
        return 'whiskers';
      }
    }
    return 'hair';
  }

  applyTool(tool, x, y, dx, dy, options = {}) {
    let touched = false;
    const target = options.target || 'both';
    const allowHair = target === 'hair' || target === 'both';
    const allowWhiskers = target === 'whiskers' || target === 'both';
    const radius = tool === 'dryer' ? 125 : (tool === 'clippers' ? 74 : 70);
    const isUpdo = this.stylePreset === 'buns' || this.stylePreset === 'pigtails' || this.stylePreset === 'ponytail';

    // Direct hit-testing for updo hairpieces (buns, pigtails, high ponytail)
    if (allowHair && isUpdo) {
      const hitZones = [];
      if (this.stylePreset === 'buns') {
        if (Math.hypot(x - (this.cx - 124), y - (this.cy - 134)) < 78) hitZones.push('left');
        if (Math.hypot(x - (this.cx + 124), y - (this.cy - 134)) < 78) hitZones.push('right');
      } else if (this.stylePreset === 'pigtails') {
        const ph = 245 * this.presetState.pigtailScale;
        if (x > this.cx - 285 && x < this.cx - 125 && y > this.cy - 60 && y < this.cy - 20 + ph) hitZones.push('left');
        if (x > this.cx + 125 && x < this.cx + 285 && y > this.cy - 60 && y < this.cy - 20 + ph) hitZones.push('right');
      } else if (this.stylePreset === 'ponytail') {
        if (Math.hypot(x - (this.cx - 85), y - (this.cy - 95)) < 155 * this.presetState.ponytailScale) hitZones.push('top');
      }

      if (hitZones.length) {
        touched = true;
        hitZones.forEach((zone) => {
          const colKey = zone + 'Color';
          const glitKey = zone + 'Glitter';
          if (tool === 'dye') {
            const col = options.color || '#ff5ca8';
            const pick = col === 'rainbow' ? RAINBOW_HEX[Math.floor(Math.random() * RAINBOW_HEX.length)] : col;
            this.presetState[colKey] = pick;
            if (Math.random() < 0.35) this.spawnSparkle(x + (Math.random() - 0.5) * 32, y + (Math.random() - 0.5) * 32, pick);
          } else if (tool === 'glitter') {
            this.presetState[glitKey] = Math.min(1, this.presetState[glitKey] + 0.25);
            if (Math.random() < 0.45) this.spawnSparkle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, '#fff4a3');
            this.setExpression('proud', 0.6);
          } else if (tool === 'shower') {
            this.presetState[glitKey] = Math.max(0, this.presetState[glitKey] - 0.15);
          } else if ((tool === 'scissors' || tool === 'clippers') && (this.stylePreset === 'pigtails' || this.stylePreset === 'ponytail')) {
            const scaleKey = this.stylePreset === 'pigtails' ? 'pigtailScale' : 'ponytailScale';
            const prev = this.presetState[scaleKey];
            this.presetState[scaleKey] = Math.max(0.45, prev - (tool === 'clippers' ? 0.06 : 0.035));
            if (prev - this.presetState[scaleKey] > 0.01) {
              const clipCol = this.presetState[colKey] || this.getDominantHairColor(zone === 'top' ? 'all' : zone);
              this.spawnClipping(x, y, clipCol);
              this.setExpression('surprised', 0.6);
            }
          } else if (tool === 'grow' && (this.stylePreset === 'pigtails' || this.stylePreset === 'ponytail')) {
            const scaleKey = this.stylePreset === 'pigtails' ? 'pigtailScale' : 'ponytailScale';
            this.presetState[scaleKey] = Math.min(1.15, this.presetState[scaleKey] + 0.04);
            if (Math.random() < 0.3) this.spawnSparkle(x, y, '#6ef7c8');
          }
        });
      }
    }

    if (allowHair) this.strands.forEach((s, idx) => {
      const pt = this.getStrandPoints(s);
      // Sample 5 points along the strand so long hair never has dead zones
      let d = Infinity;
      for (let k = 0; k <= 4; k++) {
        const f = k / 4;
        const px = (1 - f) * (1 - f) * s.ax + 2 * (1 - f) * f * pt.midX + f * f * pt.tipX;
        const py = (1 - f) * (1 - f) * s.ay + 2 * (1 - f) * f * pt.midY + f * f * pt.tipY;
        const dist = Math.hypot(px - x, py - y);
        if (dist < d) d = dist;
      }
      const dRoot = Math.hypot(s.ax - x, s.ay - y);

      if (d < radius) {
        // Don't cut tucked-away back strands while wearing an updo preset
        if (isUpdo && s.layer === 'back' && (tool === 'scissors' || tool === 'clippers')) {
          return;
        }
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

    // Interactive cat whiskers!
    if (allowWhiskers && this.whiskers.length) {
      const isAreaTool = tool === 'shampoo' || tool === 'shower' || tool === 'dryer';
      const wRadius = tool === 'dryer' ? 120 : (isAreaTool ? 62 : 34);

      const candidates = [];
      this.whiskers.forEach((w, idx) => {
        const hit = this.getWhiskerDistance(w, x, y);
        if (hit.d < wRadius) {
          candidates.push({ w, idx, d: hit.d, tipX: hit.tipX, tipY: hit.tipY });
        }
      });

      // For precision styling tools, target only the single closest whisker
      const targets = (!isAreaTool && candidates.length > 1)
        ? [candidates.reduce((best, cur) => (cur.d < best.d ? cur : best))]
        : candidates;

      targets.forEach(({ w, idx, d, tipX, tipY }) => {
        touched = true;
        const strength = 1 - d / wRadius;
        if (tool === 'scissors') {
          const prev = w.length;
          w.length = Math.max(0.18, w.length - 0.08 * strength);
          w.swayVel += dy * 0.3;
          if (prev - w.length > 0.015) {
            this.spawnClipping(tipX, tipY, w.color);
            this.setExpression('surprised', 0.65);
          }
        } else if (tool === 'clippers') {
          const prev = w.length;
          w.length = Math.max(0.18, w.length - 0.14 * strength);
          w.swayVel += (Math.random() - 0.5) * 18;
          if (prev - w.length > 0.015) {
            this.spawnClipping(tipX, tipY, w.color);
            this.setExpression('surprised', 0.6);
          }
        } else if (tool === 'grow') {
          w.length = Math.min(1.35, w.length + 0.09 * strength);
          w.swayVel += (Math.random() - 0.5) * 12;
          if (Math.random() < 0.35) this.spawnSparkle(tipX, tipY, '#6ef7c8');
          this.setExpression('happy', 0.5);
        } else if (tool === 'dye') {
          const col = options.color || '#ff5ca8';
          w.color = col === 'rainbow' ? RAINBOW_HEX[idx % RAINBOW_HEX.length] : col;
          w.swayVel += dy * 0.25;
          if (Math.random() < 0.3) this.spawnSparkle(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24, w.color);
        } else if (tool === 'glitter') {
          w.glitter = Math.min(1, w.glitter + 0.28);
          if (Math.random() < 0.45) this.spawnSparkle(x + (Math.random() - 0.5) * 32, y + (Math.random() - 0.5) * 32, '#fff4a3');
          this.setExpression('proud', 0.6);
        } else if (tool === 'comb') {
          w.curl = Math.max(0, w.curl - 0.18 * strength);
          w.crimp = Math.max(0, w.crimp - 0.18 * strength);
          w.swayVel += dy * 0.45;
        } else if (tool === 'curler') {
          w.curl = Math.min(1, w.curl + 0.20 * strength);
          w.crimp = Math.max(0, w.crimp - 0.14);
          w.swayVel += (Math.random() - 0.5) * 14;
          this.setExpression('proud', 0.6);
        } else if (tool === 'crimper') {
          w.crimp = Math.min(1, w.crimp + 0.22 * strength);
          w.curl = Math.max(0, w.curl - 0.14);
          w.swayVel += dy * 0.25;
        } else if (tool === 'shampoo') {
          w.foam = Math.min(1, w.foam + 0.20 * strength);
          w.wet = Math.min(1, w.wet + 0.15 * strength);
          if (Math.random() < 0.4) this.spawnBubble(x + (Math.random() - 0.5) * 32, y + (Math.random() - 0.5) * 32);
          this.setExpression('giggle', 0.75);
        } else if (tool === 'shower') {
          w.foam = Math.max(0, w.foam - 0.25 * strength);
          w.glitter = Math.max(0, w.glitter - 0.15 * strength);
          w.wet = Math.min(1, w.wet + 0.2 * strength);
          w.swayVel += (Math.random() - 0.5) * 12;
        } else if (tool === 'dryer') {
          w.wet = Math.max(0, w.wet - 0.25 * strength);
          w.foam = Math.max(0, w.foam - 0.18 * strength);
          w.swayVel += (y > tipY ? -1 : 1) * (28 * strength);
          this.setExpression('giggle', 0.55);
        }
      });
    }

    // Ambient tool particles even if slightly outside strands
    if (tool === 'shower') {
      for (let i = 0; i < 3; i++) {
        this.pushParticle({
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
      this.pushParticle({
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

  pushParticle(p) {
    if (this.particles.length >= 140) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  spawnClipping(x, y, color) {
    this.pushParticle({
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
    this.pushParticle({
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
    this.pushParticle({
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

    // Spring physics on cat whiskers
    for (let i = 0; i < this.whiskers.length; i++) {
      const w = this.whiskers[i];
      const idle = Math.sin(this.time * 2.6 + i * 1.1) * 2.4;
      const spring = (-w.sway + idle) * 22;
      w.swayVel = (w.swayVel + spring * dt) * Math.pow(0.06, dt);
      w.sway += w.swayVel * dt * 6;
      if (w.sway > 65) w.sway = 65;
      if (w.sway < -65) w.sway = -65;
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

    // Subtle salon chair back (only in the salon scene)
    if (this.backdropId === 'salon') {
      this.drawChair(ctx);
    }

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

    // Draw Pip's pointy cat ears or Zara's floppy dog ears cleanly on top of front hair
    if (this.customer.isCat) {
      this.drawCatEars(ctx);
    } else if (this.customer.isDog) {
      this.drawDogEars(ctx);
    }

    // Shampoo foam blobs on hair
    this.drawFoam(ctx);

    // Styleable cat whiskers (on Pip the Cat!)
    if (this.whiskers.length) {
      this.drawWhiskers(ctx);
    }

    // Glasses (drawn over front hair / face so they're always crisp and visible!)
    if (this.glasses && this.glasses.shape !== 'none') {
      this.drawGlasses(ctx, this.glasses);
    }

    // Accessories
    this.drawAccessories(ctx);

    // Particles, trash bin, & active tool cursor
    if (!forPhoto) {
      this.drawParticles(ctx);
      if (this.activeAccUid) {
        this.drawTrashZone(ctx);
      }
      if (this.toolCursor && this.toolCursor.active && this.toolCursor.icon) {
        this.drawToolCursor(ctx);
      }
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
    const leftCol = this.presetState.leftColor || this.getDominantHairColor('left');
    const rightCol = this.presetState.rightColor || this.getDominantHairColor('right');
    const topCol = this.presetState.topColor || this.getDominantHairColor('all');
    const sway = Math.sin(this.time * 2.0) * 6;

    const drawPresetGlitter = (gx, gy, spreadX, spreadY, amount, seed) => {
      if (amount <= 0.08) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, amount);
      for (let i = 0; i < 8; i++) {
        const px = gx + Math.sin(seed + i * 2.1) * spreadX;
        const py = gy + Math.cos(seed + i * 1.7) * spreadY;
        const tw = 0.55 + 0.45 * Math.sin(this.time * 7 + i + seed);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff28c';
        ctx.beginPath();
        ctx.arc(px, py, 3.8 * tw, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    if (this.stylePreset === 'buns') {
      [
        { x: this.cx - 124, y: this.cy - 134, dir: -1, col: leftCol, glit: this.presetState.leftGlitter, seed: 1 },
        { x: this.cx + 124, y: this.cy - 134, dir: 1, col: rightCol, glit: this.presetState.rightGlitter, seed: 5 }
      ].forEach((b) => {
        // Main fluffy bun
        ctx.fillStyle = b.col;
        ctx.strokeStyle = shadeHex(b.col, 0.65);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 64, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Soft spiral hair swirl lines inside bun
        ctx.strokeStyle = shadeHex(b.col, 0.78);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 38, Math.PI * 0.2, Math.PI * 1.35);
        ctx.stroke();

        // Glossy crescent highlight
        ctx.strokeStyle = lightenHex(b.col, 0.38);
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(b.x - 6, b.y - 6, 44, Math.PI * 1.15, Math.PI * 1.62);
        ctx.stroke();

        drawPresetGlitter(b.x, b.y, 36, 36, b.glit, b.seed);

        // Cute scrunchie band where bun meets head
        ctx.save();
        ctx.translate(b.x - b.dir * 34, b.y + 42);
        ctx.rotate(b.dir * 0.65);
        ctx.fillStyle = '#ff6ba9';
        ctx.strokeStyle = '#c4366e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-34, -12, 68, 24, 12);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    } else if (this.stylePreset === 'pigtails') {
      const pScale = this.presetState.pigtailScale;
      [
        { x: this.cx - 146, y: this.cy - 34, dir: -1, col: leftCol, glit: this.presetState.leftGlitter, seed: 2 },
        { x: this.cx + 146, y: this.cy - 34, dir: 1, col: rightCol, glit: this.presetState.rightGlitter, seed: 7 }
      ].forEach((p) => {
        // Draw 3 layered bouncy locks per pigtail
        const locks = [
          { ox: 0, oy: 0, w: 72, h: 245 * pScale, s: 1.0, shade: 0.92 },
          { ox: p.dir * 16, oy: 10, w: 56, h: 215 * pScale, s: 1.15, shade: 1.0 },
          { ox: -p.dir * 8, oy: 16, w: 46, h: 190 * pScale, s: 0.85, shade: 1.08 }
        ];
        locks.forEach((lk) => {
          const sx = p.x + lk.ox;
          const sy = p.y + lk.oy;
          const sw = sway * lk.s;
          ctx.fillStyle = lk.shade < 1 ? shadeHex(p.col, lk.shade) : (lk.shade > 1 ? lightenHex(p.col, 0.14) : p.col);
          ctx.strokeStyle = shadeHex(p.col, 0.65);
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(
            sx + p.dir * (lk.w * 1.45), sy - 10,
            sx + p.dir * (lk.w * 1.6) + sw, sy + lk.h * 0.65,
            sx + p.dir * (lk.w * 0.55) + sw * 1.4, sy + lk.h
          );
          ctx.bezierCurveTo(
            sx + p.dir * (lk.w * 0.1) + sw, sy + lk.h * 0.72,
            sx + p.dir * 4, sy + lk.h * 0.25,
            sx, sy
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });

        // Glossy sheen
        ctx.strokeStyle = lightenHex(p.col, 0.36);
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x + p.dir * 38, p.y + 24);
        ctx.quadraticCurveTo(p.x + p.dir * 72 + sway * 0.5, p.y + 95 * pScale, p.x + p.dir * 52 + sway, p.y + 160 * pScale);
        ctx.stroke();

        drawPresetGlitter(p.x + p.dir * 52, p.y + 100 * pScale, 32, 70 * pScale, p.glit, p.seed);

        // Cute hair tie ribbon
        ctx.fillStyle = '#ff5ca8';
        ctx.strokeStyle = '#c4366e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(p.x + p.dir * 10, p.y + 2, 16, 28, p.dir * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else if (this.stylePreset === 'ponytail') {
      // High sweeping layered ponytail fountain
      const baseX = this.cx;
      const baseY = this.cy - 158;
      const tScale = this.presetState.ponytailScale;
      const locks = [
        { cx1: -115, cy1: -135, cx2: -225, cy2: 40 * tScale, ex: -145, ey: 245 * tScale, shade: 0.90 },
        { cx1: -80, cy1: -110, cx2: -175, cy2: 70 * tScale, ex: -105, ey: 220 * tScale, shade: 1.0 },
        { cx1: 80, cy1: -105, cx2: 145, cy2: -20 * tScale, ex: 96, ey: 65 * tScale, shade: 1.05 }
      ];
      locks.forEach((lk, i) => {
        const sw = sway * (i === 2 ? -0.6 : 1.0);
        ctx.fillStyle = lk.shade < 1 ? shadeHex(topCol, lk.shade) : (lk.shade > 1 ? lightenHex(topCol, 0.12) : topCol);
        ctx.strokeStyle = shadeHex(topCol, 0.65);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.bezierCurveTo(
          baseX + lk.cx1, baseY + lk.cy1,
          baseX + lk.cx2 + sw, baseY + lk.cy2,
          baseX + lk.ex + sw * 1.4, baseY + lk.ey
        );
        ctx.bezierCurveTo(
          baseX + lk.ex * 0.55 + sw, baseY + lk.ey * 0.62,
          baseX + lk.cx1 * 0.2, baseY - 25,
          baseX, baseY
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      drawPresetGlitter(baseX - 95, baseY + 45 * tScale, 55, 75 * tScale, this.presetState.topGlitter, 9);

      // Cute bright scrunchie on top of the head
      ctx.fillStyle = '#ffd43b';
      ctx.strokeStyle = '#d99b00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(baseX - 36, baseY - 16, 72, 26, 13);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawStrand(ctx, s) {
    const len = this.getVisualStrandLength(s);
    const spiky = this.stylePreset === 'mohawk' && s.t >= 0.30 && s.t <= 0.70;
    const dirY = spiky ? -0.92 : 1;
    const spread = spiky ? (s.t - 0.5) * 2.1 : s.outward;

    const steps = 10;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const baseX = s.ax + spread * len * (0.28 * f + 0.25 * f * f) + s.sway * f * f;
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

  drawWhiskers(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.whiskers.forEach((w) => {
      const len = w.maxLen * Math.max(0.18, w.length);
      const dirX = Math.cos(w.angle) * w.side;
      const dirY = Math.sin(w.angle);
      const perpX = -dirY * w.side;
      const perpY = dirX * w.side;

      const steps = 10;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        // Graceful slight natural arch
        const arch = -Math.sin(f * Math.PI) * 8;
        let px = w.ax + dirX * len * f;
        let py = w.ay + dirY * len * f + arch + w.sway * f * f;

        // Curling wand adds gentle wave along shaft
        if (w.curl > 0.04) {
          const wave = Math.sin(f * Math.PI * (2 + w.curl * 2)) * (11 * w.curl * f);
          px += perpX * wave;
          py += perpY * wave;
        }
        // Crimper makes silly zig-zag whiskers!
        if (w.crimp > 0.04) {
          const zig = ((i % 2 === 0) ? 1 : -1) * (12 * w.crimp * f);
          px += perpX * zig;
          py += perpY * zig;
        }
        pts.push({ x: px, y: py });
      }

      // When curled, add a real playful spiral curly-Q loop at the tip!
      if (w.curl > 0.12) {
        const end = pts[pts.length - 1];
        const loopR = 14 + w.curl * 16;
        const loopCx = end.x;
        const loopCy = end.y - loopR;
        const spiralSteps = 7;
        const maxTheta = Math.PI * (1.2 + w.curl * 1.45);
        for (let k = 1; k <= spiralSteps; k++) {
          const tf = k / spiralSteps;
          const theta = Math.PI * 0.5 - w.side * maxTheta * tf;
          const r = loopR * (1 - tf * 0.52);
          pts.push({
            x: loopCx + Math.cos(theta) * r,
            y: loopCy + Math.sin(theta) * r
          });
        }
      }

      const baseCol = w.wet > 0.2 ? shadeHex(w.color, 1 - w.wet * 0.18) : w.color;
      const outlineCol = w.color === '#fffaf2' ? '#9e6b43' : shadeHex(w.color, 0.58);

      // Draw tapered outline & fill segments (thicker at root, finer toward tip)
      for (let i = 0; i < pts.length - 1; i++) {
        const f = i / (pts.length - 1);
        const outW = 10.5 - f * 4.5;
        ctx.strokeStyle = outlineCol;
        ctx.lineWidth = outW;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const f = i / (pts.length - 1);
        const fillW = 6.2 - f * 3.0;
        ctx.strokeStyle = baseCol;
        ctx.lineWidth = fillW;
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }

      // Cute whisker root dot inside the cream muzzle pad
      ctx.fillStyle = '#c96f2d';
      ctx.beginPath();
      ctx.arc(w.ax, w.ay, 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Glitter sparkles on whisker
      if (w.glitter > 0.08) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, w.glitter);
        for (let i = 2; i < pts.length; i += 2) {
          const tw = 0.55 + 0.45 * Math.sin(this.time * 7 + w.index + i);
          ctx.fillStyle = i % 4 === 0 ? '#ffffff' : '#fff28c';
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, 3.6 * tw, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Cute mini shampoo bubbles on whisker
      if (w.foam > 0.15) {
        const mid = pts[Math.floor(pts.length * 0.45)];
        const br = 8 + w.foam * 11;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = 'rgba(170, 220, 255, 0.78)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mid.x, mid.y, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  drawCatEars(ctx) {
    const c = this.customer;
    const cx = this.cx;
    const cy = this.cy;
    ctx.save();
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(cx + dir * 106, cy - 114);
      ctx.rotate(dir * 0.28);
      // Outer furry ear
      ctx.fillStyle = c.skin;
      ctx.strokeStyle = shadeHex(c.skinShade, 0.85);
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-42, 30);
      ctx.quadraticCurveTo(-18, -42, 0, -68);
      ctx.quadraticCurveTo(18, -42, 42, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Pink inner ear
      ctx.fillStyle = '#ff9eb8';
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.quadraticCurveTo(-8, -22, 0, -40);
      ctx.quadraticCurveTo(8, -22, 22, 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  drawDogEars(ctx) {
    const c = this.customer;
    const cx = this.cx;
    const cy = this.cy;
    const earCol = c.earColor || '#8c532c';
    const sway = Math.sin(this.time * 1.9) * 3;
    ctx.save();
    [-1, 1].forEach((dir) => {
      ctx.save();
      ctx.translate(cx + dir * 130, cy - 68);
      ctx.rotate(dir * (0.14 + sway * 0.008));
      // Soft floppy puppy ear drooping gently down the cheek
      ctx.fillStyle = earCol;
      ctx.strokeStyle = shadeHex(earCol, 0.65);
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(dir * 52, -14, dir * 74, 82, dir * 40, 152);
      ctx.bezierCurveTo(dir * 18, 178, -dir * 20, 166, -dir * 16, 122);
      ctx.bezierCurveTo(-dir * 14, 72, -dir * 16, 20, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle warm highlight along outer edge of floppy ear
      ctx.strokeStyle = lightenHex(earCol, 0.22);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dir * 24, 18);
      ctx.quadraticCurveTo(dir * 42, 72, dir * 28, 128);
      ctx.stroke();
      ctx.restore();
    });
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

    // Shoulders & shirt (or furry body + fluffy cream chest patch for Pip & Zara!)
    const isPet = c.isCat || c.isDog;
    const bodyCol = isPet ? c.skin : c.shirt;
    ctx.fillStyle = bodyCol;
    ctx.strokeStyle = shadeHex(bodyCol, 0.72);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - 175, this.H + 20);
    ctx.quadraticCurveTo(cx - 165, cy + 195, cx - 58, cy + 185);
    ctx.lineTo(cx + 58, cy + 185);
    ctx.quadraticCurveTo(cx + 165, cy + 195, cx + 175, this.H + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isPet) {
      // Fluffy cream chest fur patch
      ctx.fillStyle = c.muzzleColor || '#fff2df';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 258, 76, 68, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = c.shirtAccent;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 202, 54, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neck (drawn BEFORE pet collar so collar wraps cleanly in front!)
    ctx.fillStyle = c.skinShade;
    ctx.beginPath();
    ctx.roundRect(cx - 34, cy + 135, 68, 72, 26);
    ctx.fill();

    // Pet collar & shiny golden bell (Pip) or dog tag (Zara) in front of neck
    if (isPet) {
      const collarCol = c.isDog ? '#29c7b8' : '#ff5ca8';
      ctx.fillStyle = collarCol;
      ctx.strokeStyle = shadeHex(collarCol, 0.72);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(cx - 56, cy + 172, 112, 24, 12);
      ctx.fill();
      ctx.stroke();
      // Shiny golden bell / dog tag
      ctx.fillStyle = '#ffd43b';
      ctx.strokeStyle = '#c98a00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy + 204, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (c.isCat) {
        ctx.fillStyle = '#8c5a00';
        ctx.beginPath();
        ctx.arc(cx, cy + 208, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Cute tiny paw/heart shine on dog tag
        ctx.fillStyle = '#fff5b8';
        ctx.beginPath();
        ctx.arc(cx - 5, cy + 199, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Monster cute striped horns!
    if (c.isMonster) {
      this.drawMonsterHorn(ctx, cx - 92, cy - 122, -0.32, c.hornColor, c.hornStripe);
      this.drawMonsterHorn(ctx, cx + 92, cy - 122, 0.32, c.hornColor, c.hornStripe);
    }

    // Ears (rounded ears for non-pets; Pip's cat ears & Zara's floppy dog ears draw over front hair)
    if (!isPet) {
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
    }

    // Fluffy side cheek tufts for Pip the Cat
    if (c.isCat) {
      [-1, 1].forEach((dir) => {
        ctx.fillStyle = c.skin;
        ctx.strokeStyle = shadeHex(c.skinShade, 0.85);
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 136, cy + 18);
        ctx.lineTo(cx + dir * 172, cy + 36);
        ctx.lineTo(cx + dir * 150, cy + 52);
        ctx.lineTo(cx + dir * 168, cy + 68);
        ctx.lineTo(cx + dir * 134, cy + 78);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    // Head shape with soft shading gradient (wider kitten shape for Pip!)
    const hRx = c.isCat ? this.headRx * 1.06 : this.headRx;
    const hRy = c.isCat ? this.headRy * 0.94 : this.headRy;
    const headGrad = ctx.createRadialGradient(cx - 35, cy - 45, 20, cx, cy, hRy * 1.15);
    headGrad.addColorStop(0, lightenHex(c.skin, 0.12));
    headGrad.addColorStop(0.75, c.skin);
    headGrad.addColorStop(1, c.skinShade);

    ctx.fillStyle = headGrad;
    ctx.strokeStyle = shadeHex(c.skinShade, 0.85);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, hRx, hRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cat tabby stripes & soft cream muzzle
    if (c.isCat) {
      ctx.strokeStyle = c.stripeColor || '#c96f2d';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55;
      // Forehead tabby "M" stripes
      [-24, 0, 24].forEach((sx, idx) => {
        ctx.beginPath();
        ctx.moveTo(cx + sx, cy - 118);
        ctx.lineTo(cx + sx * 0.8, cy - (idx === 1 ? 84 : 92));
        ctx.stroke();
      });
      // Cheek stripes
      [-1, 1].forEach((dir) => {
        [14, 34].forEach((sy) => {
          ctx.beginPath();
          ctx.moveTo(cx + dir * 132, cy + sy);
          ctx.lineTo(cx + dir * 106, cy + sy + 4);
          ctx.stroke();
        });
      });
      ctx.globalAlpha = 1;

      // Soft cream muzzle pillows
      ctx.fillStyle = c.muzzleColor || '#fff2df';
      ctx.beginPath();
      ctx.ellipse(cx - 26, cy + 56, 36, 28, -0.1, 0, Math.PI * 2);
      ctx.ellipse(cx + 26, cy + 56, 36, 28, 0.1, 0, Math.PI * 2);
      ctx.ellipse(cx, cy + 74, 32, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute puppy eye patch & soft cream snout for Zara the Dog!
    if (c.isDog) {
      ctx.fillStyle = c.patchColor || '#8c532c';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(cx - 56, cy + 4, 44, 38, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Soft cream puppy muzzle/snout
      ctx.fillStyle = c.muzzleColor || '#fff1db';
      ctx.beginPath();
      ctx.ellipse(cx - 28, cy + 60, 40, 32, -0.08, 0, Math.PI * 2);
      ctx.ellipse(cx + 28, cy + 60, 40, 32, 0.08, 0, Math.PI * 2);
      ctx.ellipse(cx, cy + 78, 38, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

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

    // Eyebrows (skip human eyebrows on Pip the Cat; cute puppy brow dots on Zara!)
    if (c.isDog) {
      ctx.fillStyle = c.muzzleColor || '#fff1db';
      const browLift = this.expression === 'surprised' ? -8 : 0;
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.ellipse(cx + dir * 52, cy - 36 + browLift, 14, 8, dir * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (!c.isCat) {
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
    }

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
        const er = (c.isMonster || c.isCat) ? 24 : 21;
        // White sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, er, 0, Math.PI * 2);
        ctx.fill();
        // Iris
        ctx.fillStyle = c.eyeColor;
        ctx.beginPath();
        ctx.arc(ex, eyeY + 1, er * 0.70, 0, Math.PI * 2);
        ctx.fill();
        // Pupil (cute vertical cat-oval pupil for Pip!)
        ctx.fillStyle = '#1d131c';
        ctx.beginPath();
        if (c.isCat) {
          ctx.ellipse(ex, eyeY + 1, er * 0.24, er * 0.50, 0, 0, Math.PI * 2);
        } else {
          ctx.arc(ex, eyeY + 1, er * 0.36, 0, Math.PI * 2);
        }
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
    ctx.fillStyle = c.isMonster ? '#ff85b3' : (c.isCat ? '#ff7aa8' : (c.isDog ? '#3d2318' : c.skinShade));
    ctx.beginPath();
    if (c.isCat) {
      // Cute pink cat triangle nose
      ctx.moveTo(cx - 14, cy + 32);
      ctx.quadraticCurveTo(cx, cy + 28, cx + 14, cy + 32);
      ctx.quadraticCurveTo(cx + 8, cy + 44, cx, cy + 48);
      ctx.quadraticCurveTo(cx - 8, cy + 44, cx - 14, cy + 32);
      ctx.closePath();
    } else if (c.isDog) {
      // Big shiny dark-brown puppy nose
      ctx.ellipse(cx, cy + 39, 22, 16, 0, 0, Math.PI * 2);
    } else if (c.isMonster) {
      ctx.ellipse(cx, cy + 36, 16, 11, 0, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, cy + 38, 8, 0, Math.PI * 2);
    }
    ctx.fill();

    // Glossy highlight on puppy nose
    if (c.isDog) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(cx - 7, cy + 34, 6, 3.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth with expressions
    ctx.strokeStyle = c.isDog ? '#5c3424' : '#a83c5c';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    if (this.expression === 'surprised') {
      ctx.fillStyle = '#d95375';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 84, 16, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if ((c.isCat || c.isDog) && this.expression === 'happy') {
      // Cute peeking pink puppy tongue for Zara!
      if (c.isDog) {
        ctx.fillStyle = '#ff85a8';
        ctx.strokeStyle = '#c44b6d';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 84, 15, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#5c3424';
        ctx.lineWidth = 6.5;
      }
      // Adorable :3 pet smile!
      ctx.beginPath();
      ctx.moveTo(cx, cy + (c.isDog ? 54 : 48));
      ctx.lineTo(cx, cy + 66);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 18, cy + 66, 18, 0.05 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 18, cy + 66, 18, 0.15 * Math.PI, 0.95 * Math.PI);
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

    // Temple arms to ears / outer cheeks (matches Pip's wider kitten head too)
    const armRx = (this.customer && this.customer.isCat) ? this.headRx * 1.06 : this.headRx;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - eyeDx - 40, eyeY - 4);
    ctx.lineTo(cx - armRx - 2, eyeY + 4);
    ctx.moveTo(cx + eyeDx + 40, eyeY - 4);
    ctx.lineTo(cx + armRx + 2, eyeY + 4);
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
      if (this.activeAccUid === a.uid) {
        ctx.strokeStyle = 'rgba(232, 76, 138, 0.75)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, 44 * a.scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
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

  drawTrashZone(ctx) {
    const active = this.accessories.find((a) => a.uid === this.activeAccUid);
    const tx = this.cx;
    const ty = 728;
    const over = active && Math.hypot(active.x - tx, active.y - ty) < 76;
    ctx.save();
    ctx.fillStyle = over ? 'rgba(229, 72, 77, 0.92)' : 'rgba(60, 38, 66, 0.72)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(tx, ty, over ? 52 : 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${over ? 46 : 38}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗑️', tx, ty + 2);
    ctx.restore();
  }

  drawToolCursor(ctx) {
    const c = this.toolCursor;
    ctx.save();
    ctx.translate(c.x - 26, c.y - 26);
    ctx.font = '56px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(45, 22, 54, 0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillText(c.icon, 0, 0);
    ctx.restore();
  }

  capturePhotoBlob() {
    this.render(true);
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }
}
