import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseGhosttyConfig, extractTerminalTheme } from './config-parser'
import { GHOSTTY_PRESETS } from './presets'
import type { GhosttyPreset, GhosttyTerminalTheme, GhosttyTerminalConfig, GhosttyEngineResponse, GhosttyConfig } from './types'

type ExtensionContext = {
  subscriptions: Array<{ dispose(): void }>
  extensionPath: string
  extensionId: string
  globalState: {
    get<T>(key: string, defaultValue?: T): T | undefined
    update(key: string, value: unknown): void
    keys(): readonly string[]
  }
  storagePath: string
}

type AgentGridApi = {
  commands: {
    registerCommand(id: string, handler: (...args: unknown[]) => unknown): { dispose(): void }
    executeCommand(id: string, ...args: unknown[]): Promise<unknown>
  }
  terminalEngines: {
    registerTerminalEngine(engine: { id: string; label: string; description?: string }): { dispose(): void }
  }
  settings: {
    get(key: string): unknown
    update(key: string, value: unknown): void
  }
}

export function activate(context: ExtensionContext): void {
  const api = (globalThis as Record<string, unknown>)['__agentgrid_api'] as AgentGridApi | undefined

  if (!api) { return }

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

  const importConfigCmd = api.commands.registerCommand('ghostty.importConfig', () => {
    loadRealGhosttyConfig(api, context)

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

  loadRealGhosttyConfig(api, context)

  console.log('[ghostty] extension activated')
}

export function deactivate(): void {
  console.log('[ghostty] extension deactivated')
}

function loadRealGhosttyConfig(api: AgentGridApi, context: ExtensionContext): void {
  const basePreset = GHOSTTY_PRESETS[0]!
  let theme: GhosttyTerminalTheme = { ...basePreset.terminalTheme }
  const config: GhosttyTerminalConfig = {
    fontSize: basePreset.config.font_size,
    cursorStyle: basePreset.config.cursor_style,
    cursorBlink: basePreset.config.cursor_style_blink,
    scrollback: basePreset.config.scrollback_limit,
  }

  const ghosttyThemeFile = resolveGhosttyThemeFile()

  if (ghosttyThemeFile) {
    try {
      const raw = fs.readFileSync(ghosttyThemeFile, 'utf-8')
      const parsed = parseGhosttyConfig(raw)

      theme = { ...theme, ...extractTerminalTheme(parsed) }
      mergeConfigFields(config, parsed)
    } catch (err) {
      console.warn('[ghostty] failed to read default theme file:', err)
    }
  }

  const configPath = resolveGhosttyConfigPath()

  if (configPath && fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8')
      const parsed = parseGhosttyConfig(raw)

      if (parsed.theme) {
        const namedThemePath = resolveNamedTheme(parsed.theme)

        if (namedThemePath) {
          try {
            const themeRaw = fs.readFileSync(namedThemePath, 'utf-8')
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

function resolveGhosttyConfigPath(): string | null {
  const xdgConfig = process.env['XDG_CONFIG_HOME']
  const homeConfig = path.join(os.homedir(), '.config', 'ghostty', 'config')
  const xdgPath = xdgConfig ? path.join(xdgConfig, 'ghostty', 'config') : null

  if (xdgPath && fs.existsSync(xdgPath)) { return xdgPath }

  if (fs.existsSync(homeConfig)) { return homeConfig }

  return null
}

function resolveGhosttyThemeFile(): string | null {
  const bundledPath = '/Applications/Ghostty.app/Contents/Resources/ghostty/themes/Ghostty Default Style Dark'

  if (fs.existsSync(bundledPath)) { return bundledPath }

  return null
}

function resolveNamedTheme(themeName: string): string | null {
  const xdgConfig = process.env['XDG_CONFIG_HOME']
  const userThemeDir = xdgConfig
    ? path.join(xdgConfig, 'ghostty', 'themes')
    : path.join(os.homedir(), '.config', 'ghostty', 'themes')
  const userPath = path.join(userThemeDir, themeName)

  if (fs.existsSync(userPath)) { return userPath }

  const bundledPath = `/Applications/Ghostty.app/Contents/Resources/ghostty/themes/${themeName}`

  if (fs.existsSync(bundledPath)) { return bundledPath }

  return null
}
