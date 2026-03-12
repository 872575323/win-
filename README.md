# 沉浸式隐蔽小说阅读器 (Stealth Novel Reader)

基于 Electron 的极简桌面阅读应用。以无边框透明窗口加载微信读书网页版，通过 DOM 注入净化非正文内容，并提供终端伪装模式（黑底绿字等宽字体），使阅读界面看起来像终端或代码编辑器，实现办公环境下的隐蔽阅读体验。

![Electron](https://img.shields.io/badge/Electron-41-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 功能特性

### 核心功能

- **无边框透明窗口** — 无标题栏、无边框、无滚动条，最大程度减少视觉特征
- **鼠标智能显隐** — 主进程每 100ms 轮询鼠标屏幕坐标，鼠标在窗口内时显示（不透明度 100%），移出后自动隐藏（不透明度 ~0% + 点击穿透），无需依赖渲染进程 DOM 事件
- **窗口永远前置** — 始终保持在所有窗口最上层（`alwaysOnTop: true`）
- **可拖拽调整大小** — 窗口四边（4px）和四角（8px）支持拖拽 resize，通过 IPC 手动计算 `setBounds()`
- **窗口拖拽移动** — 地址栏内「点击拖拽」按钮，按住通过 IPC 手动 `setPosition()` 移动窗口

### 页面净化

- **DOM 内容净化** — 双重净化机制：
  - 主进程通过 `webContents.insertCSS()` 注入净化样式，隐藏导航栏、工具栏、目录面板、评论区、社交元素
  - 渲染进程通过 `MutationObserver` 实时监控 DOM 变化，动态隐藏新增的干扰元素
- **净化规则** — 针对微信读书阅读页面的 `.readerTopBar`、`.readerFooter`、`.readerControls`、`.readerCatalog`、`.readerComment`、`.readerSocial` 等选择器
- **可开关** — 设置面板或快捷键 `Ctrl+Shift+C` 切换，状态持久化

### 终端伪装主题

- **黑底绿字** — 强制所有页面元素使用 `#00FF00` 文字色、透明背景、等宽字体（Consolas / Fira Code / Courier New）
- **隐藏图片** — 所有 `img`、`picture`、`svg`、`canvas`、`video` 元素隐藏
- **保留 UI** — 地址栏和设置面板不受终端主题影响（通过 `revert` 恢复原始样式）
- **可开关** — 快捷键 `Ctrl+Shift+T` 切换，状态持久化

### 字体大小调节

- **页面缩放** — 设置面板中提供 `−` / `+` 按钮，以 10% 步进调节页面缩放（50% ~ 200%）
- **持久化** — 缩放比例保存到配置文件，页面刷新和重启后自动恢复

### 地址栏

- **顶部固定** — 默认显示在页面顶部，包含 URL 输入框、设置按钮 ⚙、拖拽按钮、收起按钮 ▲
- **智能透明** — 鼠标离开地址栏后透明度降至 30%，移入恢复 100%
- **可收起** — 点击 ▲ 隐藏地址栏，左上角出现 ▼ 按钮可重新展开
- **URL 导航** — 输入 URL 按 Enter 导航，自动补全 `https://` 前缀，按 Esc 隐藏

### 设置面板

- **快捷键管理** — 显示所有快捷键绑定，点击可录制新快捷键，支持冲突检测
- **功能开关** — 净化模式开/关
- **字体大小** — 缩放调节
- **恢复默认** — 一键恢复默认快捷键

### 状态持久化

所有设置自动保存到用户数据目录（`%APPDATA%/stealth-novel-reader/`）：

- `config.json` — 窗口位置/尺寸、终端主题状态、净化模式状态、缩放比例、当前 URL、置顶状态
- `shortcuts.json` — 自定义快捷键绑定

页面刷新或应用重启后自动恢复所有设置。

---

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
npm start
```

### 运行测试

```bash
npm test
```

### 打包发布

```bash
# 生成 Windows NSIS 安装包
npm run dist

# 仅生成可执行目录（不打包安装程序）
npm run pack
```

打包产物在 `release/` 目录下。

---

## 默认快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+Shift+H` | 显隐切换 | 手动切换窗口显示/隐藏 |
| `Ctrl+Shift+T` | 终端伪装主题 | 黑底绿字等宽字体伪装 |
| `Ctrl+Shift+C` | 净化模式 | 隐藏页面干扰元素 |
| `Ctrl+L` | 地址栏 | 打开/聚焦地址栏 |
| `Ctrl+Shift+K` | 设置面板 | 打开/关闭设置面板 |
| `Ctrl+Q` | 退出应用 | 退出程序 |

所有快捷键均可在设置面板中自定义修改，修改后立即生效并持久化。

---

## 界面说明

```
┌─────────────────────────────────────────────────────┐
│ [URL 输入框          ] [⚙] [点击拖拽] [▲]          │ ← 地址栏（鼠标离开后半透明）
├─────────────────────────────────────────────────────┤
│                                                     │
│              微信读书页面内容                          │ ← 净化后的正文区域
│              （净化后只保留正文）                       │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
  ↑ 四边和四角可拖拽调整窗口大小
```

- 鼠标移出窗口 → 窗口变透明 + 点击穿透（几乎不可见）
- 鼠标移入窗口 → 窗口恢复显示
- 无滚动条，但页面可正常滚动

---

## 项目结构

```
stealth-novel-reader/
├── src/
│   ├── main/                        # Electron 主进程
│   │   ├── index.ts                 # 入口，初始化所有模块，协调交互
│   │   ├── types.ts                 # 接口、类型、IPC 通道、默认快捷键、净化规则
│   │   ├── state-manager.ts         # 状态持久化（config.json + shortcuts.json）
│   │   ├── window-manager.ts        # 无边框透明窗口创建和管理
│   │   ├── content-injector.ts      # CSS 注入（净化样式 + 终端伪装主题）
│   │   ├── stealth-controller.ts    # 鼠标位置轮询驱动的智能显隐
│   │   ├── shortcut-manager.ts      # 全局快捷键注册、冲突检测、自定义绑定
│   │   └── ipc-handlers.ts          # IPC 处理器（快捷键、导航、resize、拖拽）
│   ├── preload/
│   │   └── index.ts                 # 预加载脚本（contextBridge、地址栏、设置面板、resize 边框、DOM 净化）
│   └── renderer/
│       ├── index.ts                 # 渲染进程入口
│       ├── shortcut-settings.html   # 快捷键设置页面
│       └── shortcut-settings.ts     # 快捷键设置逻辑
├── tests/
│   ├── helpers.ts                   # 测试辅助工具
│   └── unit/                        # 单元测试
│       ├── content-injector.test.ts
│       ├── shortcut-manager.test.ts
│       ├── stealth-controller.test.ts
│       ├── window-manager.test.ts
│       └── setup-smoke.test.ts
├── package.json
├── tsconfig.json
├── jest.config.ts
└── README.md
```

---

## 架构设计

### 模块职责

| 模块 | 职责 |
|------|------|
| `StateManager` | 读写 `config.json` 和 `shortcuts.json`，提供默认值和兼容旧配置 |
| `WindowManager` | 创建 `BrowserWindow`（无边框、透明、置顶），管理 URL 加载和错误页面 |
| `ContentInjector` | 通过 `insertCSS()` / `removeInsertedCSS()` 注入/移除净化样式和终端主题 |
| `StealthController` | 主进程 `setInterval` 轮询 `screen.getCursorScreenPoint()`，控制 `setOpacity()` 和 `setIgnoreMouseEvents()` |
| `ShortcutManager` | 封装 `globalShortcut`，支持注册、注销、冲突检测、更新、恢复默认 |
| `ipc-handlers` | 注册所有 IPC 处理器：快捷键 CRUD、URL 导航、窗口 resize、窗口拖拽、缩放变更 |
| `preload` | 渲染进程侧：contextBridge API、地址栏 UI、设置面板 UI、resize 边框、MutationObserver 净化 |

### 数据流

```
用户操作 → preload (IPC send/invoke) → 主进程 (ipcMain.on/handle)
                                            ↓
                                      StateManager (持久化)
                                      ContentInjector (CSS 注入)
                                      WindowManager (窗口控制)
                                      ShortcutManager (快捷键)
```

### 页面刷新恢复机制

1. 页面刷新触发 `did-finish-load` 事件
2. `ContentInjector.resetState()` 清除失效的 CSS key
3. 根据 `currentState`（运行时状态）重新注入净化样式和终端主题
4. 通过 IPC 通知 preload 当前净化状态，preload 据此启动/停止 `MutationObserver`
5. 恢复页面缩放级别

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 41 | 桌面应用框架 |
| TypeScript | 5.9 | 类型安全 |
| Jest | 30 | 单元测试（87 个测试用例） |
| electron-builder | 26 | 打包发布（Windows NSIS） |

---

## License

MIT
