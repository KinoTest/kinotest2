import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  // Bundle the workspace package (it ships as TypeScript source)
  noExternal: ['@kinotest/shared'],
})
