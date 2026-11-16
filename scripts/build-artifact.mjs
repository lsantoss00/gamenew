// Gera a versão do index.html usada para publicar o jogo como Artifact do Claude
// (lá a página não pode ter <html>/<head>/<body> próprios).
// Uso: node scripts/build-artifact.mjs <arquivo-de-saida>
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2];
if (!out) throw new Error('informe o arquivo de saída');

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pick = (re) => {
  const m = html.match(re);
  if (!m) throw new Error(`index.html não tem ${re}`);
  return m[0];
};
const body = html.split('<!-- app -->')[1]?.split('<!-- /app -->')[0];
if (!body) throw new Error('index.html sem os marcadores <!-- app -->');

writeFileSync(out, [
  pick(/<title>.*?<\/title>/),
  '<meta name="claude:viewport-fit-sides" content="cover">',
  ...html.match(/<link rel="stylesheet"[^>]*>/g),
  body.trim(),
  '',
].join('\n'));
