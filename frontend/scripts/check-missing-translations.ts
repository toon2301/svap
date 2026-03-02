import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type JsonRecord = Record<string, unknown>;

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_LOCALE = 'sk';
const TARGET_LOCALES = ['en', 'de', 'cs', 'hu', 'pl'] as const;

function isPlainObject(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectNestedKeys(input: unknown, prefix = ''): Set<string> {
  const result = new Set<string>();
  if (!isPlainObject(input)) return result;

  for (const [key, value] of Object.entries(input)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      const childKeys = collectNestedKeys(value, nextPath);
      if (childKeys.size === 0) {
        result.add(nextPath);
      } else {
        childKeys.forEach((k) => result.add(k));
      }
      continue;
    }

    // Primitive / null / array values are treated as terminal translation keys.
    result.add(nextPath);
  }

  return result;
}

function readJsonFile(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function sorted(values: Iterable<string>): string[] {
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function printSection(title: string, keys: string[]): void {
  console.log(title);
  if (keys.length === 0) {
    console.log('  - none');
    return;
  }
  keys.forEach((k) => console.log(`  - ${k}`));
}

function main(): void {
  const sourceFile = path.join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
  if (!existsSync(sourceFile)) {
    console.error(`Source of truth not found: ${sourceFile}`);
    process.exit(1);
  }

  const sourceJson = readJsonFile(sourceFile);
  const sourceKeys = collectNestedKeys(sourceJson);

  if (sourceKeys.size === 0) {
    console.error(`No translation keys found in ${SOURCE_LOCALE}.json`);
    process.exit(1);
  }

  let totalMissing = 0;
  let totalExtra = 0;
  const summaryRows: Array<{ locale: string; file: string; missing: number; extra: number }> = [];

  console.log(`Source of truth: ${SOURCE_LOCALE}.json (${sourceKeys.size} keys)`);
  console.log('');

  for (const locale of TARGET_LOCALES) {
    const displayName = `${locale}.json`;
    const filePath = path.join(MESSAGES_DIR, displayName);
    if (!existsSync(filePath)) {
      console.error(`[${locale}] Missing locale file: ${displayName}`);
      summaryRows.push({ locale, file: displayName, missing: sourceKeys.size, extra: 0 });
      totalMissing += sourceKeys.size;
      continue;
    }

    const targetJson = readJsonFile(filePath);
    const targetKeys = collectNestedKeys(targetJson);

    const missingKeys = sorted([...sourceKeys].filter((k) => !targetKeys.has(k)));
    const extraKeys = sorted([...targetKeys].filter((k) => !sourceKeys.has(k)));

    totalMissing += missingKeys.length;
    totalExtra += extraKeys.length;
    summaryRows.push({
      locale,
      file: displayName,
      missing: missingKeys.length,
      extra: extraKeys.length,
    });

    console.log(`[${locale}] ${displayName}`);
    printSection('Missing keys:', missingKeys);
    printSection('Extra keys:', extraKeys);
    console.log('');
  }

  console.log('Summary');
  summaryRows.forEach((row) => {
    console.log(
      `  - ${row.locale} (${row.file}): missing=${row.missing}, extra=${row.extra}`
    );
  });
  console.log(`  - total missing: ${totalMissing}`);
  console.log(`  - total extra: ${totalExtra}`);

  if (totalMissing > 0) {
    process.exit(1);
  }
}

main();
