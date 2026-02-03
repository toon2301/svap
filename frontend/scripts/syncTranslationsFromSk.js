/**
 * Sync translation keys from sk.json to all other locale files.
 * Any key present in sk.json but missing in en/cs/de/hu/pl is added with the Slovak value as placeholder.
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const LOCALES = ['sk', 'en', 'cs', 'de', 'hu', 'pl'];
const SOURCE_LOCALE = 'sk';

function flatten(obj, prefix = '') {
  const out = {};
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val, path));
    } else {
      out[path] = val;
    }
  }
  return out;
}

function setNested(obj, pathStr, value) {
  const parts = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function loadJson(locale) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function saveJson(locale, obj) {
  const file = path.join(MESSAGES_DIR, `${locale}.json`);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const sk = loadJson(SOURCE_LOCALE);
const flatSk = flatten(sk);

for (const locale of LOCALES) {
  if (locale === SOURCE_LOCALE) continue;
  const data = loadJson(locale);
  const flatLocale = flatten(data);
  const missing = Object.keys(flatSk).filter((k) => !(k in flatLocale));
  if (missing.length === 0) {
    console.log(`${locale}.json: no missing keys.`);
    continue;
  }
  for (const key of missing) {
    setNested(data, key, flatSk[key]);
  }
  saveJson(locale, data);
  console.log(`${locale}.json: added ${missing.length} missing key(s).`);
}

console.log('Done.');
