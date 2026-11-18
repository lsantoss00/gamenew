// Idiomas do jogo: português (o texto do código), inglês e espanhol.
// O texto em português é a própria chave: _('Recorde: {n} pontos', { n }) procura a tradução
// no dicionário e, em português ou sem tradução, usa o texto original.

import { NAMES } from './game.js';
import { DICT } from './i18n-dict.js';

export const LANGS = { pt: 'Português', en: 'English', es: 'Español' };
const LOCALES = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
let lang = 'pt';

// Idioma salvo nos ajustes, ou o do aparelho (português, espanhol; o resto em inglês).
export function detectLang(saved) {
  if (saved && LANGS[saved]) return saved;
  const device = (globalThis.navigator?.language ?? 'pt').toLowerCase();
  return device.startsWith('pt') ? 'pt' : device.startsWith('es') ? 'es' : 'en';
}

export function setLang(code) {
  lang = LANGS[code] ? code : 'pt';
}
export const getLang = () => lang;
export const locale = () => LOCALES[lang];
export const fmt = (n) => n.toLocaleString(LOCALES[lang]);

export function _(text, vars = {}) {
  const entry = lang === 'pt' ? null : DICT[text];
  const out = entry ? entry[lang === 'en' ? 0 : 1] : text;
  return out.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? vars[key] : m));
}

// Nomes dos bichos (o filhote tem o mesmo nome em português para as duas espécies).
const ANIMAL_NAMES = {
  en: {
    cat: ['Kitten', 'Ginger', 'Tabby', 'Siamese', 'Persian', 'Lynx', 'Ocelot', 'Panther', 'Tiger', 'Lion'],
    dog: ['Puppy', 'Mutt', 'Dachshund', 'Beagle', 'Border Collie', 'Husky', 'Shepherd', 'Dobermann', 'Saint Bernard', 'Wolf'],
  },
  es: {
    cat: ['Gatito', 'Michi', 'Atigrado', 'Siamés', 'Persa', 'Lince', 'Ocelote', 'Pantera', 'Tigre', 'León'],
    dog: ['Cachorrito', 'Canelo', 'Salchicha', 'Beagle', 'Border Collie', 'Husky', 'Pastor', 'Dóberman', 'San Bernardo', 'Lobo'],
  },
};
export const animalName = (kind, level) => (ANIMAL_NAMES[lang] ?? NAMES)[kind][level - 1];

// "Consiga um/uma ...": o gênero do nome muda com o idioma.
const FEMININE = { pt: ['Jaguatirica', 'Pantera'], es: ['Pantera'], en: [] };
export const isFeminine = (name) => FEMININE[lang].includes(name);

// Traduz o texto e os atributos de leitura de tela do HTML que já está na página.
export function translateDom(root) {
  if (lang === 'pt') return;
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    if (text && DICT[text]) node.nodeValue = node.nodeValue.replace(text, _(text));
  }
  for (const el of root.querySelectorAll('[aria-label], [title], [alt]')) {
    for (const attr of ['aria-label', 'title', 'alt']) {
      const value = el.getAttribute(attr);
      if (value && DICT[value]) el.setAttribute(attr, _(value));
    }
  }
}
