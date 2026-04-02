/**
 * resize 边框模块 — 为无边框窗口提供拖拽调整大小的边框
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

export function createResizeBorders(): void {
  const edges = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  for (const edge of edges) {
    const div = document.createElement('div');
    div.className = `resize-border resize-border-${edge}`;
    div.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_START, edge);
      const onMove = () => ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_MOVE);
      const onUp = () => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_RESIZE_END);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    document.body.appendChild(div);
  }
}
