// Partículas e pequenos efeitos visuais. Nada aqui afeta as regras do jogo.

let parts = [];

export function clearFx() {
  parts = [];
}

function add(p) {
  if (parts.length < 400) parts.push({ t: 0, rot: 0, vr: 0, g: 0, drag: 0, ...p });
}

const rand = (a, b) => a + Math.random() * (b - a);

// Estouro em todas as direções: estrelas, bolinhas ou corações.
export function burst(x, y, { n = 12, colors = ['#fff'], speed = 160, shape = 'star', size = 6, life = 0.7, g = 500 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const v = speed * rand(0.45, 1);
    add({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3,
      g, drag: 1.6, life: life * rand(0.7, 1.2), size: size * rand(0.6, 1.2),
      color: colors[i % colors.length], shape, rot: rand(0, 6), vr: rand(-8, 8),
    });
  }
}

// Poeirinha no chão quando um bicho cai.
export function dust(x, y, width, strength = 1) {
  const n = Math.round(3 + strength * 5);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    add({
      x: x + side * rand(0.2, 1) * width, y: y - rand(0, 4),
      vx: side * rand(20, 90) * strength, vy: -rand(10, 60) * strength,
      drag: 3, life: rand(0.35, 0.6), size: rand(4, 9), color: 'rgb(255 255 255 / 0.75)', shape: 'puff',
    });
  }
}

// Nuvem de fumaça onde um intruso foi espantado.
export function poof(x, y, r) {
  for (let i = 0; i < 10; i++) {
    const a = rand(0, Math.PI * 2);
    add({
      x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4,
      vx: Math.cos(a) * rand(30, 110), vy: Math.sin(a) * rand(30, 110),
      drag: 3, life: rand(0.4, 0.7), size: r * rand(0.3, 0.6), color: 'rgb(255 255 255 / 0.85)', shape: 'puff',
    });
  }
}

// Confete caindo do alto da tela.
export function confetti(W, n = 70) {
  const colors = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#fff'];
  for (let i = 0; i < n; i++) {
    add({
      x: rand(0, W), y: rand(-60, -5), vx: rand(-40, 40), vy: rand(60, 200),
      g: 220, drag: 0.6, life: rand(1.6, 2.6), size: rand(5, 9),
      color: colors[i % colors.length], shape: 'rect', rot: rand(0, 6), vr: rand(-10, 10),
    });
  }
}

// Um desenho (o intruso) saindo voando e girando.
export function fling(img, x, y, r, drawSize) {
  add({
    x, y, vx: (x < 180 ? -1 : 1) * rand(160, 260), vy: -rand(420, 560),
    g: 900, life: 1.1, size: r, shape: 'sprite', img, drawSize, rot: 0, vr: (Math.random() < 0.5 ? -1 : 1) * rand(9, 14),
  });
}

export function updateFx(dt) {
  for (const p of parts) {
    p.t += dt;
    p.vy += p.g * dt;
    const k = Math.max(0, 1 - p.drag * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  parts = parts.filter((p) => p.t < p.life);
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.5, -r * 0.2, -r * 0.7, -r * 1.2, 0, -r * 0.4);
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.5, -r * 0.2, 0, r * 0.9);
  ctx.fill();
}

export function drawFx(ctx) {
  for (const p of parts) {
    const k = p.t / p.life;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'puff') {
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (0.6 + k), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'sprite') {
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      if (p.img.complete && p.img.naturalWidth) ctx.drawImage(p.img, -p.drawSize / 2, -p.drawSize * 0.52, p.drawSize, p.drawSize);
    } else {
      ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1;
      if (p.shape === 'star') star(ctx, p.size);
      else if (p.shape === 'heart') heart(ctx, p.size);
      else if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
