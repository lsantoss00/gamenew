// Cenários pintados por código: quintal, praia, neve, cidade e espaço.
// Cada um tem versão de dia (tema claro) e de noite (tema escuro).

const DAY = {
  sky: ['#6ec6ff', '#c9ecff'], orb: '#fff3b0', glow: 'rgb(255 243 176 / 0.35)',
  hill: ['#8fd08a', '#74c070'], wood: '#e2b377', woodDark: '#b98347', woodLight: '#f3d19c',
  grass: ['#7ccf6f', '#4fae4e'], band: 'rgb(255 255 255 / 0.07)', tuft: '#3f9a45',
  flowers: ['#ffffff', '#ffe066', '#ff9ec4'], cloud: 'rgb(255 255 255 / 0.9)',
};
const NIGHT = {
  sky: ['#0b1533', '#27406e'], orb: '#f4f1de', glow: 'rgb(244 241 222 / 0.18)',
  hill: ['#1f4a3a', '#1a3f33'], wood: '#6e5136', woodDark: '#4a3421', woodLight: '#86654a',
  grass: ['#2c6b3c', '#1c4a2c'], band: 'rgb(255 255 255 / 0.04)', tuft: '#174025',
  flowers: ['#cfd8ff', '#e8d98a', '#d9a3c0'], cloud: 'rgb(255 255 255 / 0.12)',
};

const FENCE_TOP = 222;
const GRASS_TOP = 338;

