/**
 * 沉浸式隐蔽小说阅读器 - 预加载脚本入口
 * 通过 contextBridge 暴露安全的 IPC 接口，集成地址栏、设置面板、净化、resize
 */

import { contextBridge, ipcRenderer } from 'electron';

// ============================================================
// contextBridge 暴露 IPC 接口
// ============================================================

contextBridge.exposeInMainWorld('electronAPI', {
  getShortcuts: () => ipcRenderer.invoke('shortcuts:get-all'),
  updateShortcut: (action: string, accelerator: string) =>
    ipcRenderer.invoke('shortcuts:update', action, accelerator),
  resetShortcuts: () => ipcRenderer.invoke('shortcuts:reset'),
  forceUpdateShortcut: (action: string, accelerator: string) =>
    ipcRenderer.invoke('shortcuts:update', action, accelerator),
  navigateToUrl: (url: string) => ipcRenderer.send('navigate:url', url),
  resizeStart: (edge: string) => ipcRenderer.send('window:resize-start', edge),
  resizeMove: () => ipcRenderer.send('window:resize-move'),
  resizeEnd: () => ipcRenderer.send('window:resize-end'),
});

// ============================================================
// DOM 净化
// ============================================================

// 净化选择器（仅针对阅读页面的干扰元素，不影响书架等页面）
const PURIFY_SELECTORS = [
  '.readerTopBar', '.readerFooter', '.readerControls',
  '.readerCatalog', '.readerComment', '.readerSocial',
];

let purifyActive = true;
let purifyObserver: MutationObserver | null = null;

function purifyElement(element: Element): void {
  for (const sel of PURIFY_SELECTORS) {
    if (element.matches(sel)) {
      (element as HTMLElement).style.setProperty('display', 'none', 'important');
      return;
    }
  }
}

function purifySubtree(root: Element): void {
  for (const sel of PURIFY_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });
  }
}

function startPurifyObserver(): void {
  if (purifyObserver) purifyObserver.disconnect();
  purifyObserver = new MutationObserver((mutations) => {
    if (!purifyActive) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        purifyElement(el);
        purifySubtree(el);
      }
    }
  });
  purifyObserver.observe(document.body, { childList: true, subtree: true });
}

function stopPurifyObserver(): void {
  if (purifyObserver) { purifyObserver.disconnect(); purifyObserver = null; }
}

ipcRenderer.on('purify:toggle', (_event, enabled?: boolean) => {
  purifyActive = typeof enabled === 'boolean' ? enabled : !purifyActive;
  if (purifyActive) {
    // 重新净化整个页面
    purifySubtree(document.body);
    startPurifyObserver();
  } else {
    stopPurifyObserver();
  }
});

// ============================================================
// 地址栏
// ============================================================

let addressBarContainer: HTMLDivElement | null = null;
let addressBarInput: HTMLInputElement | null = null;
let addressBarToggleBtn: HTMLButtonElement | null = null;

