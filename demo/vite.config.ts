import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.DEMO_BASE || (mode === 'production' ? '/demo/' : '/');

  return {
    base,
    plugins: [react()],
  };
});
