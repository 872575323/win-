/**
 * 沉浸式隐蔽小说阅读器 — 主进程入口
 *
 * 负责初始化所有核心模块并协调它们之间的交互：
 * - StateManager：加载/保存应用状态和快捷键配置
 * - WindowManager：创建和管理无边框透明窗口
 * - ContentInjector：注入净化样式和终端伪装主题
 * - StealthController：鼠标驱动的智能显隐
 * - ShortcutManager：全局快捷键注册和管理
 *
 * 需求：3.1, 7.1, 7.2, 7.3, 7.4, 5.7
 */

import { app, ipcMain } from 'electron';
import { StateManager } from './state-manager';
import { WindowManager } from './window-manager';
import { ContentInjector } from './content-injector';
import { StealthController } from './stealth-controller';
import { ShortcutManager } from './shortcut-manager';
import { registerShortcutIpcHandlers, registerNavigationIpcHandlers, registerResizeIpcHandlers } from './ipc-handlers';
import { IPC_CHANNELS } from './types';

// 模块实例引用（在 before-quit 中需要访问）
let stateManager: StateManager;
let windowManager: WindowManager;
let contentInjector: ContentInjector;

// ============================================================
// 应用就绪后初始化所有模块
// ============================================================
app.on('ready', async () => {
  // 1. 初始化状态管理器，加载保存的配置
  stateManager = new StateManager(app.getPath('userData'));
  const state = stateManager.load();
  const savedShortcuts = stateManager.loadShortcuts();

  // 2. 创建窗口管理器，根据保存的状态创建窗口
  windowManager = new WindowManager();
  const win = windowManager.createWindow({
    width: state.window.width,
    height: state.window.height,
    x: state.window.x,
    y: state.window.y,
    alwaysOnTop: state.alwaysOnTop,
    defaultUrl: state.url,
  });

  // 3. 加载保存的 URL
  windowManager.loadURL(state.url).catch((err) => {
    console.error('[主进程] URL 加载失败:', err);
  });

  // 4. 初始化内容注入器
  contentInjector = new ContentInjector();

  // 5. 页面加载完成后注入净化样式和终端主题（如已开启）
  win.webContents.on('did-finish-load', async () => {
    try {
      // 注入净化样式
      await contentInjector.injectPurifyStyles(win.webContents);

      // 如果上次退出时终端主题是开启的，恢复终端主题
      if (state.theme.terminalEnabled) {
        await contentInjector.injectTerminalTheme(win.webContents);
      }
    } catch (error) {
      console.error('[主进程] 页面加载后注入失败:', error);
    }
  });

  // 6. 初始化智能显隐控制器（自动启动鼠标位置轮询）
  const stealthController = new StealthController(win);

  // 8. 初始化快捷键管理器，绑定各操作的回调
  const shortcutManager = new ShortcutManager({
    toggleVisibility: () => stealthController.toggle(),
    toggleTerminalTheme: () => contentInjector.toggleTerminalTheme(),
    togglePurify: () => contentInjector.togglePurify(),
    openAddressBar: () => {
      // 向渲染进程发送切换地址栏的消息
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TOGGLE_ADDRESS_BAR);
      }
    },
    quitApp: () => app.quit(),
    openShortcutSettings: () => {
      // 向渲染进程发送切换快捷键设置面板的消息
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TOGGLE_SETTINGS);
      }
    },
  });

  // 9. 使用保存的快捷键绑定注册所有快捷键
  shortcutManager.registerAll(savedShortcuts);

  // 10. 注册快捷键相关的 IPC 处理器
  registerShortcutIpcHandlers(shortcutManager, stateManager);

  // 11. 注册导航相关的 IPC 处理器
  registerNavigationIpcHandlers(windowManager);

  // 12. 注册窗口 resize 相关的 IPC 处理器
  registerResizeIpcHandlers(windowManager);

  console.log('[主进程] 沉浸式隐蔽小说阅读器已启动');
});

// ============================================================
// 应用退出前保存当前状态
// ============================================================
app.on('before-quit', () => {
  try {
    if (!stateManager || !windowManager || !contentInjector) return;

    // 获取当前窗口位置和尺寸
    const bounds = windowManager.getBounds();
    const win = windowManager.getWindow();

    // 保存完整的应用状态
    stateManager.save({
      window: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      theme: {
        terminalEnabled: contentInjector.isTerminalThemeEnabled(),
      },
      url: win?.webContents?.getURL() || 'https://weread.qq.com',
      alwaysOnTop: win?.isAlwaysOnTop() ?? false,
    });
  } catch (error) {
    console.error('[主进程] 退出前保存状态失败:', error);
  }
});

// ============================================================
// 所有窗口关闭时退出应用（macOS 除外）
// ============================================================
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
