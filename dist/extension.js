"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_node_os = __toESM(require("node:os"));

// src/config-parser.ts
function parseGhosttyConfig(raw) {
  const config = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    applyConfigKey(config, key, value);
  }
  return config;
}
function extractTerminalTheme(config) {
  const theme = {};
  if (config.background) {
    theme.background = config.background;
  }
  if (config.foreground) {
    theme.foreground = config.foreground;
  }
  if (config.cursor_color) {
    theme.cursor = config.cursor_color;
  }
  if (config.cursor_text) {
    theme.cursorAccent = config.cursor_text;
  }
  if (config.selection_background) {
    theme.selectionBackground = config.selection_background;
  }
  if (config.selection_foreground) {
    theme.selectionForeground = config.selection_foreground;
  }
  if (config.palette) {
    const ansiKeys = [
      "black",
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
      "brightBlack",
      "brightRed",
      "brightGreen",
      "brightYellow",
      "brightBlue",
      "brightMagenta",
      "brightCyan",
      "brightWhite"
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
    "font-family": "font_family",
    "font-family-bold": "font_family_bold",
    "font-family-italic": "font_family_italic",
    "font-family-bold-italic": "font_family_bold_italic",
    "background": "background",
    "foreground": "foreground",
    "cursor-color": "cursor_color",
    "cursor-text": "cursor_text",
    "selection-background": "selection_background",
    "selection-foreground": "selection_foreground",
    "theme": "theme"
  };
  const numericKeys = {
    "font-size": "font_size",
    "background-opacity": "background_opacity",
    "background-blur-radius": "background_blur_radius",
    "cursor-opacity": "cursor_opacity",
    "minimum-contrast": "minimum_contrast",
    "window-padding-x": "window_padding_x",
    "window-padding-y": "window_padding_y",
    "scrollback-limit": "scrollback_limit",
    "unfocused-split-opacity": "unfocused_split_opacity",
    "adjust-cell-width": "adjust_cell_width",
    "adjust-cell-height": "adjust_cell_height",
    "adjust-cursor-thickness": "adjust_cursor_thickness"
  };
  const booleanKeys = {
    "cursor-style-blink": "cursor_style_blink",
    "mouse-hide-while-typing": "mouse_hide_while_typing",
    "copy-on-select": "copy_on_select",
    "confirm-close-surface": "confirm_close_surface",
    "bold-is-bright": "bold_is_bright",
    "font-thicken": "font_thicken",
    "window-padding-balance": "window_padding_balance",
    "link-url": "link_url"
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
    config[booleanKeys[key]] = value === "true";
    return;
  }
  if (key === "cursor-style") {
    const valid = ["block", "bar", "underline"];
    if (valid.includes(value)) {
      config.cursor_style = value;
    }
    return;
  }
  if (key === "shell-integration") {
    config.shell_integration = value;
    return;
  }
  if (key === "palette") {
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

// src/presets.ts
var GHOSTTY_PRESETS = [
  {
    id: "ghostty-default-dark",
    label: "Ghostty Default (Dark)",
    config: {
      font_size: 13,
      cursor_style: "block",
      cursor_style_blink: true,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      copy_on_select: false,
      bold_is_bright: false
    },
    terminalTheme: {
      background: "#282c34",
      foreground: "#ffffff",
      cursor: "#ffffff",
      cursorAccent: "#353a44",
      selectionBackground: "#ffffff",
      selectionForeground: "#282c34",
      black: "#1d1f21",
      red: "#cc6566",
      green: "#b6bd68",
      yellow: "#f0c674",
      blue: "#82a2be",
      magenta: "#b294bb",
      cyan: "#8abeb7",
      white: "#c4c8c6",
      brightBlack: "#666666",
      brightRed: "#d54e53",
      brightGreen: "#b9ca4b",
      brightYellow: "#e7c547",
      brightBlue: "#7aa6da",
      brightMagenta: "#c397d8",
      brightCyan: "#70c0b1",
      brightWhite: "#eaeaea"
    }
  },
  {
    id: "ghostty-gruvbox",
    label: "Ghostty Gruvbox",
    config: {
      font_size: 14,
      cursor_style: "block",
      cursor_style_blink: false,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      bold_is_bright: true
    },
    terminalTheme: {
      background: "#282828",
      foreground: "#ebdbb2",
      cursor: "#ebdbb2",
      cursorAccent: "#282828",
      selectionBackground: "#504945",
      selectionForeground: "#ebdbb2",
      black: "#282828",
      red: "#cc241d",
      green: "#98971a",
      yellow: "#d79921",
      blue: "#458588",
      magenta: "#b16286",
      cyan: "#689d6a",
      white: "#a89984",
      brightBlack: "#928374",
      brightRed: "#fb4934",
      brightGreen: "#b8bb26",
      brightYellow: "#fabd2f",
      brightBlue: "#83a598",
      brightMagenta: "#d3869b",
      brightCyan: "#8ec07c",
      brightWhite: "#ebdbb2"
    }
  },
  {
    id: "ghostty-catppuccin-mocha",
    label: "Ghostty Catppuccin Mocha",
    config: {
      font_size: 14,
      cursor_style: "bar",
      cursor_style_blink: true,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      bold_is_bright: false
    },
    terminalTheme: {
      background: "#1e1e2e",
      foreground: "#cdd6f4",
      cursor: "#f5e0dc",
      cursorAccent: "#1e1e2e",
      selectionBackground: "#45475a",
      selectionForeground: "#cdd6f4",
      black: "#45475a",
      red: "#f38ba8",
      green: "#a6e3a1",
      yellow: "#f9e2af",
      blue: "#89b4fa",
      magenta: "#f5c2e7",
      cyan: "#94e2d5",
      white: "#bac2de",
      brightBlack: "#585b70",
      brightRed: "#f38ba8",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#a6adc8"
    }
  },
  {
    id: "ghostty-tokyonight",
    label: "Ghostty Tokyo Night",
    config: {
      font_size: 14,
      cursor_style: "bar",
      cursor_style_blink: true,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      bold_is_bright: false
    },
    terminalTheme: {
      background: "#1a1b26",
      foreground: "#c0caf5",
      cursor: "#c0caf5",
      cursorAccent: "#1a1b26",
      selectionBackground: "#33467c",
      selectionForeground: "#c0caf5",
      black: "#15161e",
      red: "#f7768e",
      green: "#9ece6a",
      yellow: "#e0af68",
      blue: "#7aa2f7",
      magenta: "#bb9af7",
      cyan: "#7dcfff",
      white: "#a9b1d6",
      brightBlack: "#414868",
      brightRed: "#f7768e",
      brightGreen: "#9ece6a",
      brightYellow: "#e0af68",
      brightBlue: "#7aa2f7",
      brightMagenta: "#bb9af7",
      brightCyan: "#7dcfff",
      brightWhite: "#c0caf5"
    }
  },
  {
    id: "ghostty-rose-pine",
    label: "Ghostty Ros\xE9 Pine",
    config: {
      font_size: 14,
      cursor_style: "bar",
      cursor_style_blink: true,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      bold_is_bright: false
    },
    terminalTheme: {
      background: "#191724",
      foreground: "#e0def4",
      cursor: "#524f67",
      cursorAccent: "#191724",
      selectionBackground: "#2a283e",
      selectionForeground: "#e0def4",
      black: "#26233a",
      red: "#eb6f92",
      green: "#31748f",
      yellow: "#f6c177",
      blue: "#9ccfd8",
      magenta: "#c4a7e7",
      cyan: "#ebbcba",
      white: "#e0def4",
      brightBlack: "#6e6a86",
      brightRed: "#eb6f92",
      brightGreen: "#31748f",
      brightYellow: "#f6c177",
      brightBlue: "#9ccfd8",
      brightMagenta: "#c4a7e7",
      brightCyan: "#ebbcba",
      brightWhite: "#e0def4"
    }
  },
  {
    id: "ghostty-nord",
    label: "Ghostty Nord",
    config: {
      font_size: 14,
      cursor_style: "block",
      cursor_style_blink: false,
      scrollback_limit: 1e4,
      mouse_hide_while_typing: true,
      bold_is_bright: false
    },
    terminalTheme: {
      background: "#2e3440",
      foreground: "#d8dee9",
      cursor: "#d8dee9",
      cursorAccent: "#2e3440",
      selectionBackground: "#434c5e",
      selectionForeground: "#eceff4",
      black: "#3b4252",
      red: "#bf616a",
      green: "#a3be8c",
      yellow: "#ebcb8b",
      blue: "#81a1c1",
      magenta: "#b48ead",
      cyan: "#88c0d0",
      white: "#e5e9f0",
      brightBlack: "#4c566a",
      brightRed: "#bf616a",
      brightGreen: "#a3be8c",
      brightYellow: "#ebcb8b",
      brightBlue: "#81a1c1",
      brightMagenta: "#b48ead",
      brightCyan: "#8fbcbb",
      brightWhite: "#eceff4"
    }
  }
];

// src/extension.ts
function activate(context) {
  const api = globalThis["__agentgrid_api"];
  if (!api) {
    return;
  }
  const terminalEngine = api.terminalEngines.registerTerminalEngine({
    id: "ghostty",
    label: "Ghostty",
    description: "Ghostty terminal engine \u2014 loads your real Ghostty config"
  });
  context.subscriptions.push(terminalEngine);
  const applyThemeCmd = api.commands.registerCommand("ghostty.applyTerminalTheme", (...args) => {
    const presetId = args[0] || "ghostty-default-dark";
    return applyPreset(api, context, presetId);
  });
  const importConfigCmd = api.commands.registerCommand("ghostty.importConfig", () => {
    loadRealGhosttyConfig(api, context);
    return { ok: true, imported: true };
  });
  const listPresetsCmd = api.commands.registerCommand("ghostty.listPresets", () => {
    return GHOSTTY_PRESETS.map((p) => ({ id: p.id, label: p.label }));
  });
  const getActivePresetCmd = api.commands.registerCommand("ghostty.getActivePreset", () => {
    return context.globalState.get("activePreset") ?? null;
  });
  const getTerminalThemeCmd = api.commands.registerCommand("ghostty.getTerminalTheme", () => {
    const theme = context.globalState.get("terminalTheme") ?? GHOSTTY_PRESETS[0].terminalTheme;
    const config = context.globalState.get("terminalConfig") ?? {};
    return { theme, config };
  });
  context.subscriptions.push(applyThemeCmd, importConfigCmd, listPresetsCmd, getActivePresetCmd, getTerminalThemeCmd);
  loadRealGhosttyConfig(api, context);
  console.log("[ghostty] extension activated");
}
function deactivate() {
  console.log("[ghostty] extension deactivated");
}
function loadRealGhosttyConfig(api, context) {
  const basePreset = GHOSTTY_PRESETS[0];
  let theme = { ...basePreset.terminalTheme };
  const config = {
    fontSize: basePreset.config.font_size,
    cursorStyle: basePreset.config.cursor_style,
    cursorBlink: basePreset.config.cursor_style_blink,
    scrollback: basePreset.config.scrollback_limit
  };
  const ghosttyThemeFile = resolveGhosttyThemeFile();
  if (ghosttyThemeFile) {
    try {
      const raw = import_node_fs.default.readFileSync(ghosttyThemeFile, "utf-8");
      const parsed = parseGhosttyConfig(raw);
      theme = { ...theme, ...extractTerminalTheme(parsed) };
      mergeConfigFields(config, parsed);
    } catch (err) {
      console.warn("[ghostty] failed to read default theme file:", err);
    }
  }
  const configPath = resolveGhosttyConfigPath();
  if (configPath && import_node_fs.default.existsSync(configPath)) {
    try {
      const raw = import_node_fs.default.readFileSync(configPath, "utf-8");
      const parsed = parseGhosttyConfig(raw);
      if (parsed.theme) {
        const namedThemePath = resolveNamedTheme(parsed.theme);
        if (namedThemePath) {
          try {
            const themeRaw = import_node_fs.default.readFileSync(namedThemePath, "utf-8");
            const themeParsed = parseGhosttyConfig(themeRaw);
            theme = { ...theme, ...extractTerminalTheme(themeParsed) };
            mergeConfigFields(config, themeParsed);
          } catch {
            console.warn(`[ghostty] failed to read named theme: ${parsed.theme}`);
          }
        }
      }
      theme = { ...theme, ...extractTerminalTheme(parsed) };
      mergeConfigFields(config, parsed);
    } catch (err) {
      console.warn("[ghostty] failed to read user config:", err);
    }
  }
  context.globalState.update("activePreset", "auto");
  context.globalState.update("terminalTheme", theme);
  context.globalState.update("terminalConfig", config);
  api.settings.update("ghostty.terminalTheme", theme);
  api.settings.update("ghostty.terminalConfig", config);
}
function mergeConfigFields(config, parsed) {
  if (parsed.font_family) {
    config.fontFamily = parsed.font_family;
  }
  if (parsed.font_family_bold) {
    config.fontFamilyBold = parsed.font_family_bold;
  }
  if (parsed.font_family_italic) {
    config.fontFamilyItalic = parsed.font_family_italic;
  }
  if (parsed.font_family_bold_italic) {
    config.fontFamilyBoldItalic = parsed.font_family_bold_italic;
  }
  if (typeof parsed.font_size === "number") {
    config.fontSize = parsed.font_size;
  }
  if (typeof parsed.font_thicken === "boolean") {
    config.fontThicken = parsed.font_thicken;
  }
  if (parsed.cursor_style) {
    config.cursorStyle = parsed.cursor_style;
  }
  if (typeof parsed.cursor_style_blink === "boolean") {
    config.cursorBlink = parsed.cursor_style_blink;
  }
  if (typeof parsed.cursor_opacity === "number") {
    config.cursorOpacity = parsed.cursor_opacity;
  }
  if (typeof parsed.background_opacity === "number") {
    config.backgroundOpacity = parsed.background_opacity;
  }
  if (typeof parsed.background_blur_radius === "number") {
    config.backgroundBlurRadius = parsed.background_blur_radius;
  }
  if (typeof parsed.bold_is_bright === "boolean") {
    config.boldIsBright = parsed.bold_is_bright;
  }
  if (typeof parsed.minimum_contrast === "number") {
    config.minimumContrast = parsed.minimum_contrast;
  }
  if (typeof parsed.window_padding_x === "number") {
    config.paddingX = parsed.window_padding_x;
  }
  if (typeof parsed.window_padding_y === "number") {
    config.paddingY = parsed.window_padding_y;
  }
  if (typeof parsed.scrollback_limit === "number") {
    config.scrollback = parsed.scrollback_limit;
  }
  if (typeof parsed.adjust_cell_width === "number") {
    config.cellWidth = parsed.adjust_cell_width;
  }
  if (typeof parsed.adjust_cell_height === "number") {
    config.cellHeight = parsed.adjust_cell_height;
  }
  if (typeof parsed.adjust_cursor_thickness === "number") {
    config.cursorThickness = parsed.adjust_cursor_thickness;
  }
}
function applyPreset(api, context, presetId) {
  const preset = GHOSTTY_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return { ok: false, error: `Unknown preset: ${presetId}` };
  }
  const config = {
    fontSize: preset.config.font_size,
    cursorStyle: preset.config.cursor_style,
    cursorBlink: preset.config.cursor_style_blink,
    scrollback: preset.config.scrollback_limit,
    boldIsBright: preset.config.bold_is_bright
  };
  context.globalState.update("activePreset", preset.id);
  context.globalState.update("terminalTheme", preset.terminalTheme);
  context.globalState.update("terminalConfig", config);
  api.settings.update("ghostty.terminalTheme", preset.terminalTheme);
  api.settings.update("ghostty.terminalConfig", config);
  return { ok: true, preset: preset.id };
}
function resolveGhosttyConfigPath() {
  const xdgConfig = process.env["XDG_CONFIG_HOME"];
  const homeConfig = import_node_path.default.join(import_node_os.default.homedir(), ".config", "ghostty", "config");
  const xdgPath = xdgConfig ? import_node_path.default.join(xdgConfig, "ghostty", "config") : null;
  if (xdgPath && import_node_fs.default.existsSync(xdgPath)) {
    return xdgPath;
  }
  if (import_node_fs.default.existsSync(homeConfig)) {
    return homeConfig;
  }
  return null;
}
function resolveGhosttyThemeFile() {
  const bundledPath = "/Applications/Ghostty.app/Contents/Resources/ghostty/themes/Ghostty Default Style Dark";
  if (import_node_fs.default.existsSync(bundledPath)) {
    return bundledPath;
  }
  return null;
}
function resolveNamedTheme(themeName) {
  const xdgConfig = process.env["XDG_CONFIG_HOME"];
  const userThemeDir = xdgConfig ? import_node_path.default.join(xdgConfig, "ghostty", "themes") : import_node_path.default.join(import_node_os.default.homedir(), ".config", "ghostty", "themes");
  const userPath = import_node_path.default.join(userThemeDir, themeName);
  if (import_node_fs.default.existsSync(userPath)) {
    return userPath;
  }
  const bundledPath = `/Applications/Ghostty.app/Contents/Resources/ghostty/themes/${themeName}`;
  if (import_node_fs.default.existsSync(bundledPath)) {
    return bundledPath;
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
