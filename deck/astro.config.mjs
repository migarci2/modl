import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'static',
  // Base path for GitHub Pages (set via CLI: --base=/modl/deck/)
  base: process.env.ASTRO_BASE || '/',
});
