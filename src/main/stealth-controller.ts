/**
 * StealthController — 智能显隐控制器
 *
 * 通过主进程定时轮询鼠标屏幕坐标，判断鼠标是否在窗口范围内，
 * 控制窗口的透明度实现显隐切换。
 * 不依赖渲染进程的 DOM 事件，避免透明窗口下 mouseenter/mouseleave 不可靠的问题。
 * 需求：2.1, 2.2, 2.3, 2.4, 2.5
 */

import { screen } from 'electron';
import type { BrowserWindow } from 'electron';

/** 获取 BrowserWindow 实例的函数类型 */
type WindowGetter = () => BrowserWindow | null;

/** 鼠标轮询间隔（毫秒） */
const POLL_INTERVAL = 100;

export class StealthController {
  /** 当前是否可见 */
  private visible: boolean = true;

  /** 获取窗口实例的函数 */
  private getWindow: WindowGetter;

  /** 轮询定时器 */
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * @param windowOrGetter BrowserWindow 实例或返回实例的函数
   * @param autoStart 是否自动启动鼠标轮询，默认 true
   */
  constructor(windowOrGetter: BrowserWindow | WindowGetter, autoStart: boolean = true) {
    if (typeof windowOrGetter === 'function') {
      this.getWindow = windowOrGetter;
    } else {
      this.getWindow = () => windowOrGetter;
    }

    // 自动启动鼠标位置轮询
    if (autoStart) {
      this.startPolling();
    }
  }

  /**
   * 检查窗口是否可用（存在且未销毁）
   */
  private isWindowAvailable(): boolean {
    const win = this.getWindow();
    return win !== null && !win.isDestroyed();
  }

  /**
   * 判断鼠标屏幕坐标是否在窗口范围内
   */
  private isCursorInWindow(): boolean {
    if (!this.isWindowAvailable()) return false;

    const win = this.getWindow()!;
    const bounds = win.getBounds();
    const cursor = screen.getCursorScreenPoint();

    return (
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height
    );
  }

  /**
   * 启动鼠标位置轮询
   */
  startPolling(): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      if (!this.isWindowAvailable()) return;

      const cursorInWindow = this.isCursorInWindow();

      if (cursorInWindow && !this.visible) {
        this.show();
      } else if (!cursorInWindow && this.visible) {
        this.hide();
      }
    }, POLL_INTERVAL);
  }

  /**
   * 停止鼠标位置轮询
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * 显示窗口：不透明度 → 1.0，关闭点击穿透
   * 需求：2.1
   */
  show(): void {
    if (!this.isWindowAvailable()) return;

    const win = this.getWindow()!;
    win.setOpacity(1.0);
    win.setIgnoreMouseEvents(false);
    this.visible = true;
  }

  /**
   * 隐藏窗口：不透明度 → 极低值，开启点击穿透
   * 需求：2.2, 2.3, 2.4
   */
  hide(): void {
    if (!this.isWindowAvailable()) return;

    const win = this.getWindow()!;
    win.setOpacity(0.01);
    win.setIgnoreMouseEvents(true, { forward: true });
    this.visible = false;
  }

  /**
   * 切换显隐状态
   * 需求：2.5
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 获取当前可见状态
   */
  isVisible(): boolean {
    return this.visible;
  }
}
