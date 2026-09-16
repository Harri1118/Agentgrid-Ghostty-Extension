# Extension → AgentGrid Theme Transfer Flow

How terminal themes and configs flow from an extension into the AgentGrid window.

## Architecture

```
Extension (sandboxed)          AgentGrid Host              Renderer
─────────────────────          ──────────────              ────────

activate(context)
  │
  ├─ context.agentgrid.fs      ← bridge →  node:fs (read-only)
  │  .readFile(configPath)
  │
  ├─ parseGhosttyConfig(raw)
  │  extractTerminalTheme()
  │
  ├─ context.agentgrid
  │  .settings.update(
  │    'ghostty.terminalTheme', ─→ settings store ─→ IPC
  │    theme)                     (scoped to ext)    handler
  │                                                   │
  ├─ context.agentgrid                                │
  │  .settings.update(                                │
  │    'ghostty.terminalConfig', ─→ settings store    │
  │    config)                                        │
  │                                                   │
  └─ registerTerminalEngine(     ─→ engine registry   │
       { id: 'ghostty' })                             │
                                                      ▼
                                  plugins:getTerminalEngineConfig
                                    │
                                    ├─ reads settings.terminalEngine
                                    │  (user picks 'ghostty' in Settings)
                                    │
                                    ├─ reads settings['{engineId}.terminalTheme']
                                    ├─ reads settings['{engineId}.terminalConfig']
                                    │
                                    └─→ { theme, config }
                                                      │
                                                      ▼
                                          applyTerminalEngineOverrides()
                                            ├─ terminal.options.theme = { ...base, ...theme }
                                            ├─ applyTerminalConfig(terminal, config)
                                            └─ applyTerminalBackground(container, config)
```

## Extension Rules

### 1. No Node builtins — use API primitives

Extensions run in a sandboxed VM context. `require()` is blocked. Use these instead:

| Need              | Old (blocked)                    | New (API primitive)                     |
|-------------------|----------------------------------|-----------------------------------------|
| Read a file       | `fs.readFileSync(p, 'utf-8')`   | `context.agentgrid.fs.readFile(p)`      |
| Read binary file  | `fs.readFileSync(p)`            | `context.agentgrid.fs.readFileBase64(p)`|
| Check file exists | `fs.existsSync(p)`              | `context.agentgrid.fs.exists(p)`        |
| List directory    | `fs.readdirSync(p)`             | `context.agentgrid.fs.readdir(p)`       |
| File metadata     | `fs.statSync(p)`                | `context.agentgrid.fs.stat(p)`          |
| Join paths        | `path.join(a, b)`               | `context.agentgrid.path.join(a, b)`     |
| Path operations   | `path.dirname/basename/extname`  | `context.agentgrid.path.*`              |
| Home directory    | `os.homedir()`                  | `context.agentgrid.env.homedir()`       |
| Env variable      | `process.env.XDG_CONFIG_HOME`   | `context.agentgrid.env.get('XDG_...')`  |
| Platform          | `process.platform`              | `context.agentgrid.env.platform()`      |

### 2. Filesystem is read-only

The `fs` namespace exposes only read operations. Extensions cannot write, delete, or
create files on the host filesystem. Persistent storage goes through:
- `context.globalState` — survives across sessions, scoped to the extension
- `context.workspaceState` — scoped to the current workspace
- `context.agentgrid.settings` — visible to the host settings store

### 3. Theme transfer: settings key convention

Terminal engine extensions write their theme and config to **settings** using this convention:

```
settings.update('{engineId}.terminalTheme', themeObject)
settings.update('{engineId}.terminalConfig', configObject)
```

Where `engineId` matches the `id` passed to `registerTerminalEngine()`.

The host reads these keys when the user selects the engine in Settings → Terminal → Engine.

### 4. Theme object shape (terminalTheme)

The theme object maps directly to xterm.js `ITheme` keys:

```typescript
{
  background: string      // terminal background color
  foreground: string      // default text color
  cursor: string          // cursor color
  cursorAccent: string    // cursor text color
  selectionBackground: string
  selectionForeground: string
  black: string           // ANSI color 0
  red: string             // ANSI color 1
  green: string           // ANSI color 2
  yellow: string          // ANSI color 3
  blue: string            // ANSI color 4
  magenta: string         // ANSI color 5
  cyan: string            // ANSI color 6
  white: string           // ANSI color 7
  brightBlack: string     // ANSI color 8
  brightRed: string       // ANSI color 9
  brightGreen: string     // ANSI color 10
  brightYellow: string    // ANSI color 11
  brightBlue: string      // ANSI color 12
  brightMagenta: string   // ANSI color 13
  brightCyan: string      // ANSI color 14
  brightWhite: string     // ANSI color 15
}
```

### 5. Config object shape (terminalConfig)

```typescript
{
  fontFamily?: string
  fontSize?: number
  cursorStyle?: 'block' | 'bar' | 'underline'
  cursorBlink?: boolean
  scrollback?: number
  boldIsBright?: boolean
  minimumContrast?: number
  lineHeight?: number
  letterSpacing?: number
  backgroundImageDataUrl?: string   // data: URI for background image
  backgroundOpacity?: number        // 0–1
  backgroundBlurRadius?: number
}
```

### 6. Activation sequence

1. Extension `activate()` is called with `ExtensionContext`
2. Extension registers its terminal engine via `api.terminalEngines.registerTerminalEngine()`
3. Extension reads external config files via `api.fs.readFile()`, `api.env.homedir()`, etc.
4. Extension parses config and writes results to `api.settings.update()`
5. If the user has selected this engine in Settings, the renderer picks up the theme on next terminal mount or engine-change event

### 7. Build configuration

Extensions must bundle as CJS with no external Node builtins:

```javascript
// build.mjs
await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'dist/extension.js',
  external: [],  // no externals — everything is bundled or provided by the API
})
```
