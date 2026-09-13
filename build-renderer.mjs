import { build } from 'esbuild'

await build({
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
})

console.log('renderer.js built')
