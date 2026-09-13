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
    return context.globalState.get<GhosttyTerminalTheme>('terminalTheme') ?? null
  })

  context.subscriptions.push(applyThemeCmd, importConfigCmd, listPresetsCmd, getActivePresetCmd, getTerminalThemeCmd)

  const savedPreset = context.globalState.get<string>('activePreset')

  if (savedPreset) {
    applyPreset(api, context, savedPreset)
  }

  console.log('[ghostty] extension activated')
}

export function deactivate(): void {
  console.log('[ghostty] extension deactivated')
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
  const configPath = resolveGhosttyConfigPath()

  if (!configPath || !fs.existsSync(configPath)) {
    return { ok: false, error: 'Ghostty config not found at ~/.config/ghostty/config' }
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = parseGhosttyConfig(raw)
    const themeOverrides = extractTerminalTheme(config)

    const basePreset = GHOSTTY_PRESETS[0]!

    const mergedTheme: GhosttyTerminalTheme = { ...basePreset.terminalTheme, ...themeOverrides }

    context.globalState.update('activePreset', 'imported')
    context.globalState.update('terminalTheme', mergedTheme)
    context.globalState.update('terminalConfig', config)

    api.settings.update('ghostty.terminalTheme', mergedTheme)
    api.settings.update('ghostty.terminalConfig', config)

    return { ok: true, imported: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function resolveGhosttyConfigPath(): string | null {
  const xdgConfig = process.env['XDG_CONFIG_HOME']
  const homeConfig = path.join(os.homedir(), '.config', 'ghostty', 'config')
  const xdgPath = xdgConfig ? path.join(xdgConfig, 'ghostty', 'config') : null

  if (xdgPath && fs.existsSync(xdgPath)) { return xdgPath }

  if (fs.existsSync(homeConfig)) { return homeConfig }

  return null
}
