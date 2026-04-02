/**
 * contextBridge 暴露安全的 IPC 接口给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getShortcuts: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SHORTCUTS),
  updateShortcut: (action: string, accelerator: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SHORTCUT, action, accelerator),
  resetShortcuts: () => ipcRenderer.invoke(IPC_CHANNELS.RESET_SHORTCUTS),
  forceUpdateShortcut: (action: string, accelerator: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SHORTCUT, action, accelerator),
  navigateToUrl: (url: string) => ipcRenderer.send(IPC_CHANNELS.NAVIGATE_URL, url),
  resizeStart: (edge: string) => ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_START, edge),
  resizeMove: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_MOVE),
  resizeEnd: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_END),
});
