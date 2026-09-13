import type { GhosttyConfig, GhosttyTerminalTheme } from './types';
export declare function parseGhosttyConfig(raw: string): GhosttyConfig;
export declare function extractTerminalTheme(config: GhosttyConfig): Partial<GhosttyTerminalTheme>;
