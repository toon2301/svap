/**
 * Find keys in locale files that still have the Slovak value (need translation).
 * Outputs to findUntranslated.json: { "en": { "key.path": "sk value" }, ... }
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'messages');
const LOCALES = ['en', 'cs', 'de', 'hu', 'pl'];

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

const sk = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'sk.json'), 'utf8'));
const flatSk = flatten(sk);

const result = {};
for (const locale of LOCALES) {
  const data = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), 'utf8'));
  const flat = flatten(data);
  const untranslated = {};
  for (const k of Object.keys(flat)) {
    if (flatSk[k] !== undefined && flat[k] === flatSk[k]) {
      untranslated[k] = flatSk[k];
    }
  }
  result[locale] = untranslated;
}

const outPath = path.join(__dirname, 'findUntranslated.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Written', outPath);
const counts = Object.fromEntries(LOCALES.map(l => [l, Object.keys(result[l]).length]));
console.log('Counts:', counts);
