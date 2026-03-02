import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;

const SRC_DIR = path.join(process.cwd(), 'src');
const SOURCE_MESSAGES_FILE = path.join(process.cwd(), 'messages', 'sk.json');
const TS_FILE_EXTENSIONS = new Set(['.ts', '.tsx']);

function isPlainObject(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function flattenTranslationKeys(input: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>();

  if (!isPlainObject(input)) {
    return keys;
  }

  for (const [rawKey, value] of Object.entries(input)) {
    const keyPath = prefix ? `${prefix}.${rawKey}` : rawKey;
    if (isPlainObject(value)) {
      const nested = flattenTranslationKeys(value, keyPath);
      if (nested.size === 0) {
        keys.add(keyPath);
      } else {
        nested.forEach((k) => keys.add(k));
      }
      continue;
    }
    keys.add(keyPath);
  }

  return keys;
}

function collectSourceFiles(directory: string, out: string[] = []): string[] {
  const entries = readdirSync(directory);

  for (const entry of entries) {
    if (entry === 'node_modules') continue;

    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectSourceFiles(fullPath, out);
      continue;
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (TS_FILE_EXTENSIONS.has(ext)) {
      out.push(fullPath);
    }
  }

  return out;
}

function extractTranslationKeysFromCode(content: string): string[] {
  // Matches:
  // t("...")
  // t('...')
  // and ignores:
  // t(variable), t(`template`), dynamic expressions
  const regex = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*[\),]/g;
  const found: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const key = match[2].trim();
    if (!key) continue;
    found.push(key);
  }

  return found;
}

function main(): void {
  const skRaw = readFileSync(SOURCE_MESSAGES_FILE, 'utf8');
  const skJson = JSON.parse(skRaw) as unknown;
  const validKeys = flattenTranslationKeys(skJson);

  const files = collectSourceFiles(SRC_DIR);
  const usedKeys = new Set<string>();
  const missingKeyToFiles = new Map<string, Set<string>>();

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    const extracted = extractTranslationKeysFromCode(content);

    if (extracted.length === 0) continue;

    for (const key of extracted) {
      usedKeys.add(key);
      if (validKeys.has(key)) continue;

      const relativeFile = path.relative(process.cwd(), filePath);
      const refs = missingKeyToFiles.get(key) ?? new Set<string>();
      refs.add(relativeFile);
      missingKeyToFiles.set(key, refs);
    }
  }

  const missingKeys = Array.from(missingKeyToFiles.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  if (missingKeys.length > 0) {
    console.log('Missing translation keys used in code (not found in messages/sk.json):');
    for (const key of missingKeys) {
      const refs = Array.from(missingKeyToFiles.get(key) ?? []).sort((a, b) =>
        a.localeCompare(b)
      );
      console.log(`- ${key}`);
      for (const ref of refs) {
        console.log(`  - ${ref}`);
      }
    }
  }

  console.log('');
  console.log('Summary');
  console.log(`- Total files scanned: ${files.length}`);
  console.log(`- Total used keys (unique): ${usedKeys.size}`);
  console.log(`- Missing keys: ${missingKeys.length}`);

  if (missingKeys.length > 0) {
    process.exit(1);
  }

  console.log('All translation keys are valid.');
}

main();
