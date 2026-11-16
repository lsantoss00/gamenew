// Desenho dos bichos em SVG, gerado por código (sem arquivos de imagem).
// Cada bicho é uma cabeça redonda de raio 50 centrada em (0,0); orelhas, juba e
// tufos passam do círculo. A caixa do desenho vai de -75 a 75 nos dois eixos.

export const ART_BOX = 150; // lado da caixa do desenho, para quem for escalar
export const HEAD_R = 50;

const CATS = [
  { fur: '#fff1d6', ear: '#f3d3a0' },
  { fur: '#ffab4a', ear: '#f08c22', marks: 'stripes', mark: '#e37f1c', muzzle: '#fff3e0' },
  { fur: '#a98467', ear: '#8a6a50', marks: 'stripes', mark: '#6a4a33', muzzle: '#d9c0a8' },
  { fur: '#f6ecdd', ear: '#5d4037', mask: '#6d4c41', iris: '#4aa8e8' },
  { fur: '#c3c8d6', ear: '#a3a9ba', fluffy: true, iris: '#f2a900', muzzle: '#eef0f5' },
  { fur: '#c9b79c', ear: '#a8957a', marks: 'spots', mark: '#8a7355', tufts: true, ruff: true, muzzle: '#f3ece0' },
  { fur: '#f0c65a', ear: '#d3a53c', marks: 'rosettes', mark: '#5a3d1e', muzzle: '#fff4d6' },
  { fur: '#3b3b4a', ear: '#2b2b37', iris: '#ffd43b', dark: true },
  { fur: '#ff8f2b', ear: '#e0731a', marks: 'tiger', mark: '#2b1c12', muzzle: '#fff3e0' },
  { fur: '#f5c15f', ear: '#dba23f', mane: '#b5651d', muzzle: '#fff0cf' },
];

const DOGS = [
  { fur: '#f7e0b8', ear: '#d9b07a', snout: '#fff6e6', tongue: true },
  { fur: '#d99a4e', ear: '#b8762c', snout: '#f3d3a2', tongue: true },
  { fur: '#8c5a3a', ear: '#6b3f24', snout: '#b07a52', long: true },
  { fur: '#fbf3e4', ear: '#9a5f33', snout: '#ffffff', patch: '#9a5f33' },
  { fur: '#34343e', ear: '#25252d', snout: '#ffffff', blaze: true, dark: true },
  { fur: '#8f9db0', ear: '#6f7d90', snout: '#ffffff', mask: true, pointy: true, iris: '#4aa8e8' },
  { fur: '#c98f4f', ear: '#4a3526', snout: '#4a3526', pointy: true, saddle: '#4a3526' },
  { fur: '#2f2a2a', ear: '#211d1d', snout: '#b9763e', pointy: true, brows: '#b9763e', dark: true },
  { fur: '#c4672f', ear: '#8f4520', snout: '#ffffff', blaze: true, long: true },
  { fur: '#7b8592', ear: '#5c6570', snout: '#eef1f5', mask: true, pointy: true, ruff: true, iris: '#f2b705' },
];

const INK = '#231c19';

// Mistura a cor com preto (k < 0) ou branco (k > 0).
function shade(hex, k) {
  const target = k < 0 ? 0 : 255;
  const a = Math.abs(k);
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * a).toString(16).padStart(2, '0');
  });
  return `#${ch.join('')}`;
}

