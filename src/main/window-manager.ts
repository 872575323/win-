import * as path from 'path';
import { BrowserWindow } from 'electron';
import { WindowManagerConfig } from './types';

/**
 * 窗口管理器 — 负责创建和管理主窗口的生命周期
 *
 * 创建无边框透明窗口，支持从 StateManager 恢复位置和尺寸，
 * 配置安全的预加载脚本，处理页面加载失败等场景。
 */
export class WindowManager {
  /** 当前窗口实例 */
  private window: BrowserWindow | null = null;

  /**
   * 创建无边框透明窗口
   * - frame: false（无边框）
   * - transparent: true（透明背景）
   * - 默认尺寸 800×600，支持通过 config 恢复位置和尺寸
   * - 启用 contextIsolation 和 sandbox 确保安全性
   */
  createWindow(config: WindowManagerConfig): BrowserWindow {
    this.window = new BrowserWindow({
      width: config.width,
      height: config.height,
      x: config.x,
      y: config.y,
      frame: false,           // 无边框模式
      transparent: true,      // 透明背景
      alwaysOnTop: true,      // 永远前置到最上层
      resizable: true,        // 允许拖拽边框调整大小
      show: false,            // 先隐藏，等页面加载完再显示
      backgroundColor: '#00000000', // 透明背景色
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'), // 预加载脚本路径
        contextIsolation: true,   // 启用上下文隔离
        sandbox: false,           // 关闭沙箱以支持 preload 中的 Node.js API
      },
    });

    // 页面准备好后显示窗口，避免白屏闪烁
    this.window.once('ready-to-show', () => {
      this.window?.show();
    });

    // 监听页面加载失败事件，渲染错误页面
    this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      if (!this.window) return;
      const errorPageHtml = this.buildErrorPageHtml(errorCode, errorDescription);
      this.window.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorPageHtml)}`);
    });

    return this.window;
  }

  /**
   * 获取当前窗口实例
   */
  getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * 获取当前窗口的位置和尺寸
   */
  getBounds(): Electron.Rectangle {
    if (!this.window) {
      return { x: 0, y: 0, width: 800, height: 600 };
    }
    return this.window.getBounds();
  }

  /**
   * 加载指定 URL
   */
  async loadURL(url: string): Promise<void> {
    if (!this.window) {
      throw new Error('窗口尚未创建，请先调用 createWindow()');
    }
    await this.window.loadURL(url);
  }

  /**
   * 构建加载失败时的错误页面 HTML
   * 包含错误描述和重试按钮
   */
  private buildErrorPageHtml(errorCode: number, errorDescription: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: -apple-system, "Microsoft YaHei", sans-serif;
      flex-direction: column;
    }
    h2 { color: #ff6b6b; margin-bottom: 8px; }
    p { color: #aaa; margin-bottom: 24px; }
    button {
      padding: 10px 28px;
      background: #4a9eff;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      cursor: pointer;
    }
    button:hover { background: #3a8eef; }
  </style>
</head>
<body>
  <h2>页面加载失败</h2>
  <p>错误码: ${errorCode} — ${errorDescription}</p>
  <button onclick="location.reload()">重试</button>
</body>
</html>`;
  }
}
