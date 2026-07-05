import fs from 'fs';
import path from 'path';

async function sync() {
  const url = 'https://gitshell.belki10.poke.site/export.json';
  console.log(`Fetching code from ${url}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch export.json: ${response.statusText}`);
    }

    const data = await response.json();
    // Assuming export.json is { "files": { "path/to/file": "content" } } 
    // or { "path/to/file": "content" }
    const files = data.files || data;

    for (const [filePath, content] of Object.entries(files)) {
      // Security/Safety checks:
      // 1. Don't overwrite the sync script or workflow
      if (filePath.startsWith('.github/') || filePath === 'scripts/sync-from-poke.js') {
        console.log(`Skipping protected file: ${filePath}`);
        continue;
      }
      
      // 2. Basic path traversal prevention
      if (filePath.includes('..')) {
        console.log(`Skipping suspicious path: ${filePath}`);
        continue;
      }

      const absolutePath = path.resolve(process.cwd(), filePath);
      const dir = path.dirname(absolutePath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      console.log(`Writing ${filePath}...`);
      fs.writeFileSync(absolutePath, content);
    }

    console.log('Sync complete!');
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

sync();
