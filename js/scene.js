// Cenário do quintal, pintado por código: céu, morros, cerca de madeira e gramado.
// Tem versão de dia (tema claro) e de noite (tema escuro).

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

export function paintScene(ctx, W, H, dark) {
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

// Nuvens que atravessam o céu devagar (desenhadas a cada quadro).
export function drawClouds(ctx, W, seconds, dark) {
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
