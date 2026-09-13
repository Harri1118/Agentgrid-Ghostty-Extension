export function parseGhosttyConfig(raw) {
    const config = {};
    const lines = raw.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex < 0) {
            continue;
        }
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        applyConfigKey(config, key, value);
    }
    return config;
}
export function extractTerminalTheme(config) {
    const theme = {};
    if (config.background) {
        theme.background = config.background;
    }
    if (config.foreground) {
        theme.foreground = config.foreground;
    }
    if (config.selection_background) {
        theme.selectionBackground = config.selection_background;
    }
    if (config.selection_foreground) {
        theme.selectionForeground = config.selection_foreground;
    }
    if (config.palette) {
        const ansiKeys = [
            'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
            'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
            'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
        ];
        for (let i = 0; i < config.palette.length && i < ansiKeys.length; i++) {
            const color = config.palette[i];
            if (color) {
                theme[ansiKeys[i]] = color;
            }
        }
    }
    return theme;
}
function applyConfigKey(config, key, value) {
    const stringKeys = {
        'font-family': 'font_family',
        'background': 'background',
        'foreground': 'foreground',
        'selection-background': 'selection_background',
        'selection-foreground': 'selection_foreground',
        'theme': 'theme',
    };
    const numericKeys = {
        'font-size': 'font_size',
        'window-padding-x': 'window_padding_x',
        'window-padding-y': 'window_padding_y',
        'scrollback-limit': 'scrollback_limit',
        'unfocused-split-opacity': 'unfocused_split_opacity',
    };
    const booleanKeys = {
        'cursor-style-blink': 'cursor_style_blink',
        'mouse-hide-while-typing': 'mouse_hide_while_typing',
        'copy-on-select': 'copy_on_select',
        'confirm-close-surface': 'confirm_close_surface',
        'bold-is-bright': 'bold_is_bright',
    };
    if (stringKeys[key]) {
        ;
        config[stringKeys[key]] = value;
        return;
    }
    if (numericKeys[key]) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            ;
            config[numericKeys[key]] = num;
        }
        return;
    }
    if (booleanKeys[key]) {
        ;
        config[booleanKeys[key]] = value === 'true';
        return;
    }
    if (key === 'cursor-style') {
        const valid = ['block', 'bar', 'underline'];
        if (valid.includes(value)) {
            config.cursor_style = value;
        }
        return;
    }
    if (key === 'shell-integration') {
        config.shell_integration = value;
        return;
    }
    if (key === 'palette') {
        const paletteMatch = /^(\d+)=(.+)$/.exec(value);
        if (paletteMatch) {
            if (!config.palette) {
                config.palette = [];
            }
            const idx = parseInt(paletteMatch[1], 10);
            if (idx >= 0 && idx < 16) {
                config.palette[idx] = paletteMatch[2];
            }
        }
    }
}
