import * as fs from 'fs';
import * as path from 'path';
import { AppState, ShortcutBinding, DEFAULT_SHORTCUTS } from './types';

/**
 * 状态管理器 — 负责应用状态和快捷键配置的持久化读写
 *
 * 使用两个 JSON 文件：
 * - config.json：存储窗口位置/尺寸、主题状态、URL 等应用状态
 * - shortcuts.json：存储快捷键绑定配置
 */
export class StateManager {
  /** 应用状态配置文件路径 */
  private readonly configPath: string;
  /** 快捷键配置文件路径 */
  private readonly shortcutsPath: string;

  /**
   * @param configDir 配置文件目录路径（便于测试时注入临时目录）
   */
  constructor(configDir: string) {
    this.configPath = path.join(configDir, 'config.json');
    this.shortcutsPath = path.join(configDir, 'shortcuts.json');
  }

  /**
   * 获取默认应用状态
   * 窗口 800×600，终端主题关闭，默认加载微信读书，不置顶
   */
  getDefaults(): AppState {
    return {
      window: {
        x: 100,
        y: 100,
        width: 800,
        height: 600,
      },
      theme: {
        terminalEnabled: false,
      },
      purifyEnabled: true,
      fontSize: 100,
      url: 'https://weread.qq.com',
      alwaysOnTop: false,
    };
  }

  /**
   * 从 config.json 加载应用状态
   * 文件不存在或 JSON 解析失败时返回默认值并重建文件
   */
  load(): AppState {
    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data) as AppState;
    } catch {
      // 文件不存在或 JSON 损坏，返回默认值并重建配置文件
      const defaults = this.getDefaults();
      this.save(defaults);
      return defaults;
    }
  }

  /**
   * 将应用状态序列化写入 config.json
   */
  save(state: AppState): void {
    // 确保目录存在
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * 从 shortcuts.json 加载快捷键绑定
   * 文件不存在或 JSON 损坏时返回默认快捷键
   */
  loadShortcuts(): ShortcutBinding[] {
    try {
      const data = fs.readFileSync(this.shortcutsPath, 'utf-8');
      return JSON.parse(data) as ShortcutBinding[];
    } catch {
      // 文件不存在或损坏，返回默认快捷键并重建文件
      const defaults = [...DEFAULT_SHORTCUTS];
      this.saveShortcuts(defaults);
      return defaults;
    }
  }

  /**
   * 将快捷键绑定写入 shortcuts.json
   */
  saveShortcuts(bindings: ShortcutBinding[]): void {
    // 确保目录存在
    const dir = path.dirname(this.shortcutsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.shortcutsPath, JSON.stringify(bindings, null, 2), 'utf-8');
  }
}
