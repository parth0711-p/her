(() => {
  'use strict';

  /* ======================================================================
   * 1. EDIT THIS PART  -  everything personal lives in CONFIG
   * ==================================================================== */
  const CONFIG = {
    message: 'So many flowers but my favourite one is you hehe🥰',
    buttonText: 'Open Special Letter 💌',

    letter: {
      title: 'A Special Letter For You',
      photo: 'assets/letter-photo.svg',      // swap for your own picture, e.g. 'assets/us.jpg'
      photoAlt: 'A little picture just for you',
      greeting: 'Dear diary,',
      paragraphs: [
        'I always end up talking about her. Sometimes I tell people how special she is, sometimes how good she is. When I explain her behaviour with others, I end up telling how caring she is. But why do I want to be with her so badly, even after knowing that she still needs time to be sure about me? I\'ll tell you what she makes me feel like and why she means so much to me.',
        '.....',
        'I always say that even without doing anything, she does so much for me. She makes fancy efforts for me, but even if she didn\'t, it wouldn\'t matter. Someone who cares 24/7 the way she does probably doesn\'t exist anywhere else. Whether she writes something for me or not, nobody else stands up for me the way she does. When I hear her voice, it feels like I never had a problem in my life... and still, I need her more than I need her voice. When I look into her eyes, I feel so calm, knowing that I have someone who is genuine about me. She has made me feel cared for and loved like probably no one else has.',
        'So yes, even by doing nothing, she does so much for me. Fancy efforts don\'t matter to me, but her little things do, and most importantly, only she matters to me. I don\'t want her efforts, I want her care, which she gives me so much that sometimes I feel that if she weren\'t here, I probably wouldn\'t be this happy.',
        'These aren\'t just words, maybe they\'re my genuine feelings for her. So yes, that\'s why she is so important to me 🫂',
      ],
      signoff: ['hehe'],
    },

    seed: 7,   // change this number for a different (random-looking) grass layout
  };

  /* Animation timeline, in seconds after the page loads. */
  const T = {
    stem:    [0.9, 4.2],   // flower stems grow up
    fans:    [1.6, 4.8],   // big leaves at the bottom
    grass:   [1.2, 5.0],   // grass blades
    bloom:   [3.6, 5.4],   // flower heads open
    sparkle: [5.0, 6.5],   // golden sparkles fade in
    zoom:    [6.0, 8.0],   // camera zooms toward the flowers
    text:    7.4,          // message fades in
    button:  9.2,          // "Open Special Letter" button pops in
  };
  const ZOOM = 1.9;          // how far the camera zooms in
  const HEAD_Y = 0.72;       // where the tall flower ends up on screen after the zoom (0 = top, 1 = bottom)

  /* ======================================================================
   * 2. Small helpers
   * ==================================================================== */
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  // tiny seeded random generator so the garden looks the same on every load
  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ======================================================================
   * 3. Fill the page text from CONFIG
   * ==================================================================== */
  const $ = (id) => document.getElementById(id);
  const msgEl = $('message'), btnEl = $('openLetter');
  const modal = $('letterModal'), closeBtn = $('closeLetter');

  msgEl.textContent = CONFIG.message;
  btnEl.textContent = CONFIG.buttonText;
  $('letterTitle').textContent = CONFIG.letter.title;
  $('letterPhoto').src = CONFIG.letter.photo;
  $('letterPhoto').alt = CONFIG.letter.photoAlt;

  const body = $('letterBody');
  const greet = document.createElement('p');
  greet.className = 'letter__greeting';
  greet.textContent = CONFIG.letter.greeting;
  body.appendChild(greet);
  CONFIG.letter.paragraphs.forEach((txt) => {
    const p = document.createElement('p');
    p.textContent = txt;
    body.appendChild(p);
  });
  const sign = $('letterSign');
  CONFIG.letter.signoff.forEach((line, i) => {
    if (i) sign.appendChild(document.createElement('br'));
    sign.appendChild(document.createTextNode(line));
  });

  /* ======================================================================
   * 4. Scene data (normalised numbers; real pixel positions set in layout())
   * ==================================================================== */
  const canvas = $('garden');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let gw = 0, ox = 0, ground = 0;   // garden width, left offset, ground line

  // The three flowers. bx/tx = base/tip x (fraction of garden width), h = height (fraction of screen height)
  const stems = [
    { bx: 0.495, tx: 0.500, h: 0.500, bend: 0.000, lp: 0.098, t0: 0.00, dur: 3.3 },
    { bx: 0.485, tx: 0.355, h: 0.410, bend: -0.030, lp: 0.078, t0: 0.35, dur: 3.2 },
    { bx: 0.505, tx: 0.655, h: 0.425, bend: 0.030, lp: 0.080, t0: 0.60, dur: 3.0 },
  ];

  (function buildStemLeaves() {
    const rand = mulberry32(CONFIG.seed + 11);
    stems.forEach((s) => {
      s.leaves = [];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const f = 0.2 + i * (0.62 / (n - 1)) + (rand() - 0.5) * 0.05;
        s.leaves.push({ f, side: i % 2 ? 1 : -1, len: 0.135 - 0.06 * f });
      }
    });
  })();

  // Big leaf "fans" at the base (the bushy green parts)
  const fans = [];
  (function buildFans() {
    const rand = mulberry32(CONFIG.seed + 23);
    const defs = [
      { x: 0.40, a0: -168, a1: -78, n: 8, len: 0.22, wid: 0.055 },
      { x: 0.60, a0: -102, a1: -12, n: 7, len: 0.17, wid: 0.048 },
      { x: 0.29, a0: -170, a1: -112, n: 5, len: 0.15, wid: 0.042 },
      { x: 0.72, a0: -68, a1: -8, n: 5, len: 0.14, wid: 0.040 },
    ];
    defs.forEach((d, k) => {
      for (let i = 0; i < d.n; i++) {
        const f = d.n === 1 ? 0.5 : i / (d.n - 1);
        fans.push({
          x: d.x,
          ang: ((lerp(d.a0, d.a1, f) + (rand() - 0.5) * 10) * Math.PI) / 180,
          len: d.len * (0.8 + rand() * 0.35),
          wid: d.wid * (0.85 + rand() * 0.3),
          d: k * 0.25 + i * 0.12 + rand() * 0.2,
          ph: rand() * TAU,
        });
      }
    });
  })();

  // Grass blades are rebuilt on resize so they always fill the screen width
  let blades = [];
  function buildGrass() {
    const rand = mulberry32(CONFIG.seed + 5);
    const R = (a, b) => a + (b - a) * rand();
    const count = Math.round(clamp(W / 5.5, 70, 260));
    blades = [];
    for (let i = 0; i < count; i++) {
      const pale = rand() < 0.35;
      const tall = rand() < 0.14;
      blades.push({
        x: rand() < 0.6 ? ox + R(-0.05, 1.05) * gw : R(0, W),
        dy: R(-0.006, 0.01) * H,
        h: tall ? R(0.28, 0.42) : R(0.05, 0.26),
        lean: R(-0.3, 0.3),
        w: R(0.005, 0.012),
        d: R(0, 2.2),
        ph: R(0, TAU),
        a: pale ? R(0.5, 0.75) : R(0.8, 1),
        c0: pale ? '#4fb868' : '#1f8f3a',
        c1: pale ? '#d3f3d8' : '#8be29a',
      });
    }
    blades.sort((a, b) => b.h - a.h);   // tall ones are drawn first (behind)
  }

  // Golden sparkles
  const sparks = [];
  (function buildSparks() {
    const rand = mulberry32(CONFIG.seed + 41);
    for (let i = 0; i < 46; i++) {
      sparks.push({
        x: 0.12 + rand() * 0.76,
        y: 0.08 + rand() * 0.56,
        r: 0.7 + rand() * 1.5,
        ph: rand() * TAU,
        sp: 0.5 + rand() * 0.9,
        vy: 0.006 + rand() * 0.012,
      });
    }
  })();

  /* ======================================================================
   * 5. Layout (runs on load + resize)
   * ==================================================================== */
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gw = Math.min(W, H * 0.8);
    ox = (W - gw) / 2;
    ground = H * 0.975;

    stems.forEach((s) => {
      s.x0 = ox + s.bx * gw;
      s.y0 = ground;
      s.x1 = ox + s.tx * gw;
      s.y1 = ground - s.h * H;
      s.cx = lerp(s.x0, s.x1, 0.15) + s.bend * gw;
      s.cy = lerp(s.y0, s.y1, 0.55);
    });
    buildGrass();
  }

  /* ======================================================================
   * 6. Drawing
   * ==================================================================== */
  function stemPoint(s, t) {
    const u = 1 - t;
    return {
      x: u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1,
      y: u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1,
    };
  }
  function stemAngle(s, t) {
    const u = 1 - t;
    return Math.atan2(
      2 * u * (s.cy - s.y0) + 2 * t * (s.y1 - s.cy),
      2 * u * (s.cx - s.x0) + 2 * t * (s.x1 - s.cx)
    );
  }

  function drawLeaf(x, y, ang, len, wid, grow) {
    if (grow <= 0.001) return;
    const L = len * grow, Wd = wid * grow;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    const g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, '#1c8c3a');
    g.addColorStop(0.55, '#37b654');
    g.addColorStop(1, '#78d889');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * 0.25, -Wd, L * 0.7, -Wd * 0.85, L, 0);
    ctx.bezierCurveTo(L * 0.7, Wd * 0.85, L * 0.25, Wd, 0, 0);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, L * 0.03);
    ctx.strokeStyle = 'rgba(16, 100, 40, 0.5)';
    ctx.stroke();

    // lighter midrib
    ctx.beginPath();
    ctx.moveTo(L * 0.05, 0);
    ctx.quadraticCurveTo(L * 0.5, -Wd * 0.08, L * 0.9, 0);
    ctx.lineWidth = Math.max(0.8, L * 0.018);
    ctx.strokeStyle = 'rgba(225, 255, 225, 0.55)';
    ctx.stroke();
    ctx.restore();
  }

  function drawBlade(b, t) {
    const g = easeOutCubic(seg(t, T.grass[0] + b.d, T.grass[0] + b.d + 1.6));
    if (g <= 0.001) return;
    const h = b.h * H * g;
    const sway = Math.sin(t * 1.1 + b.ph) * H * 0.05 * b.h * 0.12 * g;
    const lean = b.lean * h;
    const x = b.x, y = ground + b.dy;
    const tipx = x + lean + sway, tipy = y - h;
    const wd = b.w * gw;

    ctx.beginPath();
    ctx.moveTo(x - wd, y);
    ctx.quadraticCurveTo(x - wd * 0.4 + lean * 0.1, y - h * 0.55, tipx, tipy);
    ctx.quadraticCurveTo(x + wd * 0.6 + lean * 0.35 + sway * 0.4, y - h * 0.5, x + wd, y);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, y, 0, tipy);
    gr.addColorStop(0, b.c0);
    gr.addColorStop(1, b.c1);
    ctx.globalAlpha = b.a;
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawStem(s, g) {
    const w0 = gw * 0.0125, w1 = gw * 0.0072;
    const n = Math.max(3, Math.ceil(40 * g));
    const left = [], right = [], mid = [];
    for (let i = 0; i <= n; i++) {
      const tt = (g * i) / n;
      const p = stemPoint(s, tt);
      const a = stemAngle(s, tt);
      const hw = lerp(w0, w1, tt) / 2;
      const nx = -Math.sin(a), ny = Math.cos(a);
      left.push({ x: p.x + nx * hw, y: p.y + ny * hw });
      right.push({ x: p.x - nx * hw, y: p.y - ny * hw });
      mid.push({ x: p.x + nx * hw * 0.35, y: p.y + ny * hw * 0.35 });
    }
    // stem body
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    left.forEach((p) => ctx.lineTo(p.x, p.y));
    for (let i = n; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fillStyle = '#1f9a3c';
    ctx.fill();
    // rounded growing tip
    const tip = stemPoint(s, g);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, lerp(w0, w1, g) / 2, 0, TAU);
    ctx.fill();
    // soft highlight running along the stem
    ctx.beginPath();
    ctx.moveTo(mid[0].x, mid[0].y);
    mid.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineCap = 'round';
    ctx.lineWidth = w0 * 0.26;
    ctx.strokeStyle = 'rgba(130, 225, 150, 0.7)';
    ctx.stroke();
  }

  function drawFlower(cx, cy, lp, b, tilt) {
    if (b <= 0.001) return;
    const open = easeOutCubic(b);
    const Lp = lp * gw * easeOutBack(b);
    const sy = lerp(1.3, 0.62, open);       // bud is tall, open flower is flatter
    const N = 6;
    const petals = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + 0.35;
      petals.push({ a, depth: Math.sin(a) });
    }
    petals.sort((p, q) => p.depth - q.depth);

    const petal = (a) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(1, sy);
      ctx.rotate(a);
      const wp = Lp * 0.37;
      const g = ctx.createLinearGradient(0, 0, Lp, 0);
      g.addColorStop(0, '#ee6a9a');
      g.addColorStop(0.45, '#fb9dbd');
      g.addColorStop(1, '#ffd2e2');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(Lp * 0.15, -wp * 1.05, Lp * 0.85, -wp * 1.0, Lp, 0);
      ctx.bezierCurveTo(Lp * 0.85, wp * 1.0, Lp * 0.15, wp * 1.05, 0, 0);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = Math.max(1, Lp * 0.025);
      ctx.strokeStyle = 'rgba(214, 78, 128, 0.35)';
      ctx.stroke();
      ctx.restore();
    };

    // petals behind the centre
    petals.filter((p) => p.depth <= 0).forEach((p) => petal(p.a));

    // golden centre
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    const rx = Lp * 0.36, ry = Lp * 0.26;
    const cg = ctx.createLinearGradient(0, -ry, 0, ry);
    cg.addColorStop(0, '#fff0a0');
    cg.addColorStop(0.55, '#ffc53d');
    cg.addColorStop(1, '#ff8f2a');
    ctx.beginPath();
    ctx.ellipse(0, Lp * 0.02, rx, ry, 0, 0, TAU);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-rx * 0.15, -ry * 0.25, rx * 0.5, ry * 0.32, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
    ctx.restore();

    // petals in front of the centre
    petals.filter((p) => p.depth > 0).forEach((p) => petal(p.a));
  }

  function drawStemAndFlower(s, t) {
    const g = easeOutCubic(seg(t, T.stem[0] + s.t0, T.stem[0] + s.t0 + s.dur));
    if (g <= 0.001) return;
    drawStem(s, g);

    // leaves sprout once the stem has passed their position
    s.leaves.forEach((lf) => {
      const grow = easeOutBack(clamp((g - lf.f) / 0.3));
      if (grow <= 0) return;
      const p = stemPoint(s, lf.f);
      const ang = stemAngle(s, lf.f) + lf.side * 0.9;
      drawLeaf(p.x, p.y, ang, lf.len * gw, lf.len * gw * 0.36, grow);
    });

    // bloom
    if (g > 0.97) {
      const b = seg(t, T.bloom[0] + s.t0 * 0.6, T.bloom[0] + s.t0 * 0.6 + 1.6);
      const tilt = (s.tx - s.bx) * 0.5;
      drawFlower(s.x1, s.y1, s.lp, b, tilt);
    }
  }

  function drawFan(f, t) {
    const grow = easeOutBack(seg(t, T.fans[0] + f.d, T.fans[0] + f.d + 1.5));
    const ang = f.ang + Math.sin(t * 0.9 + f.ph) * 0.02 * grow;
    drawLeaf(ox + f.x * gw, ground + H * 0.004, ang, f.len * gw, f.wid * gw * 2, grow);
  }

  function drawSparkles(t) {
    const a = seg(t, T.sparkle[0], T.sparkle[1]);
    if (a <= 0) return;
    const span = 0.66;
    sparks.forEach((p) => {
      const frac = (p.y + t * p.vy) % span;
      const edge = Math.sin((Math.PI * frac) / span);
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * p.sp * 1.4 + p.ph));
      const x = ox + p.x * gw + Math.sin(t * 0.5 * p.sp + p.ph) * gw * 0.012;
      const y = ground - frac * H;
      const r = clamp((p.r * gw) / 300, 1, 2.4);
      ctx.globalAlpha = a * edge * twinkle * 0.22;
      ctx.fillStyle = '#ffcf3f';
      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a * edge * twinkle;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawClouds() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(2, H * 0.004);
    ctx.beginPath();
    ctx.moveTo(W * 0.17, H * 0.125);
    ctx.lineTo(W * 0.2, H * 0.085);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1.5, H * 0.003);
    ctx.beginPath();
    ctx.moveTo(W * 0.23, H * 0.12);
    ctx.lineTo(W * 0.25, H * 0.095);
    ctx.stroke();
    ctx.restore();
  }

  function drawSun(t, z) {
    const a = seg(t, 0.1, 1.4);
    if (a <= 0) return;
    const r0 = Math.min(W * 0.065, H * 0.04);
    const r = lerp(r0, r0 * 1.7, z) * (1 + 0.025 * Math.sin(t * 1.6));
    const x = lerp(W * 0.83, W * 0.985, z);
    const y = lerp(H * 0.105, H * 0.125, z);

    ctx.save();
    ctx.globalAlpha = a;
    const glow = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.4);
    glow.addColorStop(0, 'rgba(255, 205, 70, 0.6)');
    glow.addColorStop(1, 'rgba(255, 205, 70, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.4, 0, TAU);
    ctx.fill();

    const core = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    core.addColorStop(0, '#ffe888');
    core.addColorStop(0.55, '#ffb82e');
    core.addColorStop(1, '#ff8a1c');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const z = easeInOutCubic(seg(t, T.zoom[0], T.zoom[1]));
    drawClouds();
    drawSun(t, z);

    // camera: slide + scale so the tall flower ends up near the bottom-centre
    const head = stems[0];
    const sc = lerp(1, ZOOM, z);
    const tx = lerp(0, W * 0.5 - ZOOM * head.x1, z);
    const ty = lerp(0, H * HEAD_Y - ZOOM * head.y1, z);
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty);

    const tall = H * 0.18;
    blades.forEach((b) => { if (b.h * H >= tall) drawBlade(b, t); });
    fans.forEach((f) => drawFan(f, t));
    stems.forEach((s) => drawStemAndFlower(s, t));
    blades.forEach((b) => { if (b.h * H < tall) drawBlade(b, t); });
    drawSparkles(t);
  }

  /* ======================================================================
   * 7. Main loop + message/button reveal
   * ==================================================================== */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(window.location.search);
  // Add ?t=9 to the URL to jump ahead 9 seconds (handy while editing). Reduced-motion users get the finished scene.
  const startOffset = reduceMotion ? T.button + 1 : parseFloat(params.get('t')) || 0;
  const startedAt = performance.now();
  let msgShown = false, btnShown = false;

  function frame(now) {
    const t = (now - startedAt) / 1000 + startOffset;
    render(t);
    if (!msgShown && t >= T.text) { msgEl.classList.add('is-visible'); msgShown = true; }
    if (!btnShown && t >= T.button) { btnEl.classList.add('is-visible'); btnShown = true; }
    requestAnimationFrame(frame);
  }

  layout();
  window.addEventListener('resize', layout);
  requestAnimationFrame(frame);

  /* ======================================================================
   * 8. Letter pop-up
   * ==================================================================== */
  let lastFocus = null;

  function openLetter() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }
  function closeLetter() {
    modal.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => {
      modal.hidden = true;
      if (lastFocus) lastFocus.focus();
    }, reduceMotion ? 0 : 260);
  }
  function onKey(e) {
    if (e.key === 'Escape') closeLetter();
    if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }   // keep focus inside the dialog
  }

  btnEl.addEventListener('click', openLetter);
  closeBtn.addEventListener('click', closeLetter);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeLetter(); });
})();
