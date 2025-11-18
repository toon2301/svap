/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'src', 'constants', 'skillsCategories');
const INDEX_TS = path.join(CATEGORIES_DIR, 'index.ts');
const MESSAGES_DIR = path.join(ROOT, 'messages');

function slugifyLabel(label) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function readFile(file) {
  return fs.readFileSync(file, 'utf8');
}

function parseImports(indexSource) {
  // import { IT_A_TECHNOLOGIE } from './it';
  const importRegex = /import\s*\{\s*([A-Z0-9_]+)\s*\}\s*from\s*'(.+?)';/g;
  const varToFile = {};
  let m;
  while ((m = importRegex.exec(indexSource)) !== null) {
    const varName = m[1];
    const rel = m[2];
    // resolve .ts file
    const abs = path.join(CATEGORIES_DIR, rel + '.ts');
    varToFile[varName] = abs;
  }
  return varToFile;
}

function parseCategoriesObject(indexSource) {
  // export const skillsCategories: Record<string, string[]> = { 'IT a technológie': IT_A_TECHNOLOGIE, ... };
  const start = indexSource.indexOf('export const skillsCategories');
  if (start === -1) throw new Error('skillsCategories not found');
  const braceStart = indexSource.indexOf('{', start);
  let depth = 0;
  let i = braceStart;
  for (; i < indexSource.length; i++) {
    const ch = indexSource[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const objectLiteral = indexSource.slice(braceStart + 1, i - 1);
  const lines = objectLiteral.split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (const line of lines) {
    // 'IT a technológie': IT_A_TECHNOLOGIE,
    const m = line.match(/^'([^']+)'\s*:\s*([A-Z0-9_]+)\s*,?$/);
    if (m) {
      entries.push({ label: m[1], varName: m[2] });
    }
  }
  return entries;
}

function parseArrayFile(filePath) {
  const src = readFile(filePath);
  // export const NAME: string[] = [ 'a', 'b', ... ];
  const arrRegex = /export\s+const\s+[A-Z0-9_]+\s*:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/m;
  const m = src.match(arrRegex);
  if (!m) return [];
  const inner = m[1];
  // Extract quoted strings
  const items = [];
  const strRegex = /'([^']*)'|"([^"]*)"/g;
  let sm;
  while ((sm = strRegex.exec(inner)) !== null) {
    const val = sm[1] !== undefined ? sm[1] : sm[2];
    if (val && val.trim()) items.push(val.trim());
  }
  return items;
}

function ensure(obj, pathArr) {
  let curr = obj;
  for (const key of pathArr) {
    if (typeof curr[key] !== 'object' || curr[key] === null) curr[key] = {};
    curr = curr[key];
  }
  return curr;
}

function main() {
  const indexSource = readFile(INDEX_TS);
  const importMap = parseImports(indexSource);
  const catEntries = parseCategoriesObject(indexSource);

  const catalog = {};
  for (const { label: categoryLabel, varName } of catEntries) {
    const filePath = importMap[varName];
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`Skipping category "${categoryLabel}" - file not found for ${varName}`);
      continue;
    }
    const items = parseArrayFile(filePath);
    const catSlug = slugifyLabel(categoryLabel);
    catalog[catSlug] = { label: categoryLabel, items };
  }

  // Update messages for all supported languages
  const langFiles = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
  for (const lf of langFiles) {
    const filePath = path.join(MESSAGES_DIR, lf);
    const json = JSON.parse(readFile(filePath));
    const base = ensure(json, ['skillsCatalog', 'subcategories']);
    for (const [catSlug, { items }] of Object.entries(catalog)) {
      const catObj = ensure(base, [catSlug]);
      for (const item of items) {
        const subSlug = slugifyLabel(item);
        if (!catObj.hasOwnProperty(subSlug)) {
          // Fill with original label as default translation
          catObj[subSlug] = item;
        }
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`Updated ${lf}`);
  }
  console.log('Done populating skills subcategory translations.');
}

main();


