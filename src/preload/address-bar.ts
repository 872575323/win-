/**
 * 地址栏模块 — 固定在页面顶部的 URL 输入栏
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

let addressBarContainer: HTMLDivElement | null = null;
let addressBarInput: HTMLInputElement | null = null;
let addressBarToggleBtn: HTMLButtonElement | null = null;

export function createAddressBar(onSettingsClick: () => void): void {
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
        ipcRenderer.send(IPC_CHANNELS.NAVIGATE_URL, finalUrl);
      }
    } else if (e.key === 'Escape') {
      hideAddressBar();
    }
  });

  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = '⚙';
  settingsBtn.title = '设置';
  settingsBtn.style.cssText = `
    padding: 4px 8px; background: #3a3a3a; color: #aaa;
    border: 1px solid #555; border-radius: 4px; font-size: 14px;
    cursor: pointer; -webkit-app-region: no-drag;
  `;
  settingsBtn.addEventListener('click', () => onSettingsClick());
  settingsBtn.addEventListener('mouseenter', () => { settingsBtn.style.color = '#fff'; });
  settingsBtn.addEventListener('mouseleave', () => { settingsBtn.style.color = '#aaa'; });

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
    ipcRenderer.send(IPC_CHANNELS.WINDOW_DRAG_START);
    const onMove = () => ipcRenderer.send(IPC_CHANNELS.WINDOW_DRAG_MOVE);
    const onUp = () => {
      ipcRenderer.send(IPC_CHANNELS.WINDOW_DRAG_END);
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

export function showAddressBar(): void {
  if (!addressBarContainer || !addressBarInput) return;
  addressBarContainer.style.display = 'flex';
  if (addressBarToggleBtn) addressBarToggleBtn.style.display = 'none';
  addressBarInput.value = window.location.href;
  addressBarInput.focus();
  addressBarInput.select();
}

export function hideAddressBar(): void {
  if (!addressBarContainer) return;
  addressBarContainer.style.display = 'none';
  if (addressBarToggleBtn) addressBarToggleBtn.style.display = 'block';
}

export function toggleAddressBar(): void {
  if (!addressBarContainer) return;
  addressBarContainer.style.display === 'none' ? showAddressBar() : hideAddressBar();
}

export function createAddressBarToggleBtn(): void {
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
}

export function initAddressBarListener(): void {
  ipcRenderer.on(IPC_CHANNELS.TOGGLE_ADDRESS_BAR, () => { toggleAddressBar(); });
}
