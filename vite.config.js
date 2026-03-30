import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const stampServiceWorker = () => ({
  name: 'stamp-sw',
  writeBundle() {
    const swPath = resolve(__dirname, 'dist/sw.js');
    try {
      let sw = readFileSync(swPath, 'utf8');
      sw = sw.replace('__BUILD_TIME__', Date.now().toString());
      writeFileSync(swPath, sw);
    } catch(e) {
      console.warn('Could not stamp sw.js:', e.message);
    }
  },
});

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
});
