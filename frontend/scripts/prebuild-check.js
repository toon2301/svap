const fs = require('fs');
const path = require('path');

// Files that must exist in the repo for CI builds
const requiredFiles = [
  path.join(__dirname, '..', 'src', 'lib', 'api.ts'),
];

for (const filePath of requiredFiles) {
  if (!fs.existsSync(filePath)) {
    console.error(`\n[PREBUILD ERROR] Missing required file: ${path.relative(path.join(__dirname, '..'), filePath)}`);
    console.error('This file must be committed to Git so CI/CD can build.');
    process.exit(1);
  }
}

console.log('[prebuild] Required files present.');


