export type GhosttyConfig = {
  font_family?: string
  font_size?: number
  theme?: string
  cursor_style?: 'block' | 'bar' | 'underline'
  cursor_style_blink?: boolean
  background?: string
  foreground?: string
  selection_background?: string
  selection_foreground?: string
  palette?: string[]
  window_padding_x?: number
  window_padding_y?: number
  scrollback_limit?: number
  shell_integration?: 'detect' | 'none' | 'bash' | 'zsh' | 'fish'
  mouse_hide_while_typing?: boolean
  copy_on_select?: boolean
  confirm_close_surface?: boolean
  bold_is_bright?: boolean
  unfocused_split_opacity?: number
}

export type GhosttyTerminalTheme = {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  selectionForeground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export type GhosttyPreset = {
  id: string
  label: string
  config: GhosttyConfig
  terminalTheme: GhosttyTerminalTheme
}
