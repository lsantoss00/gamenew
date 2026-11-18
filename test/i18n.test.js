// Garante que todo texto do jogo tem tradução para inglês e espanhol.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DICT } from '../js/i18n-dict.js';
import { _, setLang, animalName, fmt } from '../js/i18n.js';
import { SCENES, ACCESSORIES, POWERS, TROPHIES, STAT_NAMES } from '../js/meta.js';
import { SPECIAL_NAMES } from '../js/game.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Os textos passados direto para _('...') no código.
function templatesInCode() {
  const found = new Set();
  for (const file of readdirSync(new URL('../js/', import.meta.url))) {
    if (file.startsWith('i18n')) continue;
    for (const [, text] of read(`../js/${file}`).matchAll(/\b_\(\s*'((?:[^'\\]|\\.)*)'/g)) found.add(text.replace(/\\'/g, "'"));
  }
  return found;
}

// Os textos que ficam no HTML (texto visível e atributos de leitura de tela).
function textsInHtml() {
  const html = read('../index.html').split('<!-- app -->')[1].split('<!-- /app -->')[0]
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
  const found = new Set();
  for (const [, text] of html.matchAll(/>([^<>]+)</g)) {
    const t = text.trim();
    if (/[A-Za-zÀ-ú]{2,}/.test(t) && !['Miau', 'Au', '&amp;'].includes(t)) found.add(t);
  }
  for (const [, , text] of html.matchAll(/\b(aria-label|title|alt)="([^"]+)"/g)) found.add(text);
  return found;
}

const everything = () => new Set([
  ...templatesInCode(), ...textsInHtml(),
  ...SCENES.map((x) => x.name), ...ACCESSORIES.map((x) => x.name), ...POWERS.map((x) => x.name), 'Sem acessório',
  ...TROPHIES.flatMap((x) => [x.name, x.text]), ...Object.values(STAT_NAMES), ...Object.values(SPECIAL_NAMES),
  'Clássico', 'Zen', 'Contra o tempo', 'Desafio do dia', 'Fase',
]);

test('todo texto do jogo tem tradução para inglês e espanhol', () => {
  const missing = [...everything()].filter((t) => !DICT[t]);
  assert.deepEqual(missing, []);
});

test('as traduções mantêm as mesmas variáveis do português', () => {
  for (const [pt, [en, es]] of Object.entries(DICT)) {
    const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    assert.ok(en && es, `tradução vazia: ${pt}`);
    assert.equal(vars(en), vars(pt), `inglês: ${pt}`);
    assert.equal(vars(es), vars(pt), `espanhol: ${pt}`);
  }
});

test('nada sobrando no dicionário que o jogo não use', () => {
  const used = everything();
  assert.deepEqual(Object.keys(DICT).filter((k) => !used.has(k)), []);
});

test('troca de idioma: textos, nomes e números', () => {
  try {
    setLang('en');
    assert.equal(_('Recorde: {n} pontos', { n: '1,234' }), DICT['Recorde: {n} pontos'][0].replace('{n}', '1,234'));
    assert.equal(animalName('dog', 9), 'Saint Bernard');
    assert.equal(fmt(12345), '12,345');
    setLang('es');
    assert.equal(animalName('cat', 1), 'Gatito');
    assert.equal(fmt(12345), '12.345');
  } finally {
    setLang('pt');
  }
  assert.equal(_('Recorde: {n} pontos', { n: 3 }), 'Recorde: 3 pontos');
});
