// Desenho dos bichos em SVG, gerado por código (sem arquivos de imagem).

const CATS = [
  { fur: '#fbe3bd', ear: '#f3c98f' },
  { fur: '#f6a94f', ear: '#e08a2c' },
  { fur: '#b08a6a', ear: '#8f6b4e', marks: 'stripes', mark: '#6f5038' },
  { fur: '#f1e6d6', ear: '#6a4b3c', mask: '#8a6a58' },
  { fur: '#c9ccd6', ear: '#a9adba', fluffy: true },
  { fur: '#c8a271', ear: '#a17f52', marks: 'spots', mark: '#86663f', tufts: true },
  { fur: '#e3b659', ear: '#c2943c', marks: 'spots', mark: '#5a3d1e' },
  { fur: '#eeb23c', ear: '#c98f22', marks: 'spots', mark: '#3a2a18' },
  { fur: '#f28a22', ear: '#d06f12', marks: 'stripes', mark: '#2b1c12' },
  { fur: '#eeb95a', ear: '#d79c3c', mane: '#a45c1b' },
];

const DOGS = [
  { fur: '#f2d8b3', ear: '#d9b384', snout: '#fff3e0', tongue: true },
  { fur: '#d39a55', ear: '#b57c3c', snout: '#f0cf9f', tongue: true },
  { fur: '#8c5a3a', ear: '#6e4329', snout: '#a8714b', long: true },
  { fur: '#f5ead8', ear: '#9a623a', snout: '#ffffff', patch: '#9a623a' },
  { fur: '#34343e', ear: '#24242c', snout: '#ffffff', blaze: true },
  { fur: '#8f9db0', ear: '#6f7d90', snout: '#ffffff', blaze: true, pointy: true, eye: '#3f9ddb' },
  { fur: '#c08a4c', ear: '#4a3526', snout: '#4a3526', pointy: true },
  { fur: '#2d2928', ear: '#1f1c1b', snout: '#b9763e', pointy: true },
  { fur: '#c4672f', ear: '#8f4520', snout: '#ffffff', blaze: true, long: true },
  { fur: '#7b8592', ear: '#5c6570', snout: '#e8ecf0', blaze: true, pointy: true, eye: '#e0a800' },
];

const INK = '#1e1a18';

function eyes(y, iris = INK) {
  return [36, 64].map((x) =>
    `<circle cx="${x}" cy="${y}" r="6.4" fill="#fff"/>` +
    `<circle cx="${x}" cy="${y}" r="4.4" fill="${iris}"/>` +
    (iris === INK ? '' : `<circle cx="${x}" cy="${y}" r="2.2" fill="${INK}"/>`) +
    `<circle cx="${x + 1.6}" cy="${y - 1.6}" r="1.4" fill="#fff"/>`).join('');
}

function catMarks(s) {
  if (s.marks === 'stripes') {
    return `<g fill="none" stroke="${s.mark}" stroke-width="4" stroke-linecap="round">` +
      '<path d="M50 27v10M40 29l2 8M60 29l-2 8M16 56h9M17 65h8M84 56h-9M83 65h-8"/></g>';
  }
  if (s.marks === 'spots') {
    const dots = [[38, 32], [50, 29], [62, 32], [22, 52], [78, 52], [26, 68], [74, 68], [44, 38], [56, 38]];
    return `<g fill="${s.mark}">${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8"/>`).join('')}</g>`;
  }
  return '';
}

function cat(s) {
  const ears = s.mane
    ? `<circle cx="24" cy="30" r="10" fill="${s.ear}"/><circle cx="76" cy="30" r="10" fill="${s.ear}"/>`
    : `<path d="M15 44 21 9 47 28ZM85 44 79 9 53 28Z" fill="${s.ear}" stroke="${s.ear}" stroke-width="3" stroke-linejoin="round"/>` +
      '<path d="M22 36 25 19 37 29ZM78 36 75 19 63 29Z" fill="#f7a8b8"/>';
  return (
    (s.mane ? `<circle cx="50" cy="54" r="45" fill="${s.mane}"/>` : '') +
    (s.fluffy ? `<path d="M10 62l-7 5 9 2-5 8 12-3M90 62l7 5-9 2 5 8-12-3" fill="${s.fur}" stroke="${s.fur}" stroke-width="3" stroke-linejoin="round"/>` : '') +
    ears +
    (s.tufts ? `<path d="M21 9 17 0M79 9 83 0" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` : '') +
    `<ellipse cx="50" cy="57" rx="${s.mane ? 31 : 37}" ry="${s.mane ? 29 : 32}" fill="${s.fur}"/>` +
    (s.mask ? `<ellipse cx="50" cy="63" rx="19" ry="16" fill="${s.mask}"/>` : '') +
    catMarks(s) +
    eyes(54, s.mask ? '#3f9ddb' : INK) +
    '<path d="M46 63h8l-4 5z" fill="#e8798f"/>' +
    `<path d="M50 68q-5 6-10 2M50 68q5 6 10 2" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M29 66 14 63M29 70 15 73M71 66 86 63M71 70 85 73" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`
  );
}

function dog(s) {
  const ears = s.pointy
    ? `<path d="M18 46 22 8 46 28ZM82 46 78 8 54 28Z" fill="${s.ear}" stroke="${s.ear}" stroke-width="3" stroke-linejoin="round"/>`
    : `<ellipse cx="17" cy="${s.long ? 56 : 50}" rx="12" ry="${s.long ? 27 : 22}" fill="${s.ear}" transform="rotate(12 17 50)"/>` +
      `<ellipse cx="83" cy="${s.long ? 56 : 50}" rx="12" ry="${s.long ? 27 : 22}" fill="${s.ear}" transform="rotate(-12 83 50)"/>`;
  return (
    ears +
    `<ellipse cx="50" cy="54" rx="33" ry="33" fill="${s.fur}"/>` +
    (s.patch ? `<path d="M50 22c-18 0-31 12-33 30 12 4 24-2 26-14 2-8 4-13 7-16z" fill="${s.patch}"/>` : '') +
    (s.blaze ? `<path d="M44 22h12l3 34H41z" fill="${s.snout}"/>` : '') +
    `<ellipse cx="50" cy="69" rx="18" ry="14" fill="${s.snout}"/>` +
    eyes(47, s.eye ?? INK) +
    (s.tongue ? '<path d="M45 73h10v6a5 5 0 0 1-10 0z" fill="#f0788c"/>' : '') +
    `<ellipse cx="50" cy="63" rx="6.5" ry="4.8" fill="${INK}"/>` +
    `<path d="M50 68v5M50 73q-5 4-9 1M50 73q5 4 9 1" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
  );
}

export function animalSVG(kind, level) {
  const spec = (kind === 'cat' ? CATS : DOGS)[level - 1];
  const body = kind === 'cat' ? cat(spec) : dog(spec);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
}

// Gatos em tons quentes, cachorros em tons frios: dá para separar de relance.
export function tileColor(kind, level) {
  const i = level - 1;
  return kind === 'cat'
    ? `hsl(${48 - i * 5} 92% ${86 - i * 3}%)`
    : `hsl(${188 + i * 8} 75% ${86 - i * 3.5}%)`;
}
