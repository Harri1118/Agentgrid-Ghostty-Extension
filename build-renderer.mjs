import { build } from 'esbuild'

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'dist/extension.js',
  external: [],
})

console.log('dist/extension.js built')

await build({
  entryPoints: ['src/renderer/index.tsx'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: 'dist/renderer.js',
  alias: {
    'react': './src/renderer/react-shim.ts',
  },
  external: [],
})

console.log('dist/renderer.js built')
