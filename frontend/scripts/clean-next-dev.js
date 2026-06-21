const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');

if (!fs.existsSync(nextDir)) {
  console.log('[dev-clean] .next cache not found, skipping cleanup.');
  process.exit(0);
}

try {
  fs.rmSync(nextDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
  console.log('[dev-clean] Removed stale .next cache before starting dev server.');
} catch (error) {
  const preservedEntries = new Set(['types']);
  const failedEntries = [];

  try {
    for (const entry of fs.readdirSync(nextDir, { withFileTypes: true })) {
      if (preservedEntries.has(entry.name)) continue;

      const entryPath = path.join(nextDir, entry.name);
      try {
        fs.rmSync(entryPath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 200,
        });
      } catch (entryError) {
        failedEntries.push({ name: entry.name, error: entryError });
      }
    }
  } catch (readError) {
    console.error('[dev-clean] Failed to inspect .next cache after cleanup failed.', readError);
    process.exit(1);
  }

  if (failedEntries.length > 0) {
    console.error(
      '[dev-clean] Failed to remove stale .next build artifacts.',
      failedEntries.map((entry) => ({
        name: entry.name,
        code: entry.error?.code,
        message: entry.error?.message,
      })),
    );
    process.exit(1);
  }

  console.warn(
    '[dev-clean] Could not remove .next directory, cleaned build artifacts and kept .next/types.',
  );
}