function eye(x, y, mood, iris, line, dark) {
  if (mood === 'blink') {
    return `<path d="M${x - 8} ${y}q8 6 16 0" fill="none" stroke="${line}" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  if (mood === 'happy') {
    return `<path d="M${x - 8} ${y + 2}q8 -11 16 0" fill="none" stroke="${line}" stroke-width="3.6" stroke-linecap="round"/>`;
  }
  if (mood === 'scared') {
    return `<circle cx="${x}" cy="${y}" r="10.5" fill="#fff" stroke="${INK}" stroke-width="1.2"/>` +
      `<circle cx="${x}" cy="${y + 1}" r="3.6" fill="${INK}"/>`;
  }
  const glint = `<circle cx="${x - 2.6}" cy="${y - 3.6}" r="3" fill="#fff"/><circle cx="${x + 2.8}" cy="${y + 3.2}" r="1.4" fill="#fff" opacity=".8"/>`;
  if (iris) {
    return `<ellipse cx="${x}" cy="${y}" rx="8.6" ry="9.6" fill="${iris}" stroke="${INK}" stroke-width="1.6"/>` +
      `<ellipse cx="${x}" cy="${y}" rx="4.2" ry="6.4" fill="${INK}"/>${glint}`;
  }
  // em pelo escuro, um aro claro para o olho não sumir
  const rim = dark ? ' stroke="#f1ece4" stroke-width="1.8"' : '';
  return `<ellipse cx="${x}" cy="${y}" rx="8" ry="9.6" fill="${INK}"${rim}/>${glint}`;
}

function brows(y, line) {
  return `<path d="M-31 ${y - 9}-9 ${y}M31 ${y - 9} 9 ${y}" stroke="${line}" stroke-width="4" stroke-linecap="round"/>`;
}

function mouth(y, mood, line, tongue) {
  if (mood === 'happy') {
    return `<path d="M-10 ${y}q10 16 20 0z" fill="#7a2331" stroke="${line}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M-5 ${y + 6}q5 4 10 0q-1 5-5 5t-5-5z" fill="#ff8fa3"/>`;
  }
  if (mood === 'scared') return `<ellipse cx="0" cy="${y + 5}" rx="4.4" ry="5.6" fill="#7a2331" stroke="${line}" stroke-width="1.6"/>`;
  if (mood === 'angry') return `<path d="M-9 ${y + 8}q9 -9 18 0" fill="none" stroke="${line}" stroke-width="2.6" stroke-linecap="round"/>`;
  return (tongue ? `<path d="M-5 ${y + 3}h10v6a5 5 0 0 1-10 0z" fill="#ff8fa3" stroke="${line}" stroke-width="1.2"/>` : '') +
    `<path d="M0 ${y}q-6 8-12 3M0 ${y}q6 8 12 3" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function catMarks(s) {
  const m = s.mark;
  if (s.marks === 'stripes' || s.marks === 'tiger') {
    const w = s.marks === 'tiger' ? 5.5 : 4;
    return `<g fill="none" stroke="${m}" stroke-width="${w}" stroke-linecap="round">` +
      '<path d="M0 -50v15M-13 -47l3 13M13 -47l-3 13M-50 -6h13M-49 8h11M50 -6h-13M49 8h-11"/>' +
      (s.marks === 'tiger' ? '<path d="M-44 22l11 -3M44 22l-11 -3M-24 -44l4 9M24 -44l-4 9"/>' : '') + '</g>';
  }
  const dots = [[-20, -34], [0, -38], [20, -34], [-38, -12], [38, -12], [-40, 10], [40, 10], [-10, -26], [10, -26], [-30, 28], [30, 28]];
  if (s.marks === 'rosettes') {
    return `<g fill="none" stroke="${m}" stroke-width="3">${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6"/>`).join('')}</g>`;
  }
  return `<g fill="${m}">${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2"/>`).join('')}</g>`;
}

function cat(s, mood, id) {
  const line = s.dark ? '#f1ece4' : INK;
  const edge = shade(s.fur, -0.38);
  const earEdge = shade(s.ear, -0.3);
  let out = '';
  if (s.mane) {
    const lobes = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return `<circle cx="${(Math.cos(a) * 54).toFixed(1)}" cy="${(Math.sin(a) * 54).toFixed(1)}" r="15"/>`;
    }).join('');
    out += `<g fill="${s.mane}" stroke="${shade(s.mane, -0.3)}" stroke-width="2.5">${lobes}</g><circle r="58" fill="${s.mane}"/>` +
      `<circle cx="-36" cy="-44" r="13" fill="${s.ear}" stroke="${earEdge}" stroke-width="2.5"/><circle cx="36" cy="-44" r="13" fill="${s.ear}" stroke="${earEdge}" stroke-width="2.5"/>` +
      '<circle cx="-36" cy="-44" r="6.5" fill="#f7a8b8"/><circle cx="36" cy="-44" r="6.5" fill="#f7a8b8"/>';
  } else {
    out += `<path d="M-47 -18-41 -70-9 -45ZM47 -18 41 -70 9 -45Z" fill="${s.ear}" stroke="${earEdge}" stroke-width="3" stroke-linejoin="round"/>` +
      '<path d="M-39 -32-37 -57-20 -43ZM39 -32 37 -57 20 -43Z" fill="#f7a8b8"/>';
  }
  if (s.tufts) out += `<path d="M-41 -70-45 -78M41 -70 45 -78" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
  if (s.ruff || s.fluffy) {
    out += `<path d="M-44 14-64 20-50 28-62 40-40 38ZM44 14 64 20 50 28 62 40 40 38Z" fill="${s.fur}" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  out += `<circle r="${HEAD_R}" fill="url(#f${id})" stroke="${edge}" stroke-width="3"/><g clip-path="url(#c${id})">`;
  if (s.mask) out += `<ellipse cx="0" cy="10" rx="27" ry="24" fill="${s.mask}"/>`;
  if (s.marks) out += catMarks(s);
  if (s.muzzle) out += `<ellipse cx="-10" cy="21" rx="13" ry="10.5" fill="${s.muzzle}"/><ellipse cx="10" cy="21" rx="13" ry="10.5" fill="${s.muzzle}"/>`;
  out += '<ellipse cx="-20" cy="-30" rx="17" ry="8" fill="#fff" opacity=".2" transform="rotate(-28 -20 -30)"/></g>';
  if (!s.dark && !s.mask) out += '<circle cx="-32" cy="15" r="6.5" fill="#ff7a90" opacity=".35"/><circle cx="32" cy="15" r="6.5" fill="#ff7a90" opacity=".35"/>';
  const lineOnFace = s.mask ? '#f1ece4' : line;
  out += eye(-19, -3, mood === 'angry' ? 'normal' : mood, s.iris, line, s.dark) + eye(19, -3, mood === 'angry' ? 'normal' : mood, s.iris, line, s.dark);
  if (mood === 'angry') out += brows(-12, line);
  out += '<path d="M-5.5 10h11l-5.5 6.5z" fill="#f2798f" stroke="#c9566c" stroke-width="1" stroke-linejoin="round"/>' +
    mouth(17, mood, lineOnFace) +
    `<path d="M-27 16-46 12M-27 21-45 24M27 16 46 12M27 21 45 24" stroke="${line}" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>`;
  return out;
}

