import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { parseGhosttyConfig, extractTerminalTheme } from './config-parser'
import { GHOSTTY_PRESETS } from './presets'
import type { GhosttyPreset, GhosttyTerminalTheme } from './types'

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
    description: 'Ghostty-inspired terminal with custom themes and keybindings',
  })

  context.subscriptions.push(terminalEngine)

  const applyThemeCmd = api.commands.registerCommand('ghostty.applyTerminalTheme', (...args: unknown[]) => {
    const presetId = (args[0] as string) || 'ghostty-default-dark'

    return applyPreset(api, context, presetId)
  })

  const importConfigCmd = api.commands.registerCommand('ghostty.importConfig', () => {
    return importGhosttyConfig(api, context)
  })

  const listPresetsCmd = api.commands.registerCommand('ghostty.listPresets', () => {
    return GHOSTTY_PRESETS.map((p) => ({ id: p.id, label: p.label }))
  })

  const getActivePresetCmd = api.commands.registerCommand('ghostty.getActivePreset', () => {
    return context.globalState.get<string>('activePreset') ?? null
  })

  const getTerminalThemeCmd = api.commands.registerCommand('ghostty.getTerminalTheme', () => {
    return context.globalState.get<GhosttyTerminalTheme>('terminalTheme') ?? GHOSTTY_PRESETS[0]!.terminalTheme
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
  let config = { ...basePreset.config }

  const ghosttyThemeFile = resolveGhosttyThemeFile()

  if (ghosttyThemeFile) {
    try {
      const raw = fs.readFileSync(ghosttyThemeFile, 'utf-8')
      const parsed = parseGhosttyConfig(raw)
      const themeOverrides = extractTerminalTheme(parsed)

      theme = { ...theme, ...themeOverrides }

      if (parsed.cursor_style) { config.cursor_style = parsed.cursor_style }
      if (typeof parsed.cursor_style_blink === 'boolean') { config.cursor_style_blink = parsed.cursor_style_blink }
      if (typeof parsed.font_size === 'number') { config.font_size = parsed.font_size }
      if (typeof parsed.scrollback_limit === 'number') { config.scrollback_limit = parsed.scrollback_limit }
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
            const themeOverrides = extractTerminalTheme(themeParsed)

            theme = { ...theme, ...themeOverrides }
          } catch {
            console.warn(`[ghostty] failed to read named theme: ${parsed.theme}`)
          }
        }
      }

      const userOverrides = extractTerminalTheme(parsed)

      theme = { ...theme, ...userOverrides }

      if (parsed.font_family) { config.font_family = parsed.font_family }
      if (parsed.cursor_style) { config.cursor_style = parsed.cursor_style }
      if (typeof parsed.cursor_style_blink === 'boolean') { config.cursor_style_blink = parsed.cursor_style_blink }
      if (typeof parsed.font_size === 'number') { config.font_size = parsed.font_size }
      if (typeof parsed.scrollback_limit === 'number') { config.scrollback_limit = parsed.scrollback_limit }
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

function applyPreset(api: AgentGridApi, context: ExtensionContext, presetId: string): { ok: boolean; preset?: string; error?: string } {
  const preset = GHOSTTY_PRESETS.find((p) => p.id === presetId)

  if (!preset) {
    return { ok: false, error: `Unknown preset: ${presetId}` }
  }

  context.globalState.update('activePreset', preset.id)
  context.globalState.update('terminalTheme', preset.terminalTheme)
  context.globalState.update('terminalConfig', preset.config)

  api.settings.update('ghostty.terminalTheme', preset.terminalTheme)
  api.settings.update('ghostty.terminalConfig', preset.config)

  return { ok: true, preset: preset.id }
}

function importGhosttyConfig(api: AgentGridApi, context: ExtensionContext): { ok: boolean; imported?: boolean; error?: string } {
  loadRealGhosttyConfig(api, context)

  return { ok: true, imported: true }
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
