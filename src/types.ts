export type GhosttyConfig = {
  font_family?: string
  font_family_bold?: string
  font_family_italic?: string
  font_family_bold_italic?: string
  font_size?: number
  font_thicken?: boolean
  theme?: string
  cursor_style?: 'block' | 'bar' | 'underline'
  cursor_style_blink?: boolean
  cursor_color?: string
  cursor_text?: string
  cursor_opacity?: number
  background?: string
  foreground?: string
  background_opacity?: number
  background_blur_radius?: number
  selection_background?: string
  selection_foreground?: string
  palette?: string[]
  window_padding_x?: number
  window_padding_y?: number
  window_padding_balance?: boolean
  scrollback_limit?: number
  shell_integration?: 'detect' | 'none' | 'bash' | 'zsh' | 'fish'
  mouse_hide_while_typing?: boolean
  copy_on_select?: boolean
  confirm_close_surface?: boolean
  bold_is_bright?: boolean
  minimum_contrast?: number
  unfocused_split_opacity?: number
  adjust_cell_width?: number
  adjust_cell_height?: number
  adjust_cursor_thickness?: number
  link_url?: boolean
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

export type GhosttyTerminalConfig = {
  fontFamily?: string
  fontFamilyBold?: string
  fontFamilyItalic?: string
  fontFamilyBoldItalic?: string
  fontSize?: number
  fontThicken?: boolean
  cursorStyle?: 'block' | 'bar' | 'underline'
  cursorBlink?: boolean
  cursorOpacity?: number
  backgroundOpacity?: number
  backgroundBlurRadius?: number
  boldIsBright?: boolean
  minimumContrast?: number
  paddingX?: number
  paddingY?: number
  scrollback?: number
  cellWidth?: number
  cellHeight?: number
  cursorThickness?: number
}

export type GhosttyEngineResponse = {
  theme: GhosttyTerminalTheme
  config: GhosttyTerminalConfig
}

export type GhosttyPreset = {
  id: string
  label: string
  config: GhosttyConfig
  terminalTheme: GhosttyTerminalTheme
}
