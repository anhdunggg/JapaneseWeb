import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('motion')) return 'vendor-motion';
          if (id.includes('@radix-ui') || id.includes('sonner')) return 'vendor-ui';
          if (id.includes('react') || id.includes('react-router-dom')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
});
