import { parseGhosttyConfig, extractTerminalTheme } from './config-parser'
import { GHOSTTY_PRESETS } from './presets'
import type { GhosttyTerminalTheme, GhosttyTerminalConfig, GhosttyEngineResponse, GhosttyConfig } from './types'

type Disposable = { dispose(): void }

type Memento = {
  get<T>(key: string, defaultValue?: T): T | undefined
  update(key: string, value: unknown): void
  keys(): readonly string[]
}

type FileStat = {
  size: number
  isFile: boolean
  isDirectory: boolean
  isSymbolicLink: boolean
  mtimeMs: number
}

type FsNamespace = {
  readFile(filePath: string, encoding?: string): Promise<string>
  readFileBase64(filePath: string): Promise<string>
  exists(filePath: string): Promise<boolean>
  readdir(dirPath: string): Promise<string[]>
  stat(filePath: string): Promise<FileStat | null>
}

type PathNamespace = {
  join(...parts: string[]): string
  dirname(p: string): string
  basename(p: string, ext?: string): string
  extname(p: string): string
  resolve(...parts: string[]): string
}

type EnvNamespace = {
  homedir(): Promise<string>
  get(name: string): Promise<string | undefined>
  platform(): Promise<string>
}

type AgentGridApi = {
  commands: {
    registerCommand(id: string, handler: (...args: unknown[]) => unknown): Disposable
  }
  terminalEngines: {
    registerTerminalEngine(engine: { id: string; label: string; description?: string }): Disposable
  }
  settings: {
    get(key: string): unknown
    update(key: string, value: unknown): void
  }
  fs: FsNamespace
  path: PathNamespace
  env: EnvNamespace
}

type ExtensionContext = {
  subscriptions: Disposable[]
  extensionId: string
  globalState: Memento
  workspaceState: Memento
  agentgrid: AgentGridApi
}

export async function activate(context: ExtensionContext): Promise<void> {
  const api = context.agentgrid

  const terminalEngine = api.terminalEngines.registerTerminalEngine({
    id: 'ghostty',
    label: 'Ghostty',
    description: 'Ghostty terminal engine — loads your real Ghostty config',
  })

  context.subscriptions.push(terminalEngine)

  const applyThemeCmd = api.commands.registerCommand('ghostty.applyTerminalTheme', (...args: unknown[]) => {
    const presetId = (args[0] as string) || 'ghostty-default-dark'

    return applyPreset(api, context, presetId)
  })

  const importConfigCmd = api.commands.registerCommand('ghostty.importConfig', async () => {
    await loadRealGhosttyConfig(api, context)

    return { ok: true, imported: true }
  })

  const listPresetsCmd = api.commands.registerCommand('ghostty.listPresets', () => {
    return GHOSTTY_PRESETS.map((p) => ({ id: p.id, label: p.label }))
  })

  const getActivePresetCmd = api.commands.registerCommand('ghostty.getActivePreset', () => {
    return context.globalState.get<string>('activePreset') ?? null
  })

  const getTerminalThemeCmd = api.commands.registerCommand('ghostty.getTerminalTheme', (): GhosttyEngineResponse => {
    const theme = context.globalState.get<GhosttyTerminalTheme>('terminalTheme') ?? GHOSTTY_PRESETS[0]!.terminalTheme
    const config = context.globalState.get<GhosttyTerminalConfig>('terminalConfig') ?? {}

    return { theme, config }
  })

  context.subscriptions.push(applyThemeCmd, importConfigCmd, listPresetsCmd, getActivePresetCmd, getTerminalThemeCmd)

  await loadRealGhosttyConfig(api, context)

  console.log('[ghostty] extension activated')
}

export function deactivate(): void {
  console.log('[ghostty] extension deactivated')
}

async function loadRealGhosttyConfig(api: AgentGridApi, context: ExtensionContext): Promise<void> {
  const { fs, path } = api
  const home = await api.env.homedir()
  const basePreset = GHOSTTY_PRESETS[0]!
  let theme: GhosttyTerminalTheme = { ...basePreset.terminalTheme }
  const config: GhosttyTerminalConfig = {
    fontSize: basePreset.config.font_size,
    cursorStyle: basePreset.config.cursor_style,
    cursorBlink: basePreset.config.cursor_style_blink,
    scrollback: basePreset.config.scrollback_limit,
  }

  const ghosttyThemeFile = await resolveGhosttyThemeFile(fs)

  if (ghosttyThemeFile) {
    try {
      const raw = await fs.readFile(ghosttyThemeFile)
      const parsed = parseGhosttyConfig(raw)

      theme = { ...theme, ...extractTerminalTheme(parsed) }
      mergeConfigFields(config, parsed)
    } catch (err) {
      console.warn('[ghostty] failed to read default theme file:', err)
    }
  }

  const configPath = await resolveGhosttyConfigPath(fs, path, home)

  if (configPath && await fs.exists(configPath)) {
    try {
      const raw = await fs.readFile(configPath)
      const parsed = parseGhosttyConfig(raw)

      if (parsed.theme) {
        const namedThemePath = await resolveNamedTheme(parsed.theme, fs, path, home)

        if (namedThemePath) {
          try {
            const themeRaw = await fs.readFile(namedThemePath)
            const themeParsed = parseGhosttyConfig(themeRaw)

            theme = { ...theme, ...extractTerminalTheme(themeParsed) }
            mergeConfigFields(config, themeParsed)
          } catch {
            console.warn(`[ghostty] failed to read named theme: ${parsed.theme}`)
          }
        }
      }

      theme = { ...theme, ...extractTerminalTheme(parsed) }
      mergeConfigFields(config, parsed)
    } catch (err) {
      console.warn('[ghostty] failed to read user config:', err)
    }
  }

  const bgImage = await resolveBackgroundImage(fs, path, home)

  if (bgImage) {
    config.backgroundImageDataUrl = bgImage

    if (config.backgroundOpacity === undefined) {
      config.backgroundOpacity = 0.85
    }
  }

  context.globalState.update('activePreset', 'auto')
  context.globalState.update('terminalTheme', theme)
  context.globalState.update('terminalConfig', config)

  api.settings.update('ghostty.terminalTheme', theme)
  api.settings.update('ghostty.terminalConfig', config)
}

