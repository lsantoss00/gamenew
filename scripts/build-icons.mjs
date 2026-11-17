// Gera o desenho do ícone do app (icons/icon.svg) a partir dos bichos do jogo.
// Os PNGs em icons/ são fotos desse SVG nos tamanhos que as lojas e o celular pedem.
// Uso: node scripts/build-icons.mjs
import { writeFileSync } from 'node:fs';
import { animalSVG } from '../js/art.js';

// O desenho vai até a borda (o sistema recorta os cantos); os bichos ficam na área central segura.
const place = (svg, x, y, size) => svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset=".55" stop-color="#c9ecff"/><stop offset=".55" stop-color="#7ccf6f"/><stop offset="1" stop-color="#4fae4e"/></linearGradient></defs>
<rect width="512" height="512" fill="url(#bg)"/>
${place(animalSVG('cat', 2, 'happy'), 30, 92, 330)}
${place(animalSVG('dog', 4, 'happy'), 168, 122, 330)}
</svg>
`;
writeFileSync(new URL('../icons/icon.svg', import.meta.url), icon);
