/**
 * ContentInjector — 内容注入器
 *
 * 负责向 WebContents 注入 CSS/JS 以净化页面内容和应用终端伪装主题。
 * 通过 webContents.insertCSS() 注入样式，并追踪 CSS key 以便后续移除。
 */

import type { WebContents } from 'electron';
import { WEREAD_PURIFY_RULES, PurifyRule } from './types';

export class ContentInjector {
  /** 净化模式是否开启 */
  private purifyEnabled = false;

  /** 终端伪装主题是否开启 */
  private terminalThemeEnabled = false;

  /** 已注入的净化 CSS key（用于移除） */
  private purifyCssKey: string | null = null;

  /** 已注入的全屏铺满 CSS key（用于移除） */
  private fullscreenCssKey: string | null = null;

  /** 终端主题 CSS key（用于移除） */
  private terminalCssKey: string | null = null;

  /** 当前关联的 WebContents 引用 */
  private webContents: WebContents | null = null;

  /**
   * 根据净化规则生成隐藏元素的 CSS 字符串
   * @param rules 净化规则数组
   * @returns CSS 样式字符串
   */
  generatePurifyCSS(rules: PurifyRule[]): string {
    const selectors = rules
      .filter((rule) => rule.action === 'hide')
      .map((rule) => rule.selector);

    if (selectors.length === 0) return '';

    // 使用 display: none !important 强制隐藏匹配元素
    return `${selectors.join(',\n')} {\n  display: none !important;\n}`;
  }

  /**
   * 生成正文区域全屏铺满的 CSS 字符串
   * @returns CSS 样式字符串
   */
  generateFullscreenCSS(): string {
    return `.readerContent,
.reader_content,
.app_content {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}`;
  }

  /**
   * 生成终端伪装主题的 CSS 字符串
   * 包含黑底绿字等宽字体、CSS counter 行号前缀、隐藏图片元素
   * @returns CSS 样式字符串
   */
  generateTerminalThemeCSS(): string {
    return `/* 终端伪装核心样式 */
body {
  background-color: #000000 !important;
  color: #00FF00 !important;
  font-family: Consolas, "Fira Code", "Courier New", monospace !important;
}

/* 段落行号前缀通过 CSS counter */
.reader_content p {
  counter-increment: line-number;
}
.reader_content p::before {
  content: counter(line-number, decimal-leading-zero) " $ ";
  color: #00AA00;
  opacity: 0.6;
}

/* 隐藏所有图片 */
img, picture, svg, canvas {
  display: none !important;
}`;
  }

  /**
   * 注入净化 CSS 样式到指定 WebContents
   * 隐藏导航栏、工具栏、侧边栏、头像、评论区、背景装饰，
   * 并使正文区域全屏铺满。
   *
   * @param webContents Electron WebContents 实例
   */
  async injectPurifyStyles(webContents: WebContents): Promise<void> {
    // 保存 webContents 引用，供 toggle 方法使用
    this.webContents = webContents;

    try {
      // 注入净化规则 CSS
      const purifyCSS = this.generatePurifyCSS(WEREAD_PURIFY_RULES);
      if (purifyCSS) {
        this.purifyCssKey = await webContents.insertCSS(purifyCSS);
      }

      // 注入全屏铺满样式
      const fullscreenCSS = this.generateFullscreenCSS();
      this.fullscreenCssKey = await webContents.insertCSS(fullscreenCSS);

      // 标记净化模式已开启
      this.purifyEnabled = true;
    } catch (error) {
      console.error('[ContentInjector] 注入净化样式失败:', error);
    }
  }

  /**
   * 移除已注入的净化 CSS 样式
   * @param webContents Electron WebContents 实例
   */
  async removePurifyStyles(webContents: WebContents): Promise<void> {
    try {
      if (this.purifyCssKey) {
        await webContents.removeInsertedCSS(this.purifyCssKey);
        this.purifyCssKey = null;
      }
      if (this.fullscreenCssKey) {
        await webContents.removeInsertedCSS(this.fullscreenCssKey);
        this.fullscreenCssKey = null;
      }
      this.purifyEnabled = false;
    } catch (error) {
      console.error('[ContentInjector] 移除净化样式失败:', error);
    }
  }

  /**
   * 切换净化模式的开启/关闭
   * 如果当前已开启则移除净化样式，否则注入净化样式。
   */
  async togglePurify(): Promise<void> {
    if (!this.webContents) return;

    if (this.purifyEnabled) {
      await this.removePurifyStyles(this.webContents);
    } else {
      await this.injectPurifyStyles(this.webContents);
    }
  }

  /**
   * 获取净化模式是否开启
   * @returns 净化模式状态
   */
  isPurifyEnabled(): boolean {
    return this.purifyEnabled;
  }

  /**
   * 注入终端伪装主题
   * 注入黑底绿字等宽字体样式、CSS counter 行号前缀、隐藏图片元素。
   *
   * @param webContents Electron WebContents 实例
   */
  async injectTerminalTheme(webContents: WebContents): Promise<void> {
    // 保存 webContents 引用，供 toggle 方法使用
    this.webContents = webContents;

    try {
      // 注入终端主题 CSS
      const terminalCSS = this.generateTerminalThemeCSS();
      this.terminalCssKey = await webContents.insertCSS(terminalCSS);

      // 通过 JS 注入 CSS counter-reset，确保行号从 0 开始递增
      await webContents.executeJavaScript(`
        (function() {
          var container = document.querySelector('.reader_content') || document.querySelector('.readerContent');
          if (container) {
            container.style.counterReset = 'line-number';
          }
        })();
      `);

      // 标记终端主题已开启
      this.terminalThemeEnabled = true;
    } catch (error) {
      console.error('[ContentInjector] 注入终端主题失败:', error);
    }
  }

  /**
   * 移除终端伪装主题
   * 移除已注入的终端主题 CSS 并清除 counter-reset。
   *
   * @param webContents Electron WebContents 实例
   */
  async removeTerminalTheme(webContents: WebContents): Promise<void> {
    try {
      // 移除已注入的终端主题 CSS
      if (this.terminalCssKey) {
        await webContents.removeInsertedCSS(this.terminalCssKey);
        this.terminalCssKey = null;
      }

      // 通过 JS 移除 counter-reset
      await webContents.executeJavaScript(`
        (function() {
          var container = document.querySelector('.reader_content') || document.querySelector('.readerContent');
          if (container) {
            container.style.counterReset = '';
          }
        })();
      `);

      // 标记终端主题已关闭
      this.terminalThemeEnabled = false;
    } catch (error) {
      console.error('[ContentInjector] 移除终端主题失败:', error);
    }
  }

  /**
   * 切换终端伪装主题的开启/关闭
   * 如果当前已开启则移除主题，否则注入主题。
   */
  async toggleTerminalTheme(): Promise<void> {
    if (!this.webContents) return;

    if (this.terminalThemeEnabled) {
      await this.removeTerminalTheme(this.webContents);
    } else {
      await this.injectTerminalTheme(this.webContents);
    }
  }

  /**
   * 获取终端伪装主题是否开启
   * @returns 终端主题状态
   */
  isTerminalThemeEnabled(): boolean {
    return this.terminalThemeEnabled;
  }
}
