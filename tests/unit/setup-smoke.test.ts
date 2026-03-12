/**
 * 冒烟测试 — 验证 Jest + ts-jest + fast-check 测试环境配置正确
 */
import fc from 'fast-check';
import { createMockBrowserWindow, createMockGlobalShortcut, createMockApp } from '../helpers';

describe('测试环境冒烟测试', () => {
  it('Jest 和 ts-jest 正常工作', () => {
    expect(1 + 1).toBe(2);
  });

  it('fast-check 正常工作', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        // 加法交换律
        expect(a + b).toBe(b + a);
      })
    );
  });

  it('mock 工厂函数正常工作', () => {
    const win = createMockBrowserWindow();
    const shortcut = createMockGlobalShortcut();
    const app = createMockApp();

    // 验证 BrowserWindow mock
    win.setOpacity(0.5);
    expect(win.setOpacity).toHaveBeenCalledWith(0.5);
    expect(win.getOpacity()).toBe(0.5);

    // 验证 globalShortcut mock
    shortcut.register('Ctrl+Shift+H', () => {});
    expect(shortcut.isRegistered('Ctrl+Shift+H')).toBe(true);

    // 验证 app mock
    expect(app.getPath('userData')).toBe('/tmp/stealth-novel-reader-test');
  });
});
