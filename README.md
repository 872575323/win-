# 沉浸式隐蔽小说阅读器

基于 Electron 的极简桌面阅读应用。以无边框透明窗口加载微信读书网页版，通过 DOM 注入净化非正文内容，并提供终端伪装模式（黑底绿字等宽字体），使阅读界面看起来像终端或代码编辑器，实现办公环境下的隐蔽阅读体验。

![Electron](https://img.shields.io/badge/Electron-41-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

- **无边框透明窗口** — 无标题栏、无边框，最大程度减少视觉特征
- **鼠标智能显隐** — 鼠标移入窗口显示内容，移出后窗口自动隐藏（透明+点击穿透）
- **DOM 内容净化** — 自动隐藏导航栏、工具栏、侧边栏、头像、评论等干扰元素，只保留正文
- **终端伪装主题** — 黑底绿字等宽字体 + 仿终端行号前缀，伪装成终端/代码编辑器
- **全局快捷键** — 所有功能均可通过快捷键操作，支持自定义绑定
- **状态持久化** — 自动保存窗口位置、尺寸、主题状态、URL，下次启动自动恢复
- **窗口永远前置** — 始终保持在最上层
- **可拖拽调整大小** — 窗口四边和四角支持拖拽 resize

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
# 生成安装包（Windows NSIS / macOS DMG / Linux AppImage）
npm run dist

# 仅生成可执行目录（不打包安装程序）
npm run pack
```

## 默认快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+H` | 显隐切换 |
| `Ctrl+Shift+T` | 终端伪装主题切换 |
| `Ctrl+Shift+C` | 净化模式切换 |
| `Ctrl+L` | 打开地址栏 |
| `Ctrl+Shift+K` | 打开快捷键设置 |
| `Ctrl+Q` | 退出应用 |

所有快捷键均可在应用内通过设置面板（地址栏右侧 ⚙ 按钮）自定义修改。

## 界面说明

- **地址栏**（顶部）— 输入 URL 按 Enter 导航，鼠标离开后自动变为半透明，可通过 ▲ 按钮收起
- **设置按钮** ⚙ — 位于地址栏内，点击打开设置面板，可修改快捷键和功能开关
- **拖拽按钮**「点击拖拽」— 位于地址栏内，按住可拖动窗口位置
- **窗口边缘** — 四边和四角可拖拽调整窗口大小

## 项目结构

```
src/
├── main/                   # 主进程
│   ├── index.ts            # 入口，初始化所有模块
│   ├── types.ts            # 接口和类型定义
│   ├── state-manager.ts    # 状态持久化
│   ├── window-manager.ts   # 窗口管理
│   ├── content-injector.ts # DOM 净化和终端主题注入
│   ├── stealth-controller.ts # 鼠标驱动智能显隐
│   ├── shortcut-manager.ts # 全局快捷键管理
│   └── ipc-handlers.ts     # IPC 通信处理
├── preload/
│   └── index.ts            # 预加载脚本（contextBridge、地址栏、设置面板）
└── renderer/
    ├── shortcut-settings.html
    ├── shortcut-settings.ts
    └── index.ts
```

## 技术栈

- **Electron 41** — 桌面应用框架
- **TypeScript 5.9** — 类型安全
- **Jest 30** — 单元测试
- **electron-builder** — 打包发布

## License

MIT
