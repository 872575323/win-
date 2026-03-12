/**
 * ShortcutManager 单元测试
 * 验证快捷键管理器的核心功能：注册、注销、冲突检测、更新绑定、恢复默认
 * 需求：6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 6.9
 */

import { ShortcutManager } from '../../src/main/shortcut-manager';
import { DEFAULT_SHORTCUTS, ShortcutBinding } from '../../src/main/types';
import { createMockGlobalShortcut, MockGlobalShortcut } from '../helpers';

// mock electron 的 globalShortcut 模块
let mockGlobalShortcut: MockGlobalShortcut;

jest.mock('electron', () => ({
  get globalShortcut() {
    return mockGlobalShortcut;
  },
}));

describe('ShortcutManager', () => {
  /** 测试用回调函数映射 */
  const callbacks: Record<string, () => void> = {
    toggleVisibility: jest.fn(),
    toggleTerminalTheme: jest.fn(),
    togglePurify: jest.fn(),
    openAddressBar: jest.fn(),
    quitApp: jest.fn(),
    openShortcutSettings: jest.fn(),
  };

  let manager: ShortcutManager;

  beforeEach(() => {
    mockGlobalShortcut = createMockGlobalShortcut();
    manager = new ShortcutManager(callbacks);
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('初始绑定应等于默认快捷键', () => {
      const bindings = manager.getAllBindings();
      expect(bindings).toEqual(DEFAULT_SHORTCUTS);
    });

    it('初始绑定应为默认快捷键的副本（非同一引用）', () => {
      const bindings = manager.getAllBindings();
      expect(bindings).not.toBe(DEFAULT_SHORTCUTS);
      bindings.forEach((b, i) => {
        expect(b).not.toBe(DEFAULT_SHORTCUTS[i]);
      });
    });
  });

  describe('registerAll()', () => {
    it('应为每个绑定调用 globalShortcut.register()', () => {
      const bindings: ShortcutBinding[] = [
        { action: 'toggleVisibility', accelerator: 'Ctrl+Shift+H' },
        { action: 'quitApp', accelerator: 'Ctrl+Q' },
      ];

      manager.registerAll(bindings);

      expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'Ctrl+Shift+H',
        expect.any(Function)
      );
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'Ctrl+Q',
        expect.any(Function)
      );
    });

    it('注册后 getAllBindings 应返回新的绑定列表', () => {
      const bindings: ShortcutBinding[] = [
        { action: 'toggleVisibility', accelerator: 'Ctrl+Alt+V' },
      ];

      manager.registerAll(bindings);

      expect(manager.getAllBindings()).toEqual(bindings);
    });

    it('注册失败时应记录警告但不抛出异常', () => {
      mockGlobalShortcut.register.mockReturnValue(false);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const bindings: ShortcutBinding[] = [
        { action: 'toggleVisibility', accelerator: 'Ctrl+Shift+H' },
      ];

      expect(() => manager.registerAll(bindings)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('注册失败')
      );

      warnSpy.mockRestore();
    });

    it('操作没有对应回调时应跳过注册并记录警告', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const bindings: ShortcutBinding[] = [
        { action: 'unknownAction', accelerator: 'Ctrl+U' },
      ];

      manager.registerAll(bindings);

      expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('没有对应的回调函数')
      );

      warnSpy.mockRestore();
    });
  });

  describe('unregisterAll()', () => {
    it('应调用 globalShortcut.unregisterAll()', () => {
      manager.unregisterAll();

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('detectConflict()', () => {
    it('存在冲突时应返回冲突信息', () => {
      // 默认绑定中 toggleVisibility 使用 Ctrl+Shift+H
      const conflict = manager.detectConflict('Ctrl+Shift+H');

      expect(conflict).not.toBeNull();
      expect(conflict!.conflictWith).toBe('toggleVisibility');
      expect(conflict!.accelerator).toBe('Ctrl+Shift+H');
    });

    it('不存在冲突时应返回 null', () => {
      const conflict = manager.detectConflict('Ctrl+Alt+Z');

      expect(conflict).toBeNull();
    });

    it('排除指定操作后不应检测到冲突', () => {
      // Ctrl+Shift+H 属于 toggleVisibility，排除后不应冲突
      const conflict = manager.detectConflict('Ctrl+Shift+H', 'toggleVisibility');

      expect(conflict).toBeNull();
    });

    it('冲突检测应不区分大小写', () => {
      const conflict = manager.detectConflict('ctrl+shift+h');

      expect(conflict).not.toBeNull();
      expect(conflict!.conflictWith).toBe('toggleVisibility');
    });
  });

  describe('updateBinding()', () => {
    beforeEach(() => {
      // 先注册默认快捷键
      manager.registerAll(DEFAULT_SHORTCUTS.map((b) => ({ ...b })));
      jest.clearAllMocks();
    });

    it('无冲突时应成功更新绑定并返回 null', () => {
      const result = manager.updateBinding('toggleVisibility', 'Ctrl+Alt+V');

      expect(result).toBeNull();

      const bindings = manager.getAllBindings();
      const updated = bindings.find((b) => b.action === 'toggleVisibility');
      expect(updated!.accelerator).toBe('Ctrl+Alt+V');
    });

    it('更新时应注销旧快捷键并注册新快捷键', () => {
      manager.updateBinding('toggleVisibility', 'Ctrl+Alt+V');

      expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith('Ctrl+Shift+H');
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'Ctrl+Alt+V',
        expect.any(Function)
      );
    });

    it('存在冲突时应返回冲突信息且不更新绑定', () => {
      // Ctrl+Q 已被 quitApp 使用
      const result = manager.updateBinding('toggleVisibility', 'Ctrl+Q');

      expect(result).not.toBeNull();
      expect(result!.conflictWith).toBe('quitApp');

      // 绑定不应被修改
      const bindings = manager.getAllBindings();
      const original = bindings.find((b) => b.action === 'toggleVisibility');
      expect(original!.accelerator).toBe('Ctrl+Shift+H');
    });

    it('更新不存在的操作时应返回 null 且不抛出异常', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = manager.updateBinding('nonExistentAction', 'Ctrl+X');

      expect(result).toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe('resetToDefaults()', () => {
    it('应恢复为默认快捷键绑定', () => {
      // 先修改一个绑定
      manager.registerAll(DEFAULT_SHORTCUTS.map((b) => ({ ...b })));
      manager.updateBinding('toggleVisibility', 'Ctrl+Alt+V');
      jest.clearAllMocks();

      const result = manager.resetToDefaults();

      expect(result).toEqual(DEFAULT_SHORTCUTS);
    });

    it('应调用 unregisterAll 和 registerAll', () => {
      manager.resetToDefaults();

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
      // registerAll 会为每个有回调的绑定调用 register
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
    });

    it('多次调用结果应相同（幂等性）', () => {
      const first = manager.resetToDefaults();
      const second = manager.resetToDefaults();

      expect(first).toEqual(second);
      expect(first).toEqual(DEFAULT_SHORTCUTS);
    });
  });

  describe('getAllBindings()', () => {
    it('应返回当前绑定的副本', () => {
      const bindings1 = manager.getAllBindings();
      const bindings2 = manager.getAllBindings();

      expect(bindings1).toEqual(bindings2);
      expect(bindings1).not.toBe(bindings2);
    });

    it('修改返回值不应影响内部状态', () => {
      const bindings = manager.getAllBindings();
      bindings[0].accelerator = 'MODIFIED';

      const fresh = manager.getAllBindings();
      expect(fresh[0].accelerator).not.toBe('MODIFIED');
    });
  });

  describe('getDefaultBindings()', () => {
    it('应返回默认快捷键绑定', () => {
      expect(manager.getDefaultBindings()).toEqual(DEFAULT_SHORTCUTS);
    });

    it('应返回副本而非原始引用', () => {
      const defaults = manager.getDefaultBindings();
      expect(defaults).not.toBe(DEFAULT_SHORTCUTS);
      defaults.forEach((b, i) => {
        expect(b).not.toBe(DEFAULT_SHORTCUTS[i]);
      });
    });
  });
});