function mergeConfigFields(config: GhosttyTerminalConfig, parsed: GhosttyConfig): void {
  if (parsed.font_family) { config.fontFamily = parsed.font_family }
  if (parsed.font_family_bold) { config.fontFamilyBold = parsed.font_family_bold }
  if (parsed.font_family_italic) { config.fontFamilyItalic = parsed.font_family_italic }
  if (parsed.font_family_bold_italic) { config.fontFamilyBoldItalic = parsed.font_family_bold_italic }
  if (typeof parsed.font_size === 'number') { config.fontSize = parsed.font_size }
  if (typeof parsed.font_thicken === 'boolean') { config.fontThicken = parsed.font_thicken }
  if (parsed.cursor_style) { config.cursorStyle = parsed.cursor_style }
  if (typeof parsed.cursor_style_blink === 'boolean') { config.cursorBlink = parsed.cursor_style_blink }
  if (typeof parsed.cursor_opacity === 'number') { config.cursorOpacity = parsed.cursor_opacity }
  if (typeof parsed.background_opacity === 'number') { config.backgroundOpacity = parsed.background_opacity }
  if (typeof parsed.background_blur_radius === 'number') { config.backgroundBlurRadius = parsed.background_blur_radius }
  if (typeof parsed.bold_is_bright === 'boolean') { config.boldIsBright = parsed.bold_is_bright }
  if (typeof parsed.minimum_contrast === 'number') { config.minimumContrast = parsed.minimum_contrast }
  if (typeof parsed.window_padding_x === 'number') { config.paddingX = parsed.window_padding_x }
  if (typeof parsed.window_padding_y === 'number') { config.paddingY = parsed.window_padding_y }
  if (typeof parsed.scrollback_limit === 'number') { config.scrollback = parsed.scrollback_limit }
  if (typeof parsed.adjust_cell_width === 'number') { config.cellWidth = parsed.adjust_cell_width }
  if (typeof parsed.adjust_cell_height === 'number') { config.cellHeight = parsed.adjust_cell_height }
  if (typeof parsed.adjust_cursor_thickness === 'number') { config.cursorThickness = parsed.adjust_cursor_thickness }
}

function applyPreset(api: AgentGridApi, context: ExtensionContext, presetId: string): { ok: boolean; preset?: string; error?: string } {
  const preset = GHOSTTY_PRESETS.find((p) => p.id === presetId)

  if (!preset) {
    return { ok: false, error: `Unknown preset: ${presetId}` }
  }

  const config: GhosttyTerminalConfig = {
    fontSize: preset.config.font_size,
    cursorStyle: preset.config.cursor_style,
    cursorBlink: preset.config.cursor_style_blink,
    scrollback: preset.config.scrollback_limit,
    boldIsBright: preset.config.bold_is_bright,
  }

  context.globalState.update('activePreset', preset.id)
  context.globalState.update('terminalTheme', preset.terminalTheme)
  context.globalState.update('terminalConfig', config)

  api.settings.update('ghostty.terminalTheme', preset.terminalTheme)
  api.settings.update('ghostty.terminalConfig', config)

  return { ok: true, preset: preset.id }
}

async function resolveGhosttyConfigPath(fs: FsNamespace, path: PathNamespace, home: string): Promise<string | null> {
  const homeConfig = path.join(home, '.config', 'ghostty', 'config')

  if (await fs.exists(homeConfig)) { return homeConfig }

  return null
}

async function resolveGhosttyThemeFile(fs: FsNamespace): Promise<string | null> {
  const bundledPath = '/Applications/Ghostty.app/Contents/Resources/ghostty/themes/Ghostty Default Style Dark'

  if (await fs.exists(bundledPath)) { return bundledPath }

  return null
}

async function resolveBackgroundImage(fs: FsNamespace, path: PathNamespace, home: string): Promise<string | null> {
  const configDir = path.join(home, '.config', 'ghostty')
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

  try {
    const files = await fs.readdir(configDir)

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()

      if (!imageExtensions.includes(ext)) { continue }

      const filePath = path.join(configDir, file)
      const stat = await fs.stat(filePath)

      if (!stat || !stat.isFile || stat.size > 10 * 1024 * 1024) { continue }

      const data = await fs.readFileBase64(filePath)
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
      }
      const mime = mimeTypes[ext] ?? 'image/png'

      return `data:${mime};base64,${data}`
    }
  } catch {
    console.warn('[ghostty] failed to scan config dir for background images')
  }

  return null
}

async function resolveNamedTheme(themeName: string, fs: FsNamespace, path: PathNamespace, home: string): Promise<string | null> {
  const userThemeDir = path.join(home, '.config', 'ghostty', 'themes')
  const userPath = path.join(userThemeDir, themeName)

  if (await fs.exists(userPath)) { return userPath }

  const bundledPath = `/Applications/Ghostty.app/Contents/Resources/ghostty/themes/${themeName}`

  if (await fs.exists(bundledPath)) { return bundledPath }

  return null
}
