/**
 * 沉浸式隐蔽小说阅读器 - 预加载脚本入口
 * 导入各子模块，统一初始化
 */

import './bridge';
import { initPurifyListener } from './purify';
import { createAddressBar, createAddressBarToggleBtn, initAddressBarListener } from './address-bar';
import { createSettingsPanel, toggleSettingsPanel, initSettingsKeyboardListener, initSettingsListener } from './settings-panel';
import { createResizeBorders } from './resize-borders';

// 注册 IPC 监听器
initPurifyListener();
initAddressBarListener();
initSettingsListener();

// 页面加载完成后初始化 UI
window.addEventListener('DOMContentLoaded', () => {
  // 注入全局样式
  const style = document.createElement('style');
  style.textContent = `
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

  createResizeBorders();
  createAddressBar(() => toggleSettingsPanel());
  createAddressBarToggleBtn();
  createSettingsPanel();
  initSettingsKeyboardListener();
});
