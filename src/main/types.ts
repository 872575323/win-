/**
 * 沉浸式隐蔽小说阅读器 - 核心 TypeScript 接口和类型定义
 */

// ============================================================
// 接口定义
// ============================================================

/** 窗口管理器配置 */
export interface WindowManagerConfig {
  width: number;          // 窗口宽度，默认 800
  height: number;         // 窗口高度，默认 600
  x?: number;             // 窗口 x 坐标
  y?: number;             // 窗口 y 坐标
  alwaysOnTop: boolean;   // 是否置顶，默认 false
  defaultUrl: string;     // 默认加载 URL
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
    terminalEnabled: boolean;  // 终端伪装主题是否开启
  };
  url: string;              // 当前加载的 URL
  alwaysOnTop: boolean;     // 是否置顶
}

/** 快捷键绑定 */
export interface ShortcutBinding {
  action: string;         // 操作名称
  accelerator: string;    // 快捷键组合，如 "Ctrl+Shift+H"
}

/** 快捷键冲突信息 */
export interface ShortcutConflict {
  action: string;         // 当前操作名
  accelerator: string;    // 冲突的快捷键组合
  conflictWith: string;   // 冲突的操作名
}

/** 净化规则 */
export interface PurifyRule {
  selector: string;               // CSS 选择器
  action: 'hide' | 'remove';     // 隐藏或移除
}


// ============================================================
// IPC 通道常量
// ============================================================

/** IPC 通信通道名称定义 */
export const IPC_CHANNELS = {
  // 快捷键相关
  GET_SHORTCUTS: 'shortcuts:get-all',         // 获取所有快捷键绑定
  UPDATE_SHORTCUT: 'shortcuts:update',        // 更新快捷键
  RESET_SHORTCUTS: 'shortcuts:reset',         // 恢复默认快捷键
  SHORTCUT_CONFLICT: 'shortcuts:conflict',    // 快捷键冲突通知
  TOGGLE_SETTINGS: 'shortcuts:toggle-settings', // 打开/关闭快捷键设置面板

  // 智能显隐相关
  STEALTH_SHOW: 'stealth:show',              // 通知渲染进程窗口已显示
  STEALTH_HIDE: 'stealth:hide',              // 通知渲染进程窗口已隐藏

  // 主题和净化相关
  THEME_TOGGLE: 'theme:toggle',              // 切换终端主题
  PURIFY_TOGGLE: 'purify:toggle',            // 切换净化模式

  // 导航相关
  NAVIGATE_URL: 'navigate:url',              // 导航到指定 URL
  TOGGLE_ADDRESS_BAR: 'address-bar:toggle',  // 切换地址栏显隐

  // 鼠标事件相关
  MOUSE_ENTER: 'mouse:enter',               // 鼠标进入窗口
  MOUSE_LEAVE: 'mouse:leave',               // 鼠标离开窗口

  // 窗口 resize 相关
  WINDOW_RESIZE_START: 'window:resize-start',   // 开始拖拽调整大小
  WINDOW_RESIZE_MOVE: 'window:resize-move',     // 拖拽中
  WINDOW_RESIZE_END: 'window:resize-end',       // 拖拽结束
} as const;

// ============================================================
// 默认快捷键映射
// ============================================================

/** 默认快捷键绑定列表 */
export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'toggleVisibility', accelerator: 'Ctrl+Shift+H' },       // 显隐切换
  { action: 'toggleTerminalTheme', accelerator: 'Ctrl+Shift+T' },    // 终端主题切换
  { action: 'togglePurify', accelerator: 'Ctrl+Shift+C' },           // 净化模式切换
  { action: 'openAddressBar', accelerator: 'Ctrl+L' },               // 打开地址栏输入 URL
  { action: 'quitApp', accelerator: 'Ctrl+Q' },                      // 退出应用
  { action: 'openShortcutSettings', accelerator: 'Ctrl+Shift+K' },   // 打开快捷键设置
];

// ============================================================
// 微信读书净化规则
// ============================================================

/** 微信读书页面净化规则（预定义） */
export const WEREAD_PURIFY_RULES: PurifyRule[] = [
  { selector: '.readerTopBar', action: 'hide' },           // 顶部导航栏
  { selector: '.readerFooter', action: 'hide' },           // 底部工具栏
  { selector: '.readerControls', action: 'hide' },         // 阅读控制面板
  { selector: '.shelf_list', action: 'hide' },             // 书架列表
  { selector: '.readerCatalog', action: 'hide' },          // 目录面板
  { selector: '.avatar', action: 'hide' },                 // 用户头像
  { selector: '.readerComment', action: 'hide' },          // 评论区
  { selector: '.readerSocial', action: 'hide' },           // 社交元素
  { selector: '[class*="background"]', action: 'hide' },   // 背景装饰
];
