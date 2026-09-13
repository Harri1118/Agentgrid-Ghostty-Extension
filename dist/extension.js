import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { parseGhosttyConfig, extractTerminalTheme } from './config-parser';
import { GHOSTTY_PRESETS } from './presets';
export function activate(context) {
    const api = globalThis['__agentgrid_api'];
    if (!api) {
        return;
    }
    const applyThemeCmd = api.commands.registerCommand('ghostty.applyTerminalTheme', (...args) => {
        const presetId = args[0] || 'ghostty-default-dark';
        return applyPreset(api, context, presetId);
    });
    const importConfigCmd = api.commands.registerCommand('ghostty.importConfig', () => {
        return importGhosttyConfig(api, context);
    });
    const listPresetsCmd = api.commands.registerCommand('ghostty.listPresets', () => {
        return GHOSTTY_PRESETS.map((p) => ({ id: p.id, label: p.label }));
    });
    const getActivePresetCmd = api.commands.registerCommand('ghostty.getActivePreset', () => {
        return context.globalState.get('activePreset') ?? null;
    });
    const getTerminalThemeCmd = api.commands.registerCommand('ghostty.getTerminalTheme', () => {
        return context.globalState.get('terminalTheme') ?? null;
    });
    context.subscriptions.push(applyThemeCmd, importConfigCmd, listPresetsCmd, getActivePresetCmd, getTerminalThemeCmd);
    const savedPreset = context.globalState.get('activePreset');
    if (savedPreset) {
        applyPreset(api, context, savedPreset);
    }
    console.log('[ghostty] extension activated');
}
export function deactivate() {
    console.log('[ghostty] extension deactivated');
}
function applyPreset(api, context, presetId) {
    const preset = GHOSTTY_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
        return { ok: false, error: `Unknown preset: ${presetId}` };
    }
    context.globalState.update('activePreset', preset.id);
    context.globalState.update('terminalTheme', preset.terminalTheme);
    context.globalState.update('terminalConfig', preset.config);
    api.settings.update('ghostty.terminalTheme', preset.terminalTheme);
    api.settings.update('ghostty.terminalConfig', preset.config);
    return { ok: true, preset: preset.id };
}
function importGhosttyConfig(api, context) {
    const configPath = resolveGhosttyConfigPath();
    if (!configPath || !fs.existsSync(configPath)) {
        return { ok: false, error: 'Ghostty config not found at ~/.config/ghostty/config' };
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = parseGhosttyConfig(raw);
        const themeOverrides = extractTerminalTheme(config);
        const basePreset = GHOSTTY_PRESETS[0];
        const mergedTheme = { ...basePreset.terminalTheme, ...themeOverrides };
        context.globalState.update('activePreset', 'imported');
        context.globalState.update('terminalTheme', mergedTheme);
        context.globalState.update('terminalConfig', config);
        api.settings.update('ghostty.terminalTheme', mergedTheme);
        api.settings.update('ghostty.terminalConfig', config);
        return { ok: true, imported: true };
    }
    catch (err) {
        return { ok: false, error: err.message };
    }
}
function resolveGhosttyConfigPath() {
    const xdgConfig = process.env['XDG_CONFIG_HOME'];
    const homeConfig = path.join(os.homedir(), '.config', 'ghostty', 'config');
    const xdgPath = xdgConfig ? path.join(xdgConfig, 'ghostty', 'config') : null;
    if (xdgPath && fs.existsSync(xdgPath)) {
        return xdgPath;
    }
    if (fs.existsSync(homeConfig)) {
        return homeConfig;
    }
    return null;
}