function createAddressBar(): void {
  addressBarContainer = document.createElement('div');
  addressBarContainer.id = 'stealth-address-bar';
  addressBarContainer.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 999999;
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: rgba(30, 30, 30, 0.92);
    border-bottom: 1px solid #444;
    opacity: 0.3; transition: opacity 0.2s;
    -webkit-app-region: no-drag;
  `;

  // 鼠标离开地址栏透明度 30%，移入全显示
  addressBarContainer.addEventListener('mouseenter', () => {
    if (addressBarContainer) addressBarContainer.style.opacity = '1';
  });
  addressBarContainer.addEventListener('mouseleave', () => {
    if (addressBarContainer) addressBarContainer.style.opacity = '0.3';
  });

  addressBarInput = document.createElement('input');
  addressBarInput.type = 'text';
  addressBarInput.placeholder = '输入 URL 按 Enter 导航，Esc 隐藏';
  addressBarInput.style.cssText = `
    flex: 1; padding: 5px 10px; background: #2a2a2a; color: #e0e0e0;
    border: 1px solid #555; border-radius: 4px; font-size: 13px;
    font-family: Consolas, "Fira Code", monospace; outline: none;
    box-sizing: border-box; -webkit-app-region: no-drag;
  `;

  // 收起按钮
  const hideBtn = document.createElement('button');
  hideBtn.textContent = '▲';
  hideBtn.title = '隐藏地址栏';
  hideBtn.style.cssText = `
    padding: 4px 8px; background: #3a3a3a; color: #aaa;
    border: 1px solid #555; border-radius: 4px; font-size: 12px;
    cursor: pointer; -webkit-app-region: no-drag;
  `;
  hideBtn.addEventListener('click', () => hideAddressBar());
  hideBtn.addEventListener('mouseenter', () => { hideBtn.style.color = '#fff'; });
  hideBtn.addEventListener('mouseleave', () => { hideBtn.style.color = '#aaa'; });

  addressBarInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const url = addressBarInput!.value.trim();
      if (url) {
        const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
        ipcRenderer.send('navigate:url', finalUrl);
      }
    } else if (e.key === 'Escape') {
      hideAddressBar();
    }
  });

  // 设置按钮（放在地址栏内，输入框右侧）
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '⚙';
  settingsBtn.title = '设置';
  settingsBtn.style.cssText = `
    padding: 4px 8px; background: #3a3a3a; color: #aaa;
    border: 1px solid #555; border-radius: 4px; font-size: 14px;
    cursor: pointer; -webkit-app-region: no-drag;
  `;
  settingsBtn.addEventListener('click', () => toggleSettingsPanel());
  settingsBtn.addEventListener('mouseenter', () => { settingsBtn.style.color = '#fff'; });
  settingsBtn.addEventListener('mouseleave', () => { settingsBtn.style.color = '#aaa'; });

  // 拖拽按钮（按住通过 IPC 手动移动窗口）
  const dragBtn = document.createElement('button');
  dragBtn.textContent = '点击拖拽';
  dragBtn.title = '按住拖动窗口';
  dragBtn.setAttribute('data-drag', 'true');
  dragBtn.style.cssText = `
    padding: 4px 14px; background: #3a3a3a; color: #aaa;
    border: 1px solid #555; border-radius: 4px; font-size: 12px;
    cursor: move; white-space: nowrap; -webkit-app-region: no-drag;
  `;
  dragBtn.addEventListener('mouseenter', () => { dragBtn.style.color = '#fff'; });
  dragBtn.addEventListener('mouseleave', () => { dragBtn.style.color = '#aaa'; });
  dragBtn.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.send('window:drag-start');
    const onMove = () => ipcRenderer.send('window:drag-move');
    const onUp = () => {
      ipcRenderer.send('window:drag-end');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  addressBarContainer.appendChild(addressBarInput);
  addressBarContainer.appendChild(settingsBtn);
  addressBarContainer.appendChild(dragBtn);
  addressBarContainer.appendChild(hideBtn);
  document.body.appendChild(addressBarContainer);
  addressBarInput.value = window.location.href;
}

function showAddressBar(): void {
  if (!addressBarContainer || !addressBarInput) return;
  addressBarContainer.style.display = 'flex';
  if (addressBarToggleBtn) addressBarToggleBtn.style.display = 'none';
  addressBarInput.value = window.location.href;
  addressBarInput.focus();
  addressBarInput.select();
}

function hideAddressBar(): void {
  if (!addressBarContainer) return;
  addressBarContainer.style.display = 'none';
  if (addressBarToggleBtn) addressBarToggleBtn.style.display = 'block';
}

function toggleAddressBar(): void {
  if (!addressBarContainer) return;
  addressBarContainer.style.display === 'none' ? showAddressBar() : hideAddressBar();
}

ipcRenderer.on('address-bar:toggle', () => { toggleAddressBar(); });

// ============================================================
// 设置面板（直接用 ipcRenderer 调用，不经过 contextBridge）
// ============================================================

let settingsPanel: HTMLDivElement | null = null;
let settingsPanelVisible = false;
let settingsRecordingAction: string | null = null;

/** 操作名中文映射 */
const ACTION_LABELS: Record<string, string> = {
  toggleVisibility: '显隐切换',
  toggleTerminalTheme: '终端主题',
  togglePurify: '净化模式',
  openAddressBar: '地址栏',
  quitApp: '退出应用',
  openShortcutSettings: '设置面板',
};

function createSettingsPanel(): void {
  settingsPanel = document.createElement('div');
  settingsPanel.id = 'stealth-settings-panel';
  settingsPanel.style.cssText = `
    position: fixed; top: 36px; right: 12px; width: 340px; max-height: 70vh;
    z-index: 999999; display: none;
    background: rgba(30, 30, 30, 0.97); border: 1px solid #444;
    border-radius: 8px; padding: 16px; overflow-y: auto;
    font-family: -apple-system, "Microsoft YaHei", sans-serif; color: #d4d4d4;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5); -webkit-app-region: no-drag;
  `;

  // 标题
  const title = document.createElement('div');
  title.style.cssText = `font-size: 15px; font-weight: 600; color: #e0e0e0;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #444;`;
  title.textContent = '⚙ 设置';
  settingsPanel.appendChild(title);

  // 快捷键区域
  const shortcutSection = document.createElement('div');
  const shortcutTitle = document.createElement('div');
  shortcutTitle.style.cssText = 'font-size: 13px; color: #888; margin-bottom: 8px;';
  shortcutTitle.textContent = '快捷键';
  shortcutSection.appendChild(shortcutTitle);

  const shortcutList = document.createElement('div');
  shortcutList.id = 'settings-shortcut-list';
  shortcutSection.appendChild(shortcutList);
  settingsPanel.appendChild(shortcutSection);

  // 分隔线
  const sep1 = document.createElement('div');
  sep1.style.cssText = 'border-top: 1px solid #444; margin: 12px 0;';
  settingsPanel.appendChild(sep1);

  // 功能开关区域
  const toggleSection = document.createElement('div');
  const toggleTitle = document.createElement('div');
  toggleTitle.style.cssText = 'font-size: 13px; color: #888; margin-bottom: 8px;';
  toggleTitle.textContent = '功能开关';
  toggleSection.appendChild(toggleTitle);

  // 净化模式开关
  toggleSection.appendChild(createToggleRow('净化模式', '隐藏微信读书页面干扰元素', purifyActive, (val) => {
    purifyActive = val;
    if (val) {
      purifySubtree(document.body);
      startPurifyObserver();
    } else {
      stopPurifyObserver();
    }
    // 通知主进程同步状态（持久化）
    ipcRenderer.send('settings:purify-changed', val);
  }));

  settingsPanel.appendChild(toggleSection);

  // 分隔线
  const sep2 = document.createElement('div');
  sep2.style.cssText = 'border-top: 1px solid #444; margin: 12px 0;';
  settingsPanel.appendChild(sep2);

  // 字体大小调节区域
  const zoomSection = document.createElement('div');
  const zoomTitle = document.createElement('div');
  zoomTitle.style.cssText = 'font-size: 13px; color: #888; margin-bottom: 8px;';
  zoomTitle.textContent = '字体大小';
  zoomSection.appendChild(zoomTitle);

  const zoomRow = document.createElement('div');
  zoomRow.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px;';

  const zoomDownBtn = document.createElement('button');
  zoomDownBtn.textContent = '−';
  zoomDownBtn.style.cssText = `
    width: 28px; height: 28px; background: #3a3d41; color: #ccc;
    border: 1px solid #555; border-radius: 4px; font-size: 16px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    -webkit-app-region: no-drag;
  `;

  const zoomLabel = document.createElement('span');
  zoomLabel.style.cssText = 'font-size: 13px; color: #ccc; min-width: 40px; text-align: center;';
  let currentZoom = 100;
  // 从主进程获取当前缩放值
  ipcRenderer.invoke('settings:get-state').then((state: any) => {
    if (state && state.fontSize) {
      currentZoom = state.fontSize;
      zoomLabel.textContent = currentZoom + '%';
    }
  });
  zoomLabel.textContent = currentZoom + '%';

  const zoomUpBtn = document.createElement('button');
  zoomUpBtn.textContent = '+';
  zoomUpBtn.style.cssText = zoomDownBtn.style.cssText;

  const updateZoom = (delta: number) => {
    currentZoom = Math.max(50, Math.min(200, currentZoom + delta));
    zoomLabel.textContent = currentZoom + '%';
    ipcRenderer.send('settings:zoom-changed', currentZoom);
  };

  zoomDownBtn.addEventListener('click', () => updateZoom(-10));
  zoomUpBtn.addEventListener('click', () => updateZoom(10));

  zoomRow.appendChild(zoomDownBtn);
  zoomRow.appendChild(zoomLabel);
  zoomRow.appendChild(zoomUpBtn);
  zoomSection.appendChild(zoomRow);
  settingsPanel.appendChild(zoomSection);

  // 分隔线
  const sep3 = document.createElement('div');
  sep3.style.cssText = 'border-top: 1px solid #444; margin: 12px 0;';
  settingsPanel.appendChild(sep3);

  // 底部操作
  const footer = document.createElement('div');
  footer.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '恢复默认快捷键';
  resetBtn.style.cssText = `
    padding: 4px 12px; background: #3a3d41; color: #ccc;
    border: 1px solid #555; border-radius: 4px; font-size: 12px;
    cursor: pointer; -webkit-app-region: no-drag;
  `;
  resetBtn.addEventListener('click', async () => {
    await ipcRenderer.invoke('shortcuts:reset');
    await renderSettingsShortcuts();
  });

  const hint = document.createElement('span');
  hint.style.cssText = 'font-size: 11px; color: #666;';
  hint.textContent = '点击快捷键可修改';

  footer.appendChild(resetBtn);
  footer.appendChild(hint);
  settingsPanel.appendChild(footer);

  document.body.appendChild(settingsPanel);
}

