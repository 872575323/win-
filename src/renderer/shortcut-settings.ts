/**
 * 快捷键设置界面 - 渲染进程逻辑
 *
 * 通过 electronAPI（由 preload 脚本通过 contextBridge 暴露）与主进程通信，
 * 实现快捷键的查看、修改、冲突处理和恢复默认功能。
 *
 * 需求：6.5, 6.6, 6.7, 6.8
 */

export {};

// ============================================================
// 类型定义（与主进程 types.ts 保持一致）
// ============================================================

/** 快捷键绑定 */
interface ShortcutBinding {
  action: string;
  accelerator: string;
}

/** 快捷键冲突信息 */
interface ShortcutConflict {
  action: string;
  accelerator: string;
  conflictWith: string;
}

/** electronAPI 接口定义（由 preload 脚本暴露） */
interface ElectronAPI {
  getShortcuts: () => Promise<ShortcutBinding[]>;
  updateShortcut: (action: string, accelerator: string) => Promise<ShortcutConflict | null>;
  resetShortcuts: () => Promise<ShortcutBinding[]>;
  forceUpdateShortcut: (action: string, accelerator: string) => Promise<void>;
}

// 扩展 Window 类型以包含 electronAPI
// 实际的 contextBridge 暴露将在 preload 脚本中实现（任务 10.2）
const electronAPI: ElectronAPI = (window as any).electronAPI;

// ============================================================
// 操作名中文映射
// ============================================================

/** 操作名到中文显示名的映射 */
const ACTION_LABELS: Record<string, string> = {
  toggleVisibility: '显隐切换',
  toggleTerminalTheme: '终端主题切换',
  togglePurify: '净化模式切换',
  openAddressBar: '打开地址栏',
  quitApp: '退出应用',
  openShortcutSettings: '快捷键设置',
};

// ============================================================
// 状态管理
// ============================================================

/** 当前所有快捷键绑定 */
let currentBindings: ShortcutBinding[] = [];

/** 当前正在录制的操作名（null 表示未在录制） */
let recordingAction: string | null = null;

/** 待确认的冲突更新信息 */
let pendingConflictUpdate: { action: string; accelerator: string } | null = null;

// ============================================================
// DOM 元素引用
// ============================================================

const shortcutListEl = document.getElementById('shortcutList') as HTMLUListElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const statusHintEl = document.getElementById('statusHint') as HTMLSpanElement;
const conflictOverlay = document.getElementById('conflictOverlay') as HTMLDivElement;
const conflictMessage = document.getElementById('conflictMessage') as HTMLParagraphElement;
const conflictConfirm = document.getElementById('conflictConfirm') as HTMLButtonElement;
const conflictCancel = document.getElementById('conflictCancel') as HTMLButtonElement;

// ============================================================
// 渲染函数
// ============================================================

/**
 * 渲染快捷键列表
 * 遍历当前绑定，为每个操作生成一行显示
 */
function renderShortcutList(): void {
  shortcutListEl.innerHTML = '';

  for (const binding of currentBindings) {
    const li = document.createElement('li');
    li.className = 'shortcut-item';
    li.dataset.action = binding.action;

    const isRecording = recordingAction === binding.action;
    if (isRecording) {
      li.classList.add('recording');
    }

    // 操作名称
    const nameSpan = document.createElement('span');
    nameSpan.className = 'action-name';
    nameSpan.textContent = ACTION_LABELS[binding.action] || binding.action;

    // 快捷键显示
    const keySpan = document.createElement('span');
    keySpan.className = 'key-binding';
    if (isRecording) {
      keySpan.classList.add('recording');
      keySpan.textContent = '请按下新快捷键...';
    } else {
      keySpan.textContent = binding.accelerator;
    }

    li.appendChild(nameSpan);
    li.appendChild(keySpan);

    // 点击进入录制模式
    li.addEventListener('click', () => {
      startRecording(binding.action);
    });

    shortcutListEl.appendChild(li);
  }
}

// ============================================================
// 录制模式
// ============================================================

/**
 * 进入录制模式
 * 点击某个操作项后，开始监听键盘输入以捕获新的快捷键组合
 * @param action 要修改的操作名
 */
function startRecording(action: string): void {
  recordingAction = action;
  statusHintEl.textContent = '正在录制，请按下新的快捷键组合...';
  renderShortcutList();
}

/**
 * 退出录制模式
 */
function stopRecording(): void {
  recordingAction = null;
  statusHintEl.textContent = '按 Esc 关闭设置';
  renderShortcutList();
}

/**
 * 将 KeyboardEvent 转换为 Electron 风格的快捷键字符串
 * 例如：Ctrl+Shift+H, Alt+F4, Ctrl+L
 * @param e 键盘事件
 * @returns 快捷键字符串，如果仅按下修饰键则返回 null
 */
