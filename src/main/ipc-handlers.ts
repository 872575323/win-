/**
 * IPC 处理器注册模块
 *
 * 注册快捷键相关的 IPC 处理器，供渲染进程通过 invoke/handle 模式调用。
 * 更新快捷键后立即重新注册，无需重启应用。
 * 需求：6.9, 3.2
 */

import { ipcMain, screen } from 'electron';
import { IPC_CHANNELS } from './types';
import { ShortcutManager } from './shortcut-manager';
import { StateManager } from './state-manager';
import { WindowManager } from './window-manager';

/**
 * 注册所有快捷键相关的 IPC 处理器
 *
 * @param shortcutManager 快捷键管理器实例
 * @param stateManager 状态管理器实例
 */
export function registerShortcutIpcHandlers(
  shortcutManager: ShortcutManager,
  stateManager: StateManager
): void {
  // shortcuts:get-all — 返回所有当前快捷键绑定
  ipcMain.handle(IPC_CHANNELS.GET_SHORTCUTS, () => {
    return shortcutManager.getAllBindings();
  });

  // shortcuts:update — 更新单个快捷键绑定，成功后保存并立即生效
  ipcMain.handle(IPC_CHANNELS.UPDATE_SHORTCUT, (_event, action: string, accelerator: string) => {
    const conflict = shortcutManager.updateBinding(action, accelerator);
    if (!conflict) {
      // 更新成功，保存到配置文件
      stateManager.saveShortcuts(shortcutManager.getAllBindings());
    }
    return conflict;
  });

  // shortcuts:reset — 恢复默认快捷键并保存
  ipcMain.handle(IPC_CHANNELS.RESET_SHORTCUTS, () => {
    const defaults = shortcutManager.resetToDefaults();
    stateManager.saveShortcuts(defaults);
    return defaults;
  });
}

/**
 * 注册导航相关的 IPC 处理器
 * 监听渲染进程发来的 navigate:url 消息，调用 WindowManager 加载新 URL
 *
 * @param windowManager 窗口管理器实例
 */
export function registerNavigationIpcHandlers(
  windowManager: WindowManager
): void {
  // navigate:url — 接收渲染进程发来的 URL，加载到主窗口
  ipcMain.on(IPC_CHANNELS.NAVIGATE_URL, (_event, url: string) => {
    if (typeof url === 'string' && url.trim()) {
      windowManager.loadURL(url.trim()).catch((err) => {
        console.error('URL 导航失败:', err);
      });
    }
  });
}

/**
 * 注册窗口拖拽移动相关的 IPC 处理器
 * 通过 preload 中的拖拽按钮 mousedown 事件，手动移动窗口位置
 */
export function registerDragIpcHandlers(
  windowManager: WindowManager
): void {
  let startBounds: Electron.Rectangle | null = null;
  let startCursorX = 0;
  let startCursorY = 0;

  ipcMain.on(IPC_CHANNELS.WINDOW_DRAG_START, () => {
    const win = windowManager.getWindow();
    if (!win) return;
    startBounds = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    startCursorX = cursor.x;
    startCursorY = cursor.y;
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_DRAG_MOVE, () => {
    if (!startBounds) return;
    const win = windowManager.getWindow();
    if (!win) return;
    const cursor = screen.getCursorScreenPoint();
    const dx = cursor.x - startCursorX;
    const dy = cursor.y - startCursorY;
    win.setPosition(startBounds.x + dx, startBounds.y + dy);
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_DRAG_END, () => {
    startBounds = null;
  });
}

/**
 * 注册窗口 resize 相关的 IPC 处理器
 * 通过 preload 中的自定义 resize 边框拖拽事件，手动调整窗口大小
 *
 * @param windowManager 窗口管理器实例
 */
export function registerResizeIpcHandlers(
  windowManager: WindowManager
): void {
  /** 记录拖拽开始时的窗口 bounds 和鼠标屏幕坐标 */
  let startBounds: Electron.Rectangle | null = null;
  let startCursorX = 0;
  let startCursorY = 0;
  let resizeEdge = '';

  // 最小窗口尺寸
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 150;

  ipcMain.on(IPC_CHANNELS.WINDOW_RESIZE_START, (_event, edge: string) => {
    const win = windowManager.getWindow();
    if (!win) return;
    startBounds = win.getBounds();
    const cursor = screen.getCursorScreenPoint();
    startCursorX = cursor.x;
    startCursorY = cursor.y;
    resizeEdge = edge;
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_RESIZE_MOVE, () => {
    if (!startBounds || !resizeEdge) return;
    const win = windowManager.getWindow();
    if (!win) return;

    const cursor = screen.getCursorScreenPoint();
    const dx = cursor.x - startCursorX;
    const dy = cursor.y - startCursorY;

    let { x, y, width, height } = startBounds;

    // 根据拖拽边缘计算新的 bounds
    if (resizeEdge.includes('right')) {
      width = Math.max(MIN_WIDTH, width + dx);
    }
    if (resizeEdge.includes('bottom')) {
      height = Math.max(MIN_HEIGHT, height + dy);
    }
    if (resizeEdge.includes('left')) {
      const newWidth = Math.max(MIN_WIDTH, width - dx);
      x = x + (width - newWidth);
      width = newWidth;
    }
    if (resizeEdge.includes('top')) {
      const newHeight = Math.max(MIN_HEIGHT, height - dy);
      y = y + (height - newHeight);
      height = newHeight;
    }

    win.setBounds({ x, y, width, height });
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_RESIZE_END, () => {
    startBounds = null;
    resizeEdge = '';
  });
}