/** 创建功能开关行 */
function createToggleRow(
  label: string, desc: string, initial: boolean,
  onChange: (val: boolean) => void
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 8px; border-radius: 4px;
  `;

  const left = document.createElement('div');
  const nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-size: 13px; color: #ccc;';
  nameEl.textContent = label;
  const descEl = document.createElement('div');
  descEl.style.cssText = 'font-size: 11px; color: #666; margin-top: 2px;';
  descEl.textContent = desc;
  left.appendChild(nameEl);
  left.appendChild(descEl);

  // 开关按钮
  const toggle = document.createElement('button');
  let enabled = initial;
  const updateToggle = () => {
    toggle.textContent = enabled ? '开' : '关';
    toggle.style.background = enabled ? '#0e639c' : '#3a3d41';
    toggle.style.color = enabled ? '#fff' : '#888';
  };
  toggle.style.cssText = `
    padding: 3px 12px; border: 1px solid #555; border-radius: 4px;
    font-size: 12px; cursor: pointer; min-width: 40px;
    -webkit-app-region: no-drag;
  `;
  updateToggle();
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    updateToggle();
    onChange(enabled);
  });

  row.appendChild(left);
  row.appendChild(toggle);
  return row;
}

/** 渲染快捷键列表（直接用 ipcRenderer） */
async function renderSettingsShortcuts(): Promise<void> {
  const listEl = document.getElementById('settings-shortcut-list');
  if (!listEl) return;

  try {
    const bindings = await ipcRenderer.invoke('shortcuts:get-all');
    listEl.innerHTML = '';

    for (const binding of bindings) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 8px; border-radius: 4px; cursor: pointer;
        transition: background 0.15s;
      `;
      row.addEventListener('mouseenter', () => { row.style.background = '#2a2d2e'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'transparent'; });

      const label = document.createElement('span');
      label.style.cssText = 'font-size: 13px; color: #ccc;';
      label.textContent = ACTION_LABELS[binding.action] || binding.action;

      const keyEl = document.createElement('span');
      keyEl.style.cssText = `
        font-size: 12px; font-family: Consolas, monospace; color: #569cd6;
        background: #2d2d2d; padding: 2px 8px; border-radius: 3px;
        border: 1px solid #404040; min-width: 80px; text-align: center;
      `;
      keyEl.textContent = binding.accelerator;

      row.addEventListener('click', () => {
        if (settingsRecordingAction === binding.action) return;
        settingsRecordingAction = binding.action;
        keyEl.textContent = '按下快捷键...';
        keyEl.style.color = '#dcdcaa';
        keyEl.style.borderColor = '#569cd6';
      });

      row.appendChild(label);
      row.appendChild(keyEl);
      listEl.appendChild(row);
    }
  } catch (e) {
    console.error('[设置面板] 获取快捷键失败:', e);
  }
}

