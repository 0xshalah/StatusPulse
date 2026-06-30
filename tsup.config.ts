import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['worker/index.ts'],
  outDir: 'dist/worker',
  format: ['esm'],
  target: 'node20',
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  external: ['@prisma/client', 'ioredis', 'bullmq'],
})