// Sorteio com semente fixa: o quintal é sempre o mesmo.
function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function paintQuintal(ctx, W, H, dark) {
  const c = dark ? NIGHT : DAY;
  const rnd = seeded(42);

  const sky = ctx.createLinearGradient(0, 0, 0, GRASS_TOP);
  sky.addColorStop(0, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (dark) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 46; i++) {
      ctx.globalAlpha = 0.35 + rnd() * 0.6;
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * 200, 0.6 + rnd() * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sol ou lua
  ctx.fillStyle = c.glow;
  ctx.beginPath();
  ctx.arc(296, 58, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.orb;
  ctx.beginPath();
  ctx.arc(296, 58, 26, 0, Math.PI * 2);
  ctx.fill();
  if (dark) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.08)';
    for (const [x, y, r] of [[288, 50, 6], [305, 66, 4], [300, 46, 3]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // morros ao fundo
  for (const [x, y, rx, ry, k] of [[70, 250, 150, 60, 0], [270, 256, 170, 70, 1]]) {
    ctx.fillStyle = c.hill[k];
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // cerca: tábuas com ponta e duas travessas
  const plank = 30;
  for (let x = 0; x < W; x += plank) {
    const top = FENCE_TOP + (rnd() - 0.5) * 8;
    const wood = ctx.createLinearGradient(x, 0, x + plank, 0);
    wood.addColorStop(0, c.woodLight);
    wood.addColorStop(0.5, c.wood);
    wood.addColorStop(1, c.woodDark);
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, GRASS_TOP + 20);
    ctx.lineTo(x + 1.5, top + 12);
    ctx.lineTo(x + plank / 2, top);
    ctx.lineTo(x + plank - 1.5, top + 12);
    ctx.lineTo(x + plank - 1.5, GRASS_TOP + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.woodDark;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // veios da madeira
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x + 9 + rnd() * 4, top + 24);
    ctx.lineTo(x + 9 + rnd() * 4, top + 60 + rnd() * 40);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const y of [FENCE_TOP + 30, GRASS_TOP - 24]) {
    ctx.fillStyle = c.wood;
    ctx.fillRect(0, y, W, 10);
    ctx.fillStyle = c.woodDark;
    ctx.fillRect(0, y + 8, W, 2);
    ctx.fillStyle = c.woodLight;
    ctx.fillRect(0, y, W, 2);
    for (let x = plank / 2; x < W; x += plank) { // pregos
      ctx.fillStyle = c.woodDark;
      ctx.beginPath();
      ctx.arc(x, y + 5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // gramado, com faixas de grama aparada
  const grass = ctx.createLinearGradient(0, GRASS_TOP, 0, H);
  grass.addColorStop(0, c.grass[0]);
  grass.addColorStop(1, c.grass[1]);
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, GRASS_TOP);
  for (let x = 0; x <= W; x += 6) ctx.lineTo(x + 3, GRASS_TOP - 5 - rnd() * 6), ctx.lineTo(x + 6, GRASS_TOP);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.band;
  for (let x = 0; x < W; x += 72) ctx.fillRect(x, GRASS_TOP, 36, H - GRASS_TOP);

  // tufos e flores
  ctx.strokeStyle = c.tuft;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const x = rnd() * W;
    const y = GRASS_TOP + 14 + rnd() * (H - GRASS_TOP - 20);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 6);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 1, y - 8);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 5);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const x = rnd() * W;
    const y = GRASS_TOP + 12 + rnd() * (H - GRASS_TOP - 20);
    ctx.fillStyle = c.flowers[i % 3];
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2a900';
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Peças comuns aos cenários novos ---

function sky(ctx, W, H, horizon, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function stars(ctx, W, rnd) {
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.35 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * 200, 0.6 + rnd() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function orb(ctx, x, y, color, glow) {
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// --- Praia: mar, veleiro, coqueiro, guarda-sol e areia ---

function paintPraia(ctx, W, H, dark) {
  const c = dark
    ? { sky: ['#0b1533', '#2a3f6b'], orb: '#f4f1de', glow: 'rgb(244 241 222 / 0.18)', sea: ['#12305a', '#1f5a80'], foam: 'rgb(255 255 255 / 0.35)',
      sand: ['#6f654a', '#4f4730'], speck: 'rgb(0 0 0 / 0.18)', trunk: '#4a3421', leaf: '#1f5a3a', leafDark: '#174529', red: '#8c2f3a', white: '#b9b7ad', hull: '#3b3f52' }
    : { sky: ['#3fb8f5', '#d6f3ff'], orb: '#fff3b0', glow: 'rgb(255 243 176 / 0.4)', sea: ['#1f9fd0', '#7fd9ee'], foam: 'rgb(255 255 255 / 0.9)',
      sand: ['#f8e2a8', '#e8c476'], speck: 'rgb(160 110 40 / 0.25)', trunk: '#9a6a3c', leaf: '#3fae5a', leafDark: '#2c8a45', red: '#ff5d5d', white: '#ffffff', hull: '#e8554e' };
  const rnd = seeded(7);
  const HORIZON = 286;
  const SHORE = 362;
  sky(ctx, W, H, HORIZON, c.sky[0], c.sky[1]);
  if (dark) stars(ctx, W, rnd);
  orb(ctx, 296, 58, c.orb, c.glow);

  // mar, com ondinhas
  const sea = ctx.createLinearGradient(0, HORIZON, 0, SHORE);
  sea.addColorStop(0, c.sea[0]);
  sea.addColorStop(1, c.sea[1]);
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, W, SHORE - HORIZON + 10);
  ctx.strokeStyle = c.foam;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const y = HORIZON + 10 + rnd() * (SHORE - HORIZON - 26);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 7, y - 4, x + 14, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // veleiro no horizonte
  ctx.fillStyle = c.hull;
  ctx.beginPath();
  ctx.moveTo(96, HORIZON + 4);
  ctx.lineTo(132, HORIZON + 4);
  ctx.lineTo(126, HORIZON + 13);
  ctx.lineTo(102, HORIZON + 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.white;
  ctx.beginPath();
  ctx.moveTo(114, HORIZON - 30);
  ctx.lineTo(114, HORIZON + 1);
  ctx.lineTo(134, HORIZON + 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(111, HORIZON - 22);
  ctx.lineTo(111, HORIZON + 1);
  ctx.lineTo(98, HORIZON + 1);
  ctx.closePath();
  ctx.fill();

  // areia, com a espuma da onda na beirada
  const sand = ctx.createLinearGradient(0, SHORE, 0, H);
  sand.addColorStop(0, c.sand[0]);
  sand.addColorStop(1, c.sand[1]);
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, SHORE);
  for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, SHORE + (x % 80 ? 9 : -5), x + 40, SHORE);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.foam;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, SHORE);
  for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, SHORE + (x % 80 ? 9 : -5), x + 40, SHORE);
  ctx.stroke();
  ctx.fillStyle = c.speck;
  for (let i = 0; i < 90; i++) ctx.fillRect(rnd() * W, SHORE + 14 + rnd() * (H - SHORE - 16), 1.6, 1.6);

  // guarda-sol
  ctx.strokeStyle = c.trunk;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(292, 300);
  ctx.lineTo(302, 400);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? c.white : c.red;
    ctx.beginPath();
    ctx.moveTo(292, 300);
    ctx.arc(292, 300, 56, Math.PI + (i * Math.PI) / 6 - 0.1, Math.PI + ((i + 1) * Math.PI) / 6 - 0.1);
    ctx.closePath();
    ctx.fill();
  }

  // coqueiro
  ctx.strokeStyle = c.trunk;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(34, 392);
  ctx.quadraticCurveTo(30, 300, 62, 236);
  ctx.stroke();
  for (const [dx, dy, k] of [[-58, 6, 1], [-44, -30, 0], [-6, -46, 1], [40, -34, 0], [60, 4, 1], [28, 30, 0], [-30, 32, 1]]) {
    ctx.fillStyle = k ? c.leaf : c.leafDark;
    ctx.beginPath();
    ctx.moveTo(62, 236);
    ctx.quadraticCurveTo(62 + dx * 0.5 - dy * 0.25, 236 + dy * 0.5 + dx * 0.25 - 10, 62 + dx, 236 + dy);
    ctx.quadraticCurveTo(62 + dx * 0.5 + dy * 0.2, 236 + dy * 0.5 - dx * 0.2 + 8, 62, 236);
    ctx.fill();
  }
  circle(ctx, 58, 242, 5, c.trunk);
  circle(ctx, 68, 243, 5, c.trunk);

  // estrelas-do-mar e conchas
  for (let i = 0; i < 5; i++) {
    const x = 20 + rnd() * (W - 40);
    const y = SHORE + 30 + rnd() * (H - SHORE - 50);
    if (i % 2) {
      ctx.fillStyle = dark ? '#8a5a3a' : '#ff9f43';
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 + i;
        const d = p % 2 ? 3 : 7;
        ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = dark ? '#a79a8c' : '#fff1e6';
      ctx.beginPath();
      ctx.arc(x, y, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = c.speck;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// --- Neve: montanhas, pinheiros, boneco de neve e chão branco ---

function paintNeve(ctx, W, H, dark) {
  const c = dark
    ? { sky: ['#0b1533', '#2b3f66'], orb: '#f4f1de', glow: 'rgb(244 241 222 / 0.18)', peak: '#3b4a6b', peakFar: '#2f3d5c', cap: '#c9d6ea',
      pine: '#173d33', pineSnow: '#b9c9de', snow: ['#aebfd8', '#7f93b3'], shade: 'rgb(20 40 80 / 0.25)', body: '#c9d6ea', line: '#5d6f8f' }
    : { sky: ['#8fcdf5', '#eef8ff'], orb: '#fff7cf', glow: 'rgb(255 247 207 / 0.45)', peak: '#9fb6d4', peakFar: '#bccde3', cap: '#ffffff',
      pine: '#2f7d5b', pineSnow: '#ffffff', snow: ['#ffffff', '#c5def5'], shade: 'rgb(120 160 210 / 0.3)', body: '#ffffff', line: '#9db8d6' };
  const rnd = seeded(99);
  const GROUND = 336;
  sky(ctx, W, H, GROUND, c.sky[0], c.sky[1]);
  if (dark) stars(ctx, W, rnd);
  orb(ctx, 296, 58, c.orb, c.glow);

  // montanhas com o topo nevado
  for (const [x, top, half, color] of [[250, 150, 150, c.peakFar], [70, 170, 140, c.peak], [330, 205, 110, c.peak]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - half, GROUND + 10);
    ctx.lineTo(x, top);
    ctx.lineTo(x + half, GROUND + 10);
    ctx.closePath();
    ctx.fill();
    const k = 0.28; // fração da altura coberta de neve
    const h = (GROUND + 10 - top) * k;
    ctx.fillStyle = c.cap;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - half * k, top + h);
    ctx.lineTo(x - half * k * 0.45, top + h - 9);
    ctx.lineTo(x, top + h + 4);
    ctx.lineTo(x + half * k * 0.5, top + h - 10);
    ctx.lineTo(x + half * k, top + h);
    ctx.closePath();
    ctx.fill();
  }

  // pinheiros
  for (const [x, s] of [[24, 1], [64, 0.75], [112, 1.1], [168, 0.8], [214, 0.95], [256, 0.7]]) {
    const base = GROUND + 8;
    ctx.fillStyle = dark ? '#3a2a1c' : '#7a5234';
    ctx.fillRect(x - 3 * s, base - 14 * s, 6 * s, 16 * s);
    for (let i = 0; i < 3; i++) {
      const y = base - 12 * s - i * 22 * s;
      const w = (26 - i * 6) * s;
      ctx.fillStyle = c.pine;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y - 34 * s);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c.pineSnow;
      ctx.beginPath();
      ctx.moveTo(x, y - 34 * s);
      ctx.lineTo(x - w * 0.42, y - 18 * s);
      ctx.lineTo(x - w * 0.12, y - 22 * s);
      ctx.lineTo(x + w * 0.1, y - 17 * s);
      ctx.lineTo(x + w * 0.42, y - 18 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  // chão de neve, em montinhos
  const snow = ctx.createLinearGradient(0, GROUND, 0, H);
  snow.addColorStop(0, c.snow[0]);
  snow.addColorStop(1, c.snow[1]);
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, GROUND + 6);
  for (let x = 0; x < W; x += 90) ctx.quadraticCurveTo(x + 45, GROUND - 14, x + 90, GROUND + 6);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.shade;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(rnd() * W, GROUND + 30 + rnd() * (H - GROUND - 40), 26 + rnd() * 30, 5 + rnd() * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // boneco de neve
  const bx = 306;
  const by = GROUND + 22;
  circle(ctx, bx, by, 26, c.body, c.line);
  circle(ctx, bx, by - 36, 18, c.body, c.line);
  ctx.strokeStyle = dark ? '#3a2a1c' : '#7a5234';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - 22, by - 8);
  ctx.lineTo(bx - 44, by - 24);
  ctx.moveTo(bx + 22, by - 8);
  ctx.lineTo(bx + 42, by - 26);
  ctx.stroke();
  ctx.fillStyle = dark ? '#8c2f3a' : '#ff5d5d'; // cachecol
  ctx.fillRect(bx - 16, by - 23, 32, 7);
  ctx.fillRect(bx + 6, by - 20, 7, 18);
  circle(ctx, bx - 6, by - 41, 2.2, '#231c19');
  circle(ctx, bx + 6, by - 41, 2.2, '#231c19');
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.moveTo(bx, by - 37);
  ctx.lineTo(bx + 14, by - 34);
  ctx.lineTo(bx, by - 32);
  ctx.closePath();
  ctx.fill();
  for (const dy of [-8, 2, 12]) circle(ctx, bx, by + dy, 2, '#231c19');
}

// --- Cidade: prédios, calçada, poste e hidrante ---

function paintCidade(ctx, W, H, dark) {
  const c = dark
    ? { sky: ['#0b1533', '#3b3566'], orb: '#f4f1de', glow: 'rgb(244 241 222 / 0.18)', far: '#232a4d', near: ['#2f3760', '#39305c', '#27405f'],
      win: '#ffd866', winOff: '#1c2242', walk: ['#5b6072', '#454a5c'], joint: 'rgb(0 0 0 / 0.22)', curb: '#30344a', metal: '#2a2d3d', lamp: '#ffe9a3', red: '#a23b3b' }
    : { sky: ['#69c0f5', '#ffe3c4'], orb: '#fff3b0', glow: 'rgb(255 243 176 / 0.45)', far: '#b7c7e6', near: ['#f2a65a', '#e87d6f', '#6fa8dc'],
      win: '#fff6d6', winOff: '#8fb7d9', walk: ['#d9dbe3', '#b9bcc9'], joint: 'rgb(0 0 0 / 0.1)', curb: '#9a9db0', metal: '#5a5f73', lamp: '#fff3b0', red: '#e5484d' };
  const rnd = seeded(31);
  const GROUND = 344;
  sky(ctx, W, H, GROUND, c.sky[0], c.sky[1]);
  if (dark) stars(ctx, W, rnd);
  orb(ctx, 296, 58, c.orb, c.glow);

  // prédios ao fundo
  ctx.fillStyle = c.far;
  for (let x = -6; x < W; x += 34) {
    const h = 70 + rnd() * 90;
    ctx.fillRect(x, GROUND - h, 30, h + 10);
  }
  // prédios da frente, com janelas
  let x = 0;
  for (let i = 0; x < W; i++) {
    const w = 46 + rnd() * 34;
    const h = 60 + rnd() * 110;
    const top = GROUND - h;
    ctx.fillStyle = c.near[i % 3];
    ctx.fillRect(x, top, w - 4, h + 10);
    ctx.fillStyle = 'rgb(0 0 0 / 0.12)';
    ctx.fillRect(x + w - 12, top, 8, h + 10);
    for (let wy = top + 10; wy < GROUND - 16; wy += 20) {
      for (let wx = x + 7; wx < x + w - 20; wx += 14) {
        ctx.fillStyle = rnd() < (dark ? 0.55 : 0.8) ? c.win : c.winOff;
        ctx.fillRect(wx, wy, 8, 11);
      }
    }
    x += w;
  }

  // calçada em lajotas, com a guia
  const walk = ctx.createLinearGradient(0, GROUND, 0, H);
  walk.addColorStop(0, c.walk[0]);
  walk.addColorStop(1, c.walk[1]);
  ctx.fillStyle = walk;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = c.curb;
  ctx.fillRect(0, GROUND, W, 7);
  ctx.strokeStyle = c.joint;
  ctx.lineWidth = 1.5;
  for (let y = GROUND + 36; y < H; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let row = 0, y = GROUND + 7; y < H; row++, y += 36) {
    for (let vx = (row % 2) * 30; vx < W; vx += 60) {
      ctx.beginPath();
      ctx.moveTo(vx, y);
      ctx.lineTo(vx, Math.min(H, y + (row ? 36 : 29)));
      ctx.stroke();
    }
  }

  // poste de luz
  ctx.fillStyle = c.metal;
  ctx.fillRect(52, 196, 6, GROUND - 190);
  ctx.fillRect(44, GROUND - 2, 22, 10);
  ctx.fillRect(52, 196, 34, 6);
  if (dark) {
    const glow = ctx.createRadialGradient(84, 208, 2, 84, 208, 70);
    glow.addColorStop(0, 'rgb(255 233 163 / 0.5)');
    glow.addColorStop(1, 'rgb(255 233 163 / 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(14, 138, 140, 140);
  }
  ctx.fillStyle = c.lamp;
  ctx.beginPath();
  ctx.moveTo(76, 202);
  ctx.lineTo(94, 202);
  ctx.lineTo(90, 214);
  ctx.lineTo(80, 214);
  ctx.closePath();
  ctx.fill();

  // hidrante
  const hx = 300;
  const hy = GROUND + 6;
  ctx.fillStyle = c.red;
  ctx.fillRect(hx - 9, hy - 34, 18, 34);
  ctx.fillRect(hx - 13, hy - 6, 26, 8);
  ctx.fillRect(hx - 16, hy - 26, 32, 8);
  ctx.beginPath();
  ctx.arc(hx, hy - 34, 9, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(hx - 3, hy - 48, 6, 6);
  ctx.fillStyle = 'rgb(255 255 255 / 0.25)';
  ctx.fillRect(hx - 6, hy - 32, 3, 24);
}

// --- Espaço: lua de queijo... digo, de crateras, planetas e estrelas ---

function paintEspaco(ctx, W, H, dark) {
  const c = dark
    ? { sky: ['#07061a', '#2a1650'], ground: ['#8d8fa6', '#5e607a'], crater: 'rgb(0 0 0 / 0.22)', rim: 'rgb(255 255 255 / 0.18)', planet: ['#ff9f6b', '#c45a7a'], ring: '#ffd9a8', small: '#7fd6c2', flag: '#e5484d' }
    : { sky: ['#1d1b52', '#6a4fb0'], ground: ['#c9cbe0', '#9799b8'], crater: 'rgb(40 40 90 / 0.2)', rim: 'rgb(255 255 255 / 0.4)', planet: ['#ffb37a', '#e06b8b'], ring: '#ffe6bf', small: '#8fe3cf', flag: '#ff5d5d' };
  const rnd = seeded(123);
  const GROUND = 348;
  sky(ctx, W, H, GROUND, c.sky[0], c.sky[1]);
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.7;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * GROUND, 0.5 + rnd() * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // nebulosa
  for (const [x, y, r, color] of [[70, 110, 110, 'rgb(255 120 200 / 0.14)'], [250, 220, 130, 'rgb(90 200 255 / 0.12)']]) {
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // planeta com anel
  const px = 286;
  const py = 70;
  ctx.strokeStyle = c.ring;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(px, py, 52, 13, -0.35, Math.PI * 0.02, Math.PI * 0.98);
  ctx.stroke();
  const planet = ctx.createLinearGradient(px - 30, py - 30, px + 30, py + 30);
  planet.addColorStop(0, c.planet[0]);
  planet.addColorStop(1, c.planet[1]);
  circle(ctx, px, py, 30, planet);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.25)';
  ctx.lineWidth = 3;
  for (const dy of [-10, 4, 15]) {
    ctx.beginPath();
    ctx.moveTo(px - 26, py + dy);
    ctx.quadraticCurveTo(px, py + dy + 6, px + 26, py + dy);
    ctx.stroke();
  }
  ctx.strokeStyle = c.ring;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(px, py, 52, 13, -0.35, Math.PI * 1.02, Math.PI * 1.98);
  ctx.stroke();
  circle(ctx, 60, 190, 13, c.small);
  circle(ctx, 56, 186, 3, 'rgb(0 0 0 / 0.15)');

  // chão da lua, com crateras
  const ground = ctx.createLinearGradient(0, GROUND, 0, H);
  ground.addColorStop(0, c.ground[0]);
  ground.addColorStop(1, c.ground[1]);
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, GROUND + 10);
  ctx.quadraticCurveTo(W / 2, GROUND - 26, W, GROUND + 10);
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 11; i++) {
    const x = 16 + rnd() * (W - 32);
    const y = GROUND + 34 + rnd() * (H - GROUND - 50);
    const r = 8 + rnd() * 16;
    ctx.fillStyle = c.crater;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.rim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // bandeira fincada, com uma pata
  ctx.strokeStyle = '#e8e8f0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(92, GROUND + 14);
  ctx.lineTo(92, GROUND - 62);
  ctx.stroke();
  ctx.fillStyle = c.flag;
  ctx.fillRect(93, GROUND - 62, 38, 25);
  ctx.fillStyle = '#fff';
  circle(ctx, 112, GROUND - 46, 4.5, '#fff');
  for (const [dx, dy] of [[-7, -6], [-2.5, -9.5], [2.5, -9.5], [7, -6]]) circle(ctx, 112 + dx, GROUND - 46 + dy, 2, '#fff');
}

const PAINTERS = { quintal: paintQuintal, praia: paintPraia, neve: paintNeve, cidade: paintCidade, espaco: paintEspaco };

export function paintScene(ctx, W, H, dark, id = 'quintal') {
  (PAINTERS[id] ?? paintQuintal)(ctx, W, H, dark);
}

// O que se mexe no fundo, desenhado a cada quadro: nuvens, ou neve caindo.
export function drawAmbient(ctx, W, H, seconds, dark, id = 'quintal') {
  if (id === 'espaco') { // estrelas piscando e, de vez em quando, uma estrela cadente
    const rnd = seeded(77);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * 330;
      ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(seconds * (0.6 + rnd()) + i));
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = (seconds % 7) / 0.9; // uma passagem de 0,9 s a cada 7 s
    if (t < 1) {
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(40 + t * 200, 40 + t * 90);
      ctx.lineTo(10 + t * 200, 26 + t * 90);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }
  if (id !== 'neve') {
    drawClouds(ctx, W, seconds, dark);
    return;
  }
  const rnd = seeded(5);
  ctx.fillStyle = dark ? 'rgb(255 255 255 / 0.6)' : 'rgb(255 255 255 / 0.95)';
  for (let i = 0; i < 46; i++) {
    const speed = 22 + rnd() * 30;
    const x = (rnd() * W + Math.sin(seconds * (0.5 + rnd()) + i) * 10 + W) % W;
    const y = (rnd() * H + seconds * speed) % H;
    ctx.beginPath();
    ctx.arc(x, y, 1 + rnd() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Nuvens que atravessam o céu devagar (desenhadas a cada quadro).
function drawClouds(ctx, W, seconds, dark) {
  ctx.fillStyle = (dark ? NIGHT : DAY).cloud;
  for (const [x0, y, s, speed] of [[40, 40, 1, 5], [210, 76, 0.7, 8], [330, 150, 0.85, 3.5]]) {
    const span = W + 140;
    const x = ((x0 + seconds * speed) % span) - 70;
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20 * s, y + 4 * s, 18 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 20 * s, y + 3 * s, 20 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 4 * s, y - 9 * s, 17 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