function toggleSettingsPanel(): void {
  if (!settingsPanel) return;
  settingsPanelVisible = !settingsPanelVisible;
  settingsPanel.style.display = settingsPanelVisible ? 'block' : 'none';
  if (settingsPanelVisible) renderSettingsShortcuts();
  settingsRecordingAction = null;
}

// ============================================================
// 页面加载完成后初始化
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  // 注入样式
  const style = document.createElement('style');
  style.textContent = `
    /* 隐藏滚动条但保留滚动功能 */
    ::-webkit-scrollbar { display: none !important; }
    html, body { scrollbar-width: none !important; }

    input, button:not([data-drag]), a, select, textarea, [class*="reader"], iframe {
      -webkit-app-region: no-drag;
    }
    .resize-border { position: fixed; z-index: 999998; -webkit-app-region: no-drag; }
    .resize-border-top    { top: 0; left: 0; right: 0; height: 4px; cursor: n-resize; }
    .resize-border-bottom { bottom: 0; left: 0; right: 0; height: 4px; cursor: s-resize; }
    .resize-border-left   { top: 0; bottom: 0; left: 0; width: 4px; cursor: w-resize; }
    .resize-border-right  { top: 0; bottom: 0; right: 0; width: 4px; cursor: e-resize; }
    .resize-border-top-left     { top: 0; left: 0; width: 8px; height: 8px; cursor: nw-resize; z-index: 999999; }
    .resize-border-top-right    { top: 0; right: 0; width: 8px; height: 8px; cursor: ne-resize; z-index: 999999; }
    .resize-border-bottom-left  { bottom: 0; left: 0; width: 8px; height: 8px; cursor: sw-resize; z-index: 999999; }
    .resize-border-bottom-right { bottom: 0; right: 0; width: 8px; height: 8px; cursor: se-resize; z-index: 999999; }
  `;
  document.head.appendChild(style);

  // 创建 resize 边框
  const edges = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  for (const edge of edges) {
    const div = document.createElement('div');
    div.className = `resize-border resize-border-${edge}`;
    div.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.send('window:resize-start', edge);
      const onMove = () => ipcRenderer.send('window:resize-move');
      const onUp = () => {
        ipcRenderer.send('window:resize-end');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    document.body.appendChild(div);
  }

  // 创建地址栏
  createAddressBar();

  // 地址栏展开按钮（隐藏后左上角显示）
  addressBarToggleBtn = document.createElement('button');
  addressBarToggleBtn.textContent = '▼';
  addressBarToggleBtn.title = '显示地址栏';
  addressBarToggleBtn.style.cssText = `
    position: fixed; top: 4px; left: 8px; z-index: 999999; display: none;
    padding: 2px 8px; background: rgba(50,50,50,0.7); color: #aaa;
    border: 1px solid #555; border-radius: 4px; font-size: 11px;
    cursor: pointer; opacity: 0.3; transition: opacity 0.2s;
    -webkit-app-region: no-drag;
  `;
  addressBarToggleBtn.addEventListener('click', () => showAddressBar());
  addressBarToggleBtn.addEventListener('mouseenter', () => {
    if (addressBarToggleBtn) addressBarToggleBtn.style.opacity = '1';
  });
  addressBarToggleBtn.addEventListener('mouseleave', () => {
    if (addressBarToggleBtn) addressBarToggleBtn.style.opacity = '0.3';
  });
  document.body.appendChild(addressBarToggleBtn);

  // 创建设置面板（位于地址栏下方）
  createSettingsPanel();

  // 快捷键录制的全局键盘监听
  document.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (!settingsRecordingAction) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      settingsRecordingAction = null;
      await renderSettingsShortcuts();
      return;
    }

    const modKeys = ['Control', 'Shift', 'Alt', 'Meta'];
    if (modKeys.includes(e.key)) return;

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const keyMap: Record<string, string> = {
      ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down',
      'ArrowLeft': 'Left', 'ArrowRight': 'Right',
    };
    let key = keyMap[e.key] || e.key.toUpperCase();
    if (/^F\d{1,2}$/.test(e.key)) key = e.key;
    parts.push(key);

    try {
      await ipcRenderer.invoke('shortcuts:update', settingsRecordingAction, parts.join('+'));
    } catch (err) { /* 忽略 */ }

    settingsRecordingAction = null;
    await renderSettingsShortcuts();
  }, true);

  // 净化模式由主进程在 did-finish-load 后通过 purify:toggle 消息控制
  // 不在此处硬编码启动，避免页面刷新后状态不一致
});
