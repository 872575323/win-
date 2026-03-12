/**
 * 沉浸式隐蔽小说阅读器 — 主进程入口
 *
 * 负责初始化所有核心模块并协调它们之间的交互：
 * - StateManager：加载/保存应用状态和快捷键配置
 * - WindowManager：创建和管理无边框透明窗口
 * - ContentInjector：注入净化样式和终端伪装主题
 * - StealthController：鼠标驱动的智能显隐
 * - ShortcutManager：全局快捷键注册和管理
 */

import { app, ipcMain } from 'electron';
import { StateManager } from './state-manager';
import { WindowManager } from './window-manager';
import { ContentInjector } from './content-injector';
import { StealthController } from './stealth-controller';
import { ShortcutManager } from './shortcut-manager';
import { registerShortcutIpcHandlers, registerNavigationIpcHandlers, registerResizeIpcHandlers, registerDragIpcHandlers } from './ipc-handlers';
import { IPC_CHANNELS, AppState } from './types';

// 模块实例引用
let stateManager: StateManager;
let windowManager: WindowManager;
let contentInjector: ContentInjector;

// 运行时状态（跟踪当前实际状态，页面刷新时据此恢复）
let currentState: AppState;

// ============================================================
// 应用就绪后初始化所有模块
// ============================================================
app.on('ready', async () => {
  // 1. 初始化状态管理器，加载保存的配置
  stateManager = new StateManager(app.getPath('userData'));
  currentState = stateManager.load();

  // 兼容旧配置文件
  if (currentState.purifyEnabled === undefined) {
    currentState.purifyEnabled = true;
  }
  if (currentState.fontSize === undefined) {
    currentState.fontSize = 100;
  }

  const savedShortcuts = stateManager.loadShortcuts();

  // 2. 创建窗口管理器
  windowManager = new WindowManager();
  const win = windowManager.createWindow({
    width: currentState.window.width,
    height: currentState.window.height,
    x: currentState.window.x,
    y: currentState.window.y,
    alwaysOnTop: currentState.alwaysOnTop,
    defaultUrl: currentState.url,
  });

  // 3. 加载保存的 URL
  windowManager.loadURL(currentState.url).catch((err) => {
    console.error('[主进程] URL 加载失败:', err);
  });

  // 4. 初始化内容注入器
  contentInjector = new ContentInjector();

  // 5. 页面加载完成后根据当前运行时状态恢复注入
  win.webContents.on('did-finish-load', async () => {
    try {
      // 重置注入器内部状态（页面刷新后旧 CSS key 已失效）
      contentInjector.resetState();

      // 根据当前状态恢复净化模式
      if (currentState.purifyEnabled) {
        await contentInjector.injectPurifyStyles(win.webContents);
      }

      // 根据当前状态恢复终端主题
      if (currentState.theme.terminalEnabled) {
        await contentInjector.injectTerminalTheme(win.webContents);
      }

      // 通知渲染进程当前净化状态（preload 据此初始化 MutationObserver）
      win.webContents.send(IPC_CHANNELS.PURIFY_TOGGLE, currentState.purifyEnabled);

      // 恢复页面缩放级别
      const zoomFactor = (currentState.fontSize || 100) / 100;
      win.webContents.setZoomFactor(zoomFactor);
    } catch (error) {
      console.error('[主进程] 页面加载后注入失败:', error);
    }
  });

  // 6. 初始化智能显隐控制器
  const stealthController = new StealthController(win);

  // 7. 注册设置状态查询 IPC（preload 用来获取当前状态）
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS_STATE, () => {
    return {
      purifyEnabled: currentState.purifyEnabled,
      terminalEnabled: currentState.theme.terminalEnabled,
      fontSize: currentState.fontSize || 100,
    };
  });

  // 8. 初始化快捷键管理器
  const shortcutManager = new ShortcutManager({
    toggleVisibility: () => stealthController.toggle(),
    toggleTerminalTheme: async () => {
      await contentInjector.toggleTerminalTheme();
      // 同步更新运行时状态
      currentState.theme.terminalEnabled = contentInjector.isTerminalThemeEnabled();
    },
    togglePurify: async () => {
      await contentInjector.togglePurify();
      // 同步更新运行时状态
      currentState.purifyEnabled = contentInjector.isPurifyEnabled();
      // 通知渲染进程更新 MutationObserver
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.PURIFY_TOGGLE, currentState.purifyEnabled);
      }
    },
    openAddressBar: () => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TOGGLE_ADDRESS_BAR);
      }
    },
    quitApp: () => app.quit(),
    openShortcutSettings: () => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TOGGLE_SETTINGS);
      }
    },
  });

  // 9. 注册快捷键
  shortcutManager.registerAll(savedShortcuts);

  // 10. 注册 IPC 处理器
  registerShortcutIpcHandlers(shortcutManager, stateManager);
  registerNavigationIpcHandlers(windowManager);
  registerResizeIpcHandlers(windowManager);
  registerDragIpcHandlers(windowManager);

  // 11. 监听渲染进程设置面板中的净化模式变更
  ipcMain.on(IPC_CHANNELS.PURIFY_CHANGED, async (_event, enabled: boolean) => {
    currentState.purifyEnabled = enabled;
    if (enabled && !contentInjector.isPurifyEnabled()) {
      await contentInjector.injectPurifyStyles(win.webContents);
    } else if (!enabled && contentInjector.isPurifyEnabled()) {
      await contentInjector.removePurifyStyles(win.webContents);
    }
  });

  // 12. 监听缩放变更
  ipcMain.on(IPC_CHANNELS.ZOOM_CHANGED, (_event, fontSize: number) => {
    currentState.fontSize = fontSize;
    const zoomFactor = fontSize / 100;
    if (win && !win.isDestroyed()) {
      win.webContents.setZoomFactor(zoomFactor);
    }
  });

  console.log('[主进程] 沉浸式隐蔽小说阅读器已启动');
});

// ============================================================
// 应用退出前保存当前状态
// ============================================================
app.on('before-quit', () => {
  try {
    if (!stateManager || !windowManager || !contentInjector) return;

    const bounds = windowManager.getBounds();
    const win = windowManager.getWindow();

    stateManager.save({
      window: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      theme: {
        terminalEnabled: currentState.theme.terminalEnabled,
      },
      purifyEnabled: currentState.purifyEnabled,
      fontSize: currentState.fontSize || 100,
      url: win?.webContents?.getURL() || 'https://weread.qq.com',
      alwaysOnTop: win?.isAlwaysOnTop() ?? false,
    });
  } catch (error) {
    console.error('[主进程] 退出前保存状态失败:', error);
  }
});

// ============================================================
// 所有窗口关闭时退出应用
// ============================================================
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
