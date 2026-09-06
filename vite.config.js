import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/dist/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/tidyline-ghana/**',
      ],
    },
  },
});
