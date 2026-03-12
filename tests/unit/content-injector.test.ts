/**
 * ContentInjector 单元测试
 *
 * 测试 DOM 净化功能和终端伪装主题功能
 */

import { ContentInjector } from '@main/content-injector';
import { WEREAD_PURIFY_RULES } from '@main/types';
import { createMockWebContents, MockWebContents } from '../helpers';

describe('ContentInjector', () => {
  let injector: ContentInjector;
  let mockWebContents: MockWebContents;

  beforeEach(() => {
    injector = new ContentInjector();
    mockWebContents = createMockWebContents();
  });

  describe('generatePurifyCSS', () => {
    it('应根据净化规则生成包含所有选择器的 CSS', () => {
      const css = injector.generatePurifyCSS(WEREAD_PURIFY_RULES);

      // 验证所有 hide 规则的选择器都包含在生成的 CSS 中
      for (const rule of WEREAD_PURIFY_RULES) {
        if (rule.action === 'hide') {
          expect(css).toContain(rule.selector);
        }
      }
      // 验证使用 display: none !important
      expect(css).toContain('display: none !important');
    });

    it('空规则数组应返回空字符串', () => {
      const css = injector.generatePurifyCSS([]);
      expect(css).toBe('');
    });

    it('应只处理 action 为 hide 的规则', () => {
      const rules = [
        { selector: '.foo', action: 'hide' as const },
        { selector: '.bar', action: 'remove' as const },
      ];
      const css = injector.generatePurifyCSS(rules);
      expect(css).toContain('.foo');
      expect(css).not.toContain('.bar');
    });
  });

  describe('generateFullscreenCSS', () => {
    it('应生成正文区域全屏铺满样式', () => {
      const css = injector.generateFullscreenCSS();
      expect(css).toContain('width: 100% !important');
      expect(css).toContain('max-width: 100% !important');
      expect(css).toContain('margin: 0 !important');
      expect(css).toContain('padding: 0 !important');
    });
  });

  describe('injectPurifyStyles', () => {
    it('应调用 insertCSS 注入净化样式和全屏样式', async () => {
      mockWebContents.insertCSS
        .mockResolvedValueOnce('purify-key')
        .mockResolvedValueOnce('fullscreen-key');

      await injector.injectPurifyStyles(mockWebContents as any);

      // 应调用两次 insertCSS：一次净化规则，一次全屏样式
      expect(mockWebContents.insertCSS).toHaveBeenCalledTimes(2);
      expect(injector.isPurifyEnabled()).toBe(true);
    });

    it('注入后净化模式应为开启状态', async () => {
      await injector.injectPurifyStyles(mockWebContents as any);
      expect(injector.isPurifyEnabled()).toBe(true);
    });

    it('insertCSS 失败时不应抛出异常', async () => {
      mockWebContents.insertCSS.mockRejectedValue(new Error('注入失败'));

      await expect(
        injector.injectPurifyStyles(mockWebContents as any)
      ).resolves.not.toThrow();
    });
  });

  describe('togglePurify', () => {
    it('初始状态下 toggle 应注入净化样式', async () => {
      // 先注入一次以设置 webContents 引用
      await injector.injectPurifyStyles(mockWebContents as any);
      // 关闭净化
      await injector.togglePurify();
      expect(injector.isPurifyEnabled()).toBe(false);

      // 再次 toggle 应重新注入
      await injector.togglePurify();
      expect(injector.isPurifyEnabled()).toBe(true);
    });

    it('开启状态下 toggle 应移除净化样式', async () => {
      mockWebContents.insertCSS
        .mockResolvedValueOnce('purify-key')
        .mockResolvedValueOnce('fullscreen-key');

      await injector.injectPurifyStyles(mockWebContents as any);
      expect(injector.isPurifyEnabled()).toBe(true);

      await injector.togglePurify();
      expect(injector.isPurifyEnabled()).toBe(false);
      // 应调用 removeInsertedCSS 移除样式
      expect(mockWebContents.removeInsertedCSS).toHaveBeenCalled();
    });

    it('没有 webContents 时 toggle 不应抛出异常', async () => {
      await expect(injector.togglePurify()).resolves.not.toThrow();
      expect(injector.isPurifyEnabled()).toBe(false);
    });
  });

  describe('isPurifyEnabled', () => {
    it('初始状态应为 false', () => {
      expect(injector.isPurifyEnabled()).toBe(false);
    });
  });

  // ============================================================
  // 终端伪装主题测试
  // ============================================================

  describe('generateTerminalThemeCSS', () => {
    it('应包含黑色背景样式', () => {
      const css = injector.generateTerminalThemeCSS();
      expect(css).toContain('background-color: #000000 !important');
    });

    it('应包含绿色文字颜色', () => {
      const css = injector.generateTerminalThemeCSS();
      expect(css).toContain('color: #00FF00 !important');
    });

    it('应包含等宽字体族', () => {
      const css = injector.generateTerminalThemeCSS();
      expect(css).toContain('Consolas');
      expect(css).toContain('Fira Code');
      expect(css).toContain('Courier New');
      expect(css).toContain('monospace');
    });

    it('应包含 CSS counter 行号前缀规则', () => {
      const css = injector.generateTerminalThemeCSS();
      expect(css).toContain('counter-increment: line-number');
      expect(css).toContain('counter(line-number, decimal-leading-zero)');
      expect(css).toContain('" $ "');
    });

    it('应包含隐藏图片的规则', () => {
      const css = injector.generateTerminalThemeCSS();
      expect(css).toContain('img');
      expect(css).toContain('picture');
      expect(css).toContain('svg');
      expect(css).toContain('canvas');
      expect(css).toContain('display: none !important');
    });
  });

  describe('injectTerminalTheme', () => {
    it('应调用 insertCSS 注入终端主题样式', async () => {
      mockWebContents.insertCSS.mockResolvedValueOnce('terminal-css-key');

      await injector.injectTerminalTheme(mockWebContents as any);

      expect(mockWebContents.insertCSS).toHaveBeenCalledTimes(1);
      // 验证注入的 CSS 包含终端主题核心样式
      const injectedCSS = mockWebContents.insertCSS.mock.calls[0][0];
      expect(injectedCSS).toContain('#000000');
      expect(injectedCSS).toContain('#00FF00');
    });

    it('应执行 JavaScript 设置 counter-reset', async () => {
      await injector.injectTerminalTheme(mockWebContents as any);

      expect(mockWebContents.executeJavaScript).toHaveBeenCalledTimes(1);
      const jsCode = mockWebContents.executeJavaScript.mock.calls[0][0];
      expect(jsCode).toContain('counterReset');
      expect(jsCode).toContain('line-number');
    });

    it('注入后终端主题应为开启状态', async () => {
      await injector.injectTerminalTheme(mockWebContents as any);
      expect(injector.isTerminalThemeEnabled()).toBe(true);
    });

    it('insertCSS 失败时不应抛出异常', async () => {
      mockWebContents.insertCSS.mockRejectedValue(new Error('注入失败'));

      await expect(
        injector.injectTerminalTheme(mockWebContents as any)
      ).resolves.not.toThrow();
      // 注入失败时主题状态不应变为开启
      expect(injector.isTerminalThemeEnabled()).toBe(false);
    });
  });

  describe('removeTerminalTheme', () => {
    it('应调用 removeInsertedCSS 移除终端主题样式', async () => {
      mockWebContents.insertCSS.mockResolvedValueOnce('terminal-css-key');

      // 先注入
      await injector.injectTerminalTheme(mockWebContents as any);
      // 再移除
      await injector.removeTerminalTheme(mockWebContents as any);

      expect(mockWebContents.removeInsertedCSS).toHaveBeenCalledWith('terminal-css-key');
    });

    it('应执行 JavaScript 清除 counter-reset', async () => {
      await injector.injectTerminalTheme(mockWebContents as any);
      mockWebContents.executeJavaScript.mockClear();

      await injector.removeTerminalTheme(mockWebContents as any);

      expect(mockWebContents.executeJavaScript).toHaveBeenCalledTimes(1);
      const jsCode = mockWebContents.executeJavaScript.mock.calls[0][0];
      expect(jsCode).toContain("counterReset = ''");
    });

    it('移除后终端主题应为关闭状态', async () => {
      await injector.injectTerminalTheme(mockWebContents as any);
      expect(injector.isTerminalThemeEnabled()).toBe(true);

      await injector.removeTerminalTheme(mockWebContents as any);
      expect(injector.isTerminalThemeEnabled()).toBe(false);
    });

    it('没有 terminalCssKey 时不应调用 removeInsertedCSS', async () => {
      await injector.removeTerminalTheme(mockWebContents as any);
      expect(mockWebContents.removeInsertedCSS).not.toHaveBeenCalled();
    });
  });

  describe('toggleTerminalTheme', () => {
    it('关闭状态下 toggle 应注入终端主题', async () => {
      // 先通过 injectTerminalTheme 设置 webContents 引用
      await injector.injectTerminalTheme(mockWebContents as any);
      // 移除主题
      await injector.removeTerminalTheme(mockWebContents as any);
      expect(injector.isTerminalThemeEnabled()).toBe(false);

      // toggle 应重新注入
      await injector.toggleTerminalTheme();
      expect(injector.isTerminalThemeEnabled()).toBe(true);
    });

    it('开启状态下 toggle 应移除终端主题', async () => {
      await injector.injectTerminalTheme(mockWebContents as any);
      expect(injector.isTerminalThemeEnabled()).toBe(true);

      await injector.toggleTerminalTheme();
      expect(injector.isTerminalThemeEnabled()).toBe(false);
    });

    it('没有 webContents 时 toggle 不应抛出异常', async () => {
      await expect(injector.toggleTerminalTheme()).resolves.not.toThrow();
      expect(injector.isTerminalThemeEnabled()).toBe(false);
    });
  });

  describe('isTerminalThemeEnabled', () => {
    it('初始状态应为 false', () => {
      expect(injector.isTerminalThemeEnabled()).toBe(false);
    });
  });
});