function dog(s, mood, id) {
  const line = s.dark ? '#f1ece4' : INK;
  const edge = shade(s.fur, -0.38);
  const earEdge = shade(s.ear, -0.3);
  const darkSnout = s.snout === s.ear;
  let back = '';
  let front = '';
  if (s.pointy) {
    back += `<path d="M-46 -16-40 -74-10 -44ZM46 -16 40 -74 10 -44Z" fill="${s.ear}" stroke="${earEdge}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M-38 -32-36 -59-21 -43ZM38 -32 36 -59 21 -43Z" fill="${shade(s.ear, 0.35)}"/>`;
  } else {
    const ry = s.long ? 37 : 30;
    front = [-1, 1].map((k) =>
      `<ellipse cx="${k * 45}" cy="${ry - 34}" rx="14.5" ry="${ry}" fill="${s.ear}" stroke="${earEdge}" stroke-width="2.6" transform="rotate(${k * 16} ${k * 40} -34)"/>`).join('');
  }
  if (s.ruff) {
    back += `<path d="M-44 10-66 14-52 24-64 36-40 38ZM44 10 66 14 52 24 64 36 40 38Z" fill="${s.fur}" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  let out = `${back}<circle r="${HEAD_R}" fill="url(#f${id})" stroke="${edge}" stroke-width="3"/><g clip-path="url(#c${id})">`;
  if (s.saddle) out += `<path d="M-50 -50h100v26q-50 -22-100 0z" fill="${s.saddle}"/>`;
  if (s.patch) out += `<path d="M0 -52c-30 0-52 20-52 50 16 8 38 0 42 -20 3 -14 5 -22 10 -30z" fill="${s.patch}"/>`;
  if (s.mask) out += `<path d="M-52 4q22 -14 40 -4 12 6 12 -52 0 58 12 52 18 -10 40 4v50h-104z" fill="${s.snout}"/>`;
  if (s.blaze) out += `<path d="M-7 -52h14l6 62h-26z" fill="${s.snout}"/>`;
  out += `<ellipse cx="0" cy="23" rx="25" ry="19" fill="${s.snout}"/>` +
    '<ellipse cx="-20" cy="-30" rx="17" ry="8" fill="#fff" opacity=".2" transform="rotate(-28 -20 -30)"/></g>';
  if (s.brows) out += `<circle cx="-19" cy="-22" r="4.6" fill="${s.brows}"/><circle cx="19" cy="-22" r="4.6" fill="${s.brows}"/>`;
  const eyeMood = mood === 'angry' ? 'normal' : mood;
  out += eye(-20, -7, eyeMood, s.iris, line, s.dark) + eye(20, -7, eyeMood, s.iris, line, s.dark);
  if (mood === 'angry') out += brows(-17, line);
  const snoutLine = darkSnout ? '#f1ece4' : INK;
  out += `<ellipse cx="0" cy="12" rx="9.5" ry="7" fill="${INK}"/><ellipse cx="-3" cy="9.6" rx="3.2" ry="1.8" fill="#fff" opacity=".6"/>` +
    `<path d="M0 19v4" stroke="${snoutLine}" stroke-width="2.4" stroke-linecap="round"/>` +
    mouth(23, mood, snoutLine, s.tongue) + front;
  return out;
}

/**
 * SVG de um bicho. `mood`: 'normal', 'blink', 'happy', 'scared' ou 'angry'.
 */
export function animalSVG(kind, level, mood = 'normal') {
  const s = (kind === 'cat' ? CATS : DOGS)[level - 1];
  const id = `${kind}${level}`;
  const defs = `<defs><radialGradient id="f${id}" cx=".36" cy=".3" r=".8">` +
    `<stop offset="0" stop-color="${shade(s.fur, 0.22)}"/><stop offset=".6" stop-color="${s.fur}"/><stop offset="1" stop-color="${shade(s.fur, -0.2)}"/>` +
    `</radialGradient><clipPath id="c${id}"><circle r="${HEAD_R - 1.5}"/></clipPath></defs>`;
  const body = kind === 'cat' ? cat(s, mood, id) : dog(s, mood, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-75 -78 150 150" aria-hidden="true">${defs}${body}</svg>`;
}

export const furColor = (kind, level) => (kind === 'cat' ? CATS : DOGS)[level - 1].fur;

// Fundo dos selos (álbum, "próximo"): gatos em tons quentes, cachorros em tons frios.
export function tileColor(kind, level) {
  const i = level - 1;
  return kind === 'cat'
    ? `hsl(${48 - i * 5} 92% ${86 - i * 3}%)`
    : `hsl(${188 + i * 8} 75% ${86 - i * 3.5}%)`;
}
