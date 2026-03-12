/**
 * WindowManager 单元测试
 * 验证窗口创建、URL 加载、错误处理等核心功能
 */

import { WindowManager } from '../../src/main/window-manager';
import { WindowManagerConfig } from '../../src/main/types';

// 模拟 webContents 事件监听器存储
let didFailLoadCallback: ((...args: unknown[]) => void) | null = null;

// 模拟 BrowserWindow 实例
const mockLoadURL = jest.fn().mockResolvedValue(undefined);
const mockGetBounds = jest.fn().mockReturnValue({ x: 100, y: 200, width: 800, height: 600 });
const mockWebContentsOn = jest.fn((event: string, callback: (...args: unknown[]) => void) => {
  if (event === 'did-fail-load') {
    didFailLoadCallback = callback;
  }
});
const mockWebContentsLoadURL = jest.fn().mockResolvedValue(undefined);

// 模拟 once 方法（用于 ready-to-show 事件）
const mockOnce = jest.fn();
const mockShow = jest.fn();

const mockBrowserWindowInstance = {
  loadURL: mockLoadURL,
  getBounds: mockGetBounds,
  once: mockOnce,
  show: mockShow,
  webContents: {
    on: mockWebContentsOn,
    loadURL: mockWebContentsLoadURL,
  },
};

// 模拟 Electron 的 BrowserWindow 构造函数
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => mockBrowserWindowInstance),
}));

import { BrowserWindow } from 'electron';

describe('WindowManager', () => {
  let windowManager: WindowManager;
  const defaultConfig: WindowManagerConfig = {
    width: 800,
    height: 600,
    alwaysOnTop: false,
    defaultUrl: 'https://weread.qq.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    didFailLoadCallback = null;
    windowManager = new WindowManager();
  });

  describe('createWindow', () => {
    it('应创建无边框透明窗口', () => {
      windowManager.createWindow(defaultConfig);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          frame: false,
          transparent: true,
        })
      );
    });

    it('应使用配置中的尺寸', () => {
      windowManager.createWindow(defaultConfig);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 600,
        })
      );
    });

    it('应支持自定义位置', () => {
      const configWithPos: WindowManagerConfig = {
        ...defaultConfig,
        x: 150,
        y: 250,
      };
      windowManager.createWindow(configWithPos);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 150,
          y: 250,
        })
      );
    });

    it('应强制启用 alwaysOnTop 永远前置', () => {
      windowManager.createWindow(defaultConfig);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          alwaysOnTop: true,
        })
      );
    });

    it('应启用 contextIsolation 并关闭 sandbox', () => {
      windowManager.createWindow(defaultConfig);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            contextIsolation: true,
            sandbox: false,
          }),
        })
      );
    });

    it('应配置预加载脚本路径', () => {
      windowManager.createWindow(defaultConfig);

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            preload: expect.stringContaining('preload'),
          }),
        })
      );
    });

    it('应监听 did-fail-load 事件', () => {
      windowManager.createWindow(defaultConfig);

      expect(mockWebContentsOn).toHaveBeenCalledWith(
        'did-fail-load',
        expect.any(Function)
      );
    });

    it('应返回 BrowserWindow 实例', () => {
      const win = windowManager.createWindow(defaultConfig);
      expect(win).toBe(mockBrowserWindowInstance);
    });
  });

  describe('getWindow', () => {
    it('窗口未创建时应返回 null', () => {
      expect(windowManager.getWindow()).toBeNull();
    });

    it('窗口创建后应返回实例', () => {
      windowManager.createWindow(defaultConfig);
      expect(windowManager.getWindow()).toBe(mockBrowserWindowInstance);
    });
  });

  describe('getBounds', () => {
    it('窗口未创建时应返回默认尺寸', () => {
      const bounds = windowManager.getBounds();
      expect(bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });

    it('窗口创建后应返回实际位置和尺寸', () => {
      windowManager.createWindow(defaultConfig);
      const bounds = windowManager.getBounds();
      expect(bounds).toEqual({ x: 100, y: 200, width: 800, height: 600 });
    });
  });

  describe('loadURL', () => {
    it('应加载指定 URL', async () => {
      windowManager.createWindow(defaultConfig);
      await windowManager.loadURL('https://weread.qq.com');
      expect(mockLoadURL).toHaveBeenCalledWith('https://weread.qq.com');
    });

    it('窗口未创建时应抛出错误', async () => {
      await expect(windowManager.loadURL('https://weread.qq.com'))
        .rejects.toThrow('窗口尚未创建');
    });
  });

  describe('did-fail-load 错误处理', () => {
    it('加载失败时应渲染包含重试按钮的错误页面', () => {
      windowManager.createWindow(defaultConfig);

      // 触发 did-fail-load 回调
      expect(didFailLoadCallback).not.toBeNull();
      didFailLoadCallback!({}, -105, 'ERR_NAME_NOT_RESOLVED');

      // 验证加载了 data URL 错误页面
      expect(mockWebContentsLoadURL).toHaveBeenCalledWith(
        expect.stringContaining('data:text/html')
      );
    });

    it('错误页面应包含错误码和描述', () => {
      windowManager.createWindow(defaultConfig);
      didFailLoadCallback!({}, -105, 'ERR_NAME_NOT_RESOLVED');

      const loadedUrl = mockWebContentsLoadURL.mock.calls[0][0] as string;
      const decodedHtml = decodeURIComponent(loadedUrl.replace('data:text/html;charset=utf-8,', ''));
      expect(decodedHtml).toContain('-105');
      expect(decodedHtml).toContain('ERR_NAME_NOT_RESOLVED');
    });

    it('错误页面应包含重试按钮', () => {
      windowManager.createWindow(defaultConfig);
      didFailLoadCallback!({}, -105, 'ERR_NAME_NOT_RESOLVED');

      const loadedUrl = mockWebContentsLoadURL.mock.calls[0][0] as string;
      const decodedHtml = decodeURIComponent(loadedUrl.replace('data:text/html;charset=utf-8,', ''));
      expect(decodedHtml).toContain('location.reload()');
      expect(decodedHtml).toContain('重试');
    });
  });
});
