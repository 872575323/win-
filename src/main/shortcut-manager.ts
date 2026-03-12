/**
 * ShortcutManager — 快捷键管理器
 *
 * 管理全局快捷键的注册、注销、冲突检测和自定义绑定。
 * 需求：6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 6.9
 */

import { globalShortcut } from 'electron';
import { ShortcutBinding, ShortcutConflict, DEFAULT_SHORTCUTS } from './types';

export class ShortcutManager {
  /** 当前快捷键绑定列表 */
  private bindings: ShortcutBinding[];

  /** 操作名到回调函数的映射 */
  private callbacks: Record<string, () => void>;

  /**
   * @param callbacks 操作名到回调函数的映射
   */
  constructor(callbacks: Record<string, () => void>) {
    this.callbacks = callbacks;
    // 初始化为默认快捷键的深拷贝
    this.bindings = DEFAULT_SHORTCUTS.map((b) => ({ ...b }));
  }

  /**
   * 注册所有快捷键
   * 使用 globalShortcut.register() 逐一注册，注册失败时记录日志警告
   * 需求：6.1, 6.3
   */
  registerAll(bindings: ShortcutBinding[]): void {
    // 更新内部绑定列表
    this.bindings = bindings.map((b) => ({ ...b }));

    for (const binding of this.bindings) {
      const callback = this.callbacks[binding.action];
      if (!callback) {
        console.warn(
          `[ShortcutManager] 操作 "${binding.action}" 没有对应的回调函数，跳过注册`
        );
        continue;
      }

      const success = globalShortcut.register(binding.accelerator, callback);
      if (!success) {
        console.warn(
          `[ShortcutManager] 快捷键 "${binding.accelerator}" 注册失败，可能与系统或其他应用冲突`
        );
      }
    }
  }

  /**
   * 注销所有已注册的快捷键
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll();
  }

  /**
   * 更新单个快捷键绑定
   * 先检测冲突，无冲突时注销旧快捷键、注册新快捷键
   * 需求：6.6, 6.7, 6.9
   *
   * @param action 操作名称
   * @param newAccelerator 新的快捷键组合
   * @returns 冲突信息（如有），成功时返回 null
   */
  updateBinding(action: string, newAccelerator: string): ShortcutConflict | null {
    // 检测冲突（排除当前操作自身）
    const conflict = this.detectConflict(newAccelerator, action);
    if (conflict) {
      return conflict;
    }

    // 查找当前绑定
    const bindingIndex = this.bindings.findIndex((b) => b.action === action);
    if (bindingIndex === -1) {
      console.warn(`[ShortcutManager] 未找到操作 "${action}" 的绑定`);
      return null;
    }

    const oldAccelerator = this.bindings[bindingIndex].accelerator;

    // 注销旧快捷键
    try {
      globalShortcut.unregister(oldAccelerator);
    } catch {
      // 旧快捷键可能已被注销，忽略错误
    }

    // 更新绑定
    this.bindings[bindingIndex] = { action, accelerator: newAccelerator };

    // 注册新快捷键
    const callback = this.callbacks[action];
    if (callback) {
      const success = globalShortcut.register(newAccelerator, callback);
      if (!success) {
        console.warn(
          `[ShortcutManager] 新快捷键 "${newAccelerator}" 注册失败`
        );
      }
    }

    return null;
  }

  /**
   * 检测快捷键冲突
   * 检查是否有其他操作（排除 excludeAction）使用了相同的快捷键
   * 需求：6.7
   *
   * @param accelerator 要检测的快捷键组合
   * @param excludeAction 排除的操作名（通常是当前正在更新的操作）
   * @returns 冲突信息，无冲突时返回 null
   */
  detectConflict(accelerator: string, excludeAction?: string): ShortcutConflict | null {
    for (const binding of this.bindings) {
      // 跳过被排除的操作
      if (excludeAction && binding.action === excludeAction) {
        continue;
      }

      // 比较快捷键（不区分大小写）
      if (binding.accelerator.toLowerCase() === accelerator.toLowerCase()) {
        return {
          action: excludeAction ?? '',
          accelerator,
          conflictWith: binding.action,
        };
      }
    }

    return null;
  }

  /**
   * 恢复默认快捷键
   * 注销所有当前快捷键，重置为默认绑定并重新注册
   * 需求：6.8
   *
   * @returns 恢复后的默认快捷键绑定列表
   */
  resetToDefaults(): ShortcutBinding[] {
    this.unregisterAll();
    const defaults = DEFAULT_SHORTCUTS.map((b) => ({ ...b }));
    this.registerAll(defaults);
    return this.getAllBindings();
  }

  /**
   * 获取所有当前快捷键绑定（返回副本）
   */
  getAllBindings(): ShortcutBinding[] {
    return this.bindings.map((b) => ({ ...b }));
  }

  /**
   * 获取默认快捷键绑定（返回副本）
   */
  getDefaultBindings(): ShortcutBinding[] {
    return DEFAULT_SHORTCUTS.map((b) => ({ ...b }));
  }
}
