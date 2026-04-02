/**
 * DOM 净化模块 — 隐藏微信读书页面干扰元素
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const PURIFY_SELECTORS = [
  '.readerTopBar', '.readerFooter', '.readerControls',
  '.readerCatalog', '.readerComment', '.readerSocial',
];

let purifyActive = true;
let purifyObserver: MutationObserver | null = null;

export function isPurifyActive(): boolean {
  return purifyActive;
}

export function setPurifyActive(val: boolean): void {
  purifyActive = val;
}

export function purifyElement(element: Element): void {
  for (const sel of PURIFY_SELECTORS) {
    if (element.matches(sel)) {
      (element as HTMLElement).style.setProperty('display', 'none', 'important');
      return;
    }
  }
}

export function purifySubtree(root: Element): void {
  for (const sel of PURIFY_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => {
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
    });
  }
}

export function startPurifyObserver(): void {
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

export function stopPurifyObserver(): void {
  if (purifyObserver) { purifyObserver.disconnect(); purifyObserver = null; }
}

export function initPurifyListener(): void {
  ipcRenderer.on(IPC_CHANNELS.PURIFY_TOGGLE, (_event, enabled?: boolean) => {
    purifyActive = typeof enabled === 'boolean' ? enabled : !purifyActive;
    if (purifyActive) {
      purifySubtree(document.body);
      startPurifyObserver();
    } else {
      stopPurifyObserver();
    }
  });
}
