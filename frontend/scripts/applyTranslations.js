/**
 * Apply translations from findUntranslated.json using a per-locale translation map.
 * Reads translations/{locale}.json (key -> translated value) and applies to messages/{locale}.json
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const TRANSLATIONS_DIR = path.join(__dirname, 'translations');
const UNTRANSLATED_PATH = path.join(__dirname, 'findUntranslated.json');

function flatten(obj, prefix = '') {
  const out = {};
  for (const key of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val, p));
    } else {
      out[p] = val;
    }
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const pathStr of Object.keys(flat)) {
    const parts = pathStr.split('.');
    let current = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = flat[pathStr];
  }
  return out;
}

function loadJson(dir, name) {
  const file = path.join(dir, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(dir, name, obj) {
  const file = path.join(dir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const untranslated = JSON.parse(fs.readFileSync(UNTRANSLATED_PATH, 'utf8'));
const locales = Object.keys(untranslated);

if (!fs.existsSync(TRANSLATIONS_DIR)) {
  console.log('Creating translations/ and copying findUntranslated keys as template.');
  fs.mkdirSync(TRANSLATIONS_DIR, { recursive: true });
  for (const locale of locales) {
    saveJson(TRANSLATIONS_DIR, locale, untranslated[locale]);
  }
  console.log('Edit translations/en.json (and others) with translated values, then run this script again.');
  process.exit(0);
}

for (const locale of locales) {
  const translations = loadJson(TRANSLATIONS_DIR, locale);
  if (!translations) {
    console.log(`${locale}: no translations/${locale}.json, skipping.`);
    continue;
  }
  const data = loadJson(MESSAGES_DIR, locale);
  if (!data) {
    console.log(`${locale}: no messages/${locale}.json, skipping.`);
    continue;
  }
  const flat = flatten(data);
  const toApply = untranslated[locale];
  let applied = 0;
  for (const key of Object.keys(toApply)) {
    if (translations[key] !== undefined && translations[key] !== toApply[key]) {
      flat[key] = translations[key];
      applied++;
    }
  }
  const out = unflatten(flat);
  saveJson(MESSAGES_DIR, locale, out);
  console.log(`${locale}: applied ${applied} translation(s).`);
}
console.log('Done.');
