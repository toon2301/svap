import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = Record<string, JsonValue>;

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const SOURCE_FILE = path.join(MESSAGES_DIR, 'sk.json');
const TARGET_LOCALES = ['en', 'de', 'cs', 'hu', 'pl'] as const;

function isPlainObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function joinPath(parent: string, key: string): string {
  return parent ? `${parent}.${key}` : key;
}

interface SyncResult {
  synced: JsonObject;
  added: string[];
  removed: string[];
}

function collectAllLeafPaths(input: JsonValue, prefix = ''): string[] {
  if (!isPlainObject(input)) {
    return prefix ? [prefix] : [];
  }

  const out: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    const nextPath = joinPath(prefix, key);
    const nested = collectAllLeafPaths(value, nextPath);
    if (nested.length === 0) {
      out.push(nextPath);
    } else {
      out.push(...nested);
    }
  }
  return out;
}

function syncNode(source: JsonValue, target: JsonValue, currentPath = ''): SyncResult {
  // If source is not an object, this is a leaf translation value.
  if (!isPlainObject(source)) {
    if (target === undefined) {
      return {
        synced: source as unknown as JsonObject,
        added: currentPath ? [currentPath] : [],
        removed: [],
      };
    }
    if (isPlainObject(target)) {
      // Type mismatch: source leaf, target object -> remove nested target keys.
      return {
        synced: target as unknown as JsonObject, // overwritten below by caller leaf handling
        added: [],
        removed: collectAllLeafPaths(target, currentPath),
      };
    }
    // Keep existing translation value (do not overwrite existing translations).
    return {
      synced: target as unknown as JsonObject,
      added: [],
      removed: [],
    };
  }

  const targetObj = isPlainObject(target) ? target : {};
  const output: JsonObject = {};
  const added: string[] = [];
  const removed: string[] = [];

  // Keep order according to source file (sk.json)
  for (const [key, sourceValue] of Object.entries(source)) {
    const nextPath = joinPath(currentPath, key);
    const targetValue = targetObj[key];

    if (isPlainObject(sourceValue)) {
      const child = syncNode(sourceValue, targetValue, nextPath);
      output[key] = child.synced;
      added.push(...child.added);
      removed.push(...child.removed);
      continue;
    }

    if (targetValue === undefined) {
      output[key] = sourceValue; // fallback to sk text for missing key
      added.push(nextPath);
      continue;
    }

    if (isPlainObject(targetValue)) {
      // Type mismatch: target object where source expects leaf.
      removed.push(...collectAllLeafPaths(targetValue, nextPath));
      output[key] = sourceValue; // fallback to source for corrected shape
      added.push(nextPath);
      continue;
    }

    // Existing translation value is kept unchanged.
    output[key] = targetValue;
  }

  // Remove keys that do not exist in source.
  for (const [key, targetValue] of Object.entries(targetObj)) {
    if (Object.prototype.hasOwnProperty.call(source, key)) continue;
    removed.push(...collectAllLeafPaths(targetValue, joinPath(currentPath, key)));
  }

  return { synced: output, added, removed };
}

function readJson(filePath: string): JsonObject {
  return JSON.parse(readFileSync(filePath, 'utf8')) as JsonObject;
}

function writeJson(filePath: string, data: JsonObject): void {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function main(): void {
  const source = readJson(SOURCE_FILE);
  let totalAdded = 0;
  let totalRemoved = 0;

  console.log(`Source of truth: ${path.basename(SOURCE_FILE)}`);
  console.log('');

  for (const locale of TARGET_LOCALES) {
    const targetFile = path.join(MESSAGES_DIR, `${locale}.json`);
    const target = readJson(targetFile);
    const result = syncNode(source, target);

    writeJson(targetFile, result.synced);

    totalAdded += result.added.length;
    totalRemoved += result.removed.length;

    console.log(`[${locale}.json]`);
    if (result.added.length === 0) {
      console.log('Added keys: none');
    } else {
      console.log('Added keys:');
      result.added.sort((a, b) => a.localeCompare(b)).forEach((k) => console.log(`  + ${k}`));
    }

    if (result.removed.length === 0) {
      console.log('Removed keys: none');
    } else {
      console.log('Removed keys:');
      result.removed
        .sort((a, b) => a.localeCompare(b))
        .forEach((k) => console.log(`  - ${k}`));
    }
    console.log('');
  }

  console.log('Summary');
  console.log(`Added keys: ${totalAdded}`);
  console.log(`Removed keys: ${totalRemoved}`);
}

main();