function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const parts: string[] = [];

  // 收集修饰键
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  if (e.metaKey) parts.push('Meta');

  // 获取主键（排除单独的修饰键）
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta'];
  if (modifierKeys.includes(e.key)) {
    // 仅按下修饰键，不构成有效快捷键
    return null;
  }

  // 特殊键名映射
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Escape': 'Escape',
    'Enter': 'Enter',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Tab': 'Tab',
  };

  let key = keyMap[e.key] || e.key.toUpperCase();

  // 功能键保持原样（F1-F12）
  if (/^F\d{1,2}$/.test(e.key)) {
    key = e.key;
  }

  parts.push(key);
  return parts.join('+');
}

// ============================================================
// 键盘事件处理
// ============================================================

/**
 * 全局键盘事件监听
 * 在录制模式下捕获快捷键组合，非录制模式下处理 Esc 关闭
 */
document.addEventListener('keydown', async (e: KeyboardEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // Esc 键：退出录制模式或关闭设置面板
  if (e.key === 'Escape') {
    if (recordingAction) {
      stopRecording();
    }
    return;
  }

  // 非录制模式下不处理其他按键
  if (!recordingAction) return;

  // 将键盘事件转换为快捷键字符串
  const accelerator = keyEventToAccelerator(e);
  if (!accelerator) return; // 仅修饰键，忽略

  // 尝试更新快捷键
  await tryUpdateShortcut(recordingAction, accelerator);
});

// ============================================================
// 快捷键更新逻辑
// ============================================================

/**
 * 尝试更新快捷键绑定
 * 如果存在冲突，弹出确认对话框；否则直接更新
 * @param action 操作名
 * @param accelerator 新的快捷键组合
 */
async function tryUpdateShortcut(action: string, accelerator: string): Promise<void> {
  try {
    const conflict = await electronAPI.updateShortcut(action, accelerator);

    if (conflict) {
      // 存在冲突，显示确认对话框
      showConflictDialog(action, accelerator, conflict);
    } else {
      // 更新成功，刷新列表
      await refreshBindings();
      stopRecording();
    }
  } catch (err) {
    console.error('更新快捷键失败:', err);
    stopRecording();
  }
}

/**
 * 显示快捷键冲突确认对话框
 * @param action 当前操作名
 * @param accelerator 冲突的快捷键
 * @param conflict 冲突信息
 */
function showConflictDialog(
  action: string,
  accelerator: string,
  conflict: ShortcutConflict
): void {
  const conflictActionLabel = ACTION_LABELS[conflict.conflictWith] || conflict.conflictWith;
  conflictMessage.textContent =
    `快捷键 "${accelerator}" 已被「${conflictActionLabel}」使用。是否覆盖原有绑定？`;

  pendingConflictUpdate = { action, accelerator };
  conflictOverlay.classList.add('visible');
}

/**
 * 隐藏冲突确认对话框
 */
function hideConflictDialog(): void {
  conflictOverlay.classList.remove('visible');
  pendingConflictUpdate = null;
}

// ============================================================
// 冲突对话框按钮事件
// ============================================================

/** 确认覆盖冲突快捷键 */
conflictConfirm.addEventListener('click', async () => {
  if (!pendingConflictUpdate) return;

  try {
    const { action, accelerator } = pendingConflictUpdate;
    await electronAPI.forceUpdateShortcut(action, accelerator);
    await refreshBindings();
  } catch (err) {
    console.error('强制更新快捷键失败:', err);
  }

  hideConflictDialog();
  stopRecording();
});

/** 取消覆盖 */
conflictCancel.addEventListener('click', () => {
  hideConflictDialog();
  stopRecording();
});

// ============================================================
// 恢复默认快捷键
// ============================================================

/** 恢复默认快捷键按钮点击事件 */
resetBtn.addEventListener('click', async () => {
  try {
    const defaults = await electronAPI.resetShortcuts();
    currentBindings = defaults;
    renderShortcutList();
    statusHintEl.textContent = '已恢复默认快捷键';
    // 2 秒后恢复提示文字
    setTimeout(() => {
      statusHintEl.textContent = '按 Esc 关闭设置';
    }, 2000);
  } catch (err) {
    console.error('恢复默认快捷键失败:', err);
  }
});

// ============================================================
// 数据加载
// ============================================================

/**
 * 从主进程获取最新的快捷键绑定并刷新列表
 */
async function refreshBindings(): Promise<void> {
  try {
    currentBindings = await electronAPI.getShortcuts();
    renderShortcutList();
  } catch (err) {
    console.error('获取快捷键绑定失败:', err);
  }
}

// ============================================================
// 初始化
// ============================================================

/** 页面加载完成后获取快捷键绑定并渲染 */
refreshBindings();
