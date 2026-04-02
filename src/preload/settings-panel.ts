/**
 * 设置面板模块 — 快捷键配置、功能开关、字体缩放
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import { isPurifyActive, setPurifyActive, purifySubtree, startPurifyObserver, stopPurifyObserver } from './purify';

let settingsPanel: HTMLDivElement | null = null;
let settingsPanelVisible = false;
let settingsRecordingAction: string | null = null;

const ACTION_LABELS: Record<string, string> = {
  toggleVisibility: '显隐切换',
  toggleTerminalTheme: '终端主题',
  togglePurify: '净化模式',
  openAddressBar: '地址栏',
  quitApp: '退出应用',
  openShortcutSettings: '设置面板',
};

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

async function renderSettingsShortcuts(): Promise<void> {
  const listEl = document.getElementById('settings-shortcut-list');
  if (!listEl) return;

  try {
    const bindings = await ipcRenderer.invoke(IPC_CHANNELS.GET_SHORTCUTS);
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

export function createSettingsPanel(): void {
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

  toggleSection.appendChild(createToggleRow('净化模式', '隐藏微信读书页面干扰元素', isPurifyActive(), (val) => {
    setPurifyActive(val);
    if (val) {
      purifySubtree(document.body);
      startPurifyObserver();
    } else {
      stopPurifyObserver();
    }
    ipcRenderer.send(IPC_CHANNELS.PURIFY_CHANGED, val);
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
  ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS_STATE).then((state: any) => {
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
    ipcRenderer.send(IPC_CHANNELS.ZOOM_CHANGED, currentZoom);
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
    await ipcRenderer.invoke(IPC_CHANNELS.RESET_SHORTCUTS);
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

export function toggleSettingsPanel(): void {
  if (!settingsPanel) return;
  settingsPanelVisible = !settingsPanelVisible;
  settingsPanel.style.display = settingsPanelVisible ? 'block' : 'none';
  if (settingsPanelVisible) renderSettingsShortcuts();
  settingsRecordingAction = null;
}

export function initSettingsKeyboardListener(): void {
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
      await ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SHORTCUT, settingsRecordingAction, parts.join('+'));
    } catch (err) { /* 忽略 */ }

    settingsRecordingAction = null;
    await renderSettingsShortcuts();
  }, true);
}

export function initSettingsListener(): void {
  ipcRenderer.on(IPC_CHANNELS.TOGGLE_SETTINGS, () => { toggleSettingsPanel(); });
}
