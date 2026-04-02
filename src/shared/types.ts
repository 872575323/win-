/**
 * 沉浸式隐蔽小说阅读器 - 共享 TypeScript 接口和类型定义
 * 主进程、预加载脚本、渲染进程共用
 */

// ============================================================
// 接口定义
// ============================================================

/** 窗口管理器配置 */
export interface WindowManagerConfig {
  width: number;
  height: number;
  x?: number;
  y?: number;
  alwaysOnTop: boolean;
  defaultUrl: string;
}

/** 应用状态（用于持久化存储） */
export interface AppState {
  window: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  theme: {
    terminalEnabled: boolean;
  };
  purifyEnabled: boolean;
  fontSize: number;
  url: string;
  alwaysOnTop: boolean;
}

/** 快捷键绑定 */
export interface ShortcutBinding {
  action: string;
  accelerator: string;
}

/** 快捷键冲突信息 */
export interface ShortcutConflict {
  action: string;
  accelerator: string;
  conflictWith: string;
}

/** 净化规则 */
export interface PurifyRule {
  selector: string;
  action: 'hide' | 'remove';
}

// ============================================================
// IPC 通道常量
// ============================================================

export const IPC_CHANNELS = {
  GET_SHORTCUTS: 'shortcuts:get-all',
  UPDATE_SHORTCUT: 'shortcuts:update',
  RESET_SHORTCUTS: 'shortcuts:reset',
  SHORTCUT_CONFLICT: 'shortcuts:conflict',
  TOGGLE_SETTINGS: 'shortcuts:toggle-settings',

  STEALTH_SHOW: 'stealth:show',
  STEALTH_HIDE: 'stealth:hide',

  THEME_TOGGLE: 'theme:toggle',
  PURIFY_TOGGLE: 'purify:toggle',

  GET_SETTINGS_STATE: 'settings:get-state',
  PURIFY_CHANGED: 'settings:purify-changed',
  ZOOM_CHANGED: 'settings:zoom-changed',

  NAVIGATE_URL: 'navigate:url',
  TOGGLE_ADDRESS_BAR: 'address-bar:toggle',

  MOUSE_ENTER: 'mouse:enter',
  MOUSE_LEAVE: 'mouse:leave',

  WINDOW_DRAG_START: 'window:drag-start',
  WINDOW_DRAG_MOVE: 'window:drag-move',
  WINDOW_DRAG_END: 'window:drag-end',

  WINDOW_RESIZE_START: 'window:resize-start',
  WINDOW_RESIZE_MOVE: 'window:resize-move',
  WINDOW_RESIZE_END: 'window:resize-end',
} as const;

// ============================================================
// 默认快捷键映射
// ============================================================

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'toggleVisibility', accelerator: 'Ctrl+Shift+H' },
  { action: 'toggleTerminalTheme', accelerator: 'Ctrl+Shift+T' },
  { action: 'togglePurify', accelerator: 'Ctrl+Shift+C' },
  { action: 'openAddressBar', accelerator: 'Ctrl+L' },
  { action: 'quitApp', accelerator: 'Ctrl+Q' },
  { action: 'openShortcutSettings', accelerator: 'Ctrl+Shift+K' },
];

// ============================================================
// 微信读书净化规则
// ============================================================

export const WEREAD_PURIFY_RULES: PurifyRule[] = [
  { selector: '.readerTopBar', action: 'hide' },
  { selector: '.readerFooter', action: 'hide' },
  { selector: '.readerControls', action: 'hide' },
  { selector: '.readerCatalog', action: 'hide' },
  { selector: '.readerComment', action: 'hide' },
  { selector: '.readerSocial', action: 'hide' },
];
