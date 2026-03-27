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
  console.error('[dev-clean] Failed to remove .next cache.', error);
  process.exit(1);
}
