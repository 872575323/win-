/**
 * 测试辅助工具 — mock Electron API 的工厂函数
 *
 * 由于单元测试和属性测试运行在 Node.js 环境中，无法直接使用 Electron API，
 * 因此通过工厂函数创建轻量级 mock 对象来模拟 Electron 的核心接口。
 */

// ============================================================
// BrowserWindow Mock
// ============================================================

/** BrowserWindow mock 实例的接口 */
export interface MockBrowserWindow {
  /** 设置窗口不透明度（0.0 ~ 1.0） */
  setOpacity: jest.Mock;
  /** 获取当前不透明度 */
  getOpacity: jest.Mock;
  /** 设置是否忽略鼠标事件（点击穿透） */
  setIgnoreMouseEvents: jest.Mock;
  /** 获取窗口位置和尺寸 */
  getBounds: jest.Mock;
  /** 设置窗口位置和尺寸 */
  setBounds: jest.Mock;
  /** 加载指定 URL */
  loadURL: jest.Mock;
  /** 设置是否置顶 */
  setAlwaysOnTop: jest.Mock;
  /** 判断窗口是否已销毁 */
  isDestroyed: jest.Mock;
  /** 关闭窗口 */
  close: jest.Mock;
  /** 显示窗口 */
  show: jest.Mock;
  /** webContents 对象 */
  webContents: MockWebContents;
}

/** WebContents mock 接口 */
export interface MockWebContents {
  /** 注入 CSS 样式 */
  insertCSS: jest.Mock;
  /** 移除已注入的 CSS */
  removeInsertedCSS: jest.Mock;
  /** 执行 JavaScript 代码 */
  executeJavaScript: jest.Mock;
  /** 注册事件监听 */
  on: jest.Mock;
  /** 移除事件监听 */
  off: jest.Mock;
}

/**
 * 创建 BrowserWindow mock 实例
 * @param overrides 可选的属性覆盖
 */
export function createMockBrowserWindow(
  overrides?: Partial<MockBrowserWindow>
): MockBrowserWindow {
  // 内部状态追踪
  let opacity = 1.0;
  let bounds = { x: 100, y: 100, width: 800, height: 600 };
  let ignoreMouseEvents = false;

  const webContents = createMockWebContents();

  const mock: MockBrowserWindow = {
    setOpacity: jest.fn((value: number) => { opacity = value; }),
    getOpacity: jest.fn(() => opacity),
    setIgnoreMouseEvents: jest.fn((ignore: boolean) => { ignoreMouseEvents = ignore; }),
    getBounds: jest.fn(() => ({ ...bounds })),
    setBounds: jest.fn((newBounds: Partial<typeof bounds>) => {
      bounds = { ...bounds, ...newBounds };
    }),
    loadURL: jest.fn().mockResolvedValue(undefined),
    setAlwaysOnTop: jest.fn(),
    isDestroyed: jest.fn(() => false),
    close: jest.fn(),
    show: jest.fn(),
    webContents,
    ...overrides,
  };

  return mock;
}


// ============================================================
// WebContents Mock
// ============================================================

/**
 * 创建 WebContents mock 实例
 * @param overrides 可选的属性覆盖
 */
export function createMockWebContents(
  overrides?: Partial<MockWebContents>
): MockWebContents {
  return {
    insertCSS: jest.fn().mockResolvedValue('css-key-123'),
    removeInsertedCSS: jest.fn().mockResolvedValue(undefined),
    executeJavaScript: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    ...overrides,
  };
}


// ============================================================
// globalShortcut Mock
// ============================================================

/** globalShortcut mock 接口 */
export interface MockGlobalShortcut {
  /** 注册快捷键 */
  register: jest.Mock;
  /** 注销单个快捷键 */
  unregister: jest.Mock;
  /** 注销所有快捷键 */
  unregisterAll: jest.Mock;
  /** 检查快捷键是否已注册 */
  isRegistered: jest.Mock;
}

/**
 * 创建 globalShortcut mock 实例
 * @param overrides 可选的属性覆盖
 */
export function createMockGlobalShortcut(
  overrides?: Partial<MockGlobalShortcut>
): MockGlobalShortcut {
  // 追踪已注册的快捷键
  const registered = new Set<string>();

  return {
    register: jest.fn((accelerator: string, _callback: () => void) => {
      registered.add(accelerator);
      return true; // 默认注册成功
    }),
    unregister: jest.fn((accelerator: string) => {
      registered.delete(accelerator);
    }),
    unregisterAll: jest.fn(() => {
      registered.clear();
    }),
    isRegistered: jest.fn((accelerator: string) => registered.has(accelerator)),
    ...overrides,
  };
}


// ============================================================
// app Mock
// ============================================================

/** app mock 接口 */
export interface MockApp {
  /** 获取路径（如 userData） */
  getPath: jest.Mock;
  /** 退出应用 */
  quit: jest.Mock;
  /** 注册事件监听 */
  on: jest.Mock;
}

/**
 * 创建 app mock 实例
 * @param userDataPath 自定义 userData 路径，默认为临时目录
 * @param overrides 可选的属性覆盖
 */
export function createMockApp(
  userDataPath: string = '/tmp/stealth-novel-reader-test',
  overrides?: Partial<MockApp>
): MockApp {
  return {
    getPath: jest.fn((name: string) => {
      if (name === 'userData') return userDataPath;
      return `/tmp/${name}`;
    }),
    quit: jest.fn(),
    on: jest.fn(),
    ...overrides,
  };
}
