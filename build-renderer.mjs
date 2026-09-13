import { build } from 'esbuild'

await Promise.all([
  build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['node:fs', 'node:path', 'node:os'],
  }),
  build({
    entryPoints: ['src/renderer/index.tsx'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: 'dist/renderer.js',
    external: ['react', 'react-dom'],
    jsx: 'automatic',
    jsxImportSource: 'react',
    inject: ['src/renderer/react-shim.ts'],
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  }),
])

console.log('extension.js + renderer.js built')
