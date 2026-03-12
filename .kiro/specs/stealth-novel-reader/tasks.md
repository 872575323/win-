# 实现计划：沉浸式隐蔽小说阅读器

## 概述

基于 Electron + TypeScript 构建隐蔽小说阅读器，按模块逐步实现：先搭建项目骨架和核心接口，再逐一实现各功能模块（窗口管理 → 状态持久化 → 内容注入 → 智能显隐 → 快捷键管理），最后集成联调。每个模块实现后紧跟测试任务，确保增量验证。

## 任务

- [x] 1. 搭建项目结构和核心接口
  - [x] 1.1 初始化 Electron + TypeScript 项目
    - 初始化 `package.json`，安装 `electron`、`typescript`、`ts-node` 依赖
    - 配置 `tsconfig.json`（target: ES2020, module: commonjs, strict: true）
    - 创建目录结构：`src/main/`（主进程）、`src/renderer/`（渲染进程）、`src/preload/`（预加载脚本）、`tests/unit/`、`tests/property/`
    - 配置 `electron-builder` 或基础打包脚本
    - _需求：全局_

  - [x] 1.2 定义核心 TypeScript 接口和类型
    - 在 `src/main/types.ts` 中定义 `WindowManagerConfig`、`AppState`、`ShortcutBinding`、`ShortcutConflict`、`PurifyRule` 接口
    - 定义 IPC 通道常量 `IPC_CHANNELS`
    - 定义默认快捷键映射 `DEFAULT_SHORTCUTS`
    - 定义微信读书净化规则 `WEREAD_PURIFY_RULES`
    - _需求：6.4, 4.1-4.5_

  - [x] 1.3 配置 Jest + fast-check 测试环境
    - 安装 `jest`、`ts-jest`、`@types/jest`、`fast-check` 依赖
    - 配置 `jest.config.ts`，设置 TypeScript 转换和测试文件匹配模式
    - 创建测试辅助工具文件 `tests/helpers.ts`（mock Electron API 的工厂函数）
    - _需求：全局_

- [x] 2. 实现 StateManager（状态持久化）
  - [x] 2.1 实现 StateManager 类
    - 在 `src/main/state-manager.ts` 中实现 `StateManager` 类
    - 实现 `load()` 方法：读取 `config.json`，JSON 解析失败时返回默认值并重建文件
    - 实现 `save(state: AppState)` 方法：将状态序列化写入 `config.json`
    - 实现 `getDefaults()` 方法：返回默认 AppState（800×600、终端主题关闭、weread.qq.com）
    - 实现快捷键配置的读写：`loadShortcuts()` / `saveShortcuts()`
    - _需求：7.1, 7.2, 7.3, 7.4, 7.5, 6.4_

  - [ ]* 2.2 编写 StateManager 单元测试
    - 在 `tests/unit/state-manager.test.ts` 中编写测试
    - 测试配置文件不存在时返回默认值
    - 测试 JSON 损坏时的容错处理
    - 测试正常读写流程
    - _需求：7.5_

  - [ ]* 2.3 编写属性测试：应用状态持久化往返（属性 13）
    - **属性 13：应用状态持久化往返**
    - 使用 fast-check 生成随机 `AppState` 对象，验证 `save()` 后 `load()` 返回等价对象
    - **验证需求：7.1, 7.2, 7.3, 7.4, 5.7**

  - [ ]* 2.4 编写属性测试：快捷键配置序列化往返（属性 10）
    - **属性 10：快捷键配置序列化往返**
    - 使用 fast-check 生成随机 `ShortcutBinding[]`，验证序列化/反序列化等价
    - **验证需求：6.4, 6.6**

- [x] 3. 实现 WindowManager（窗口管理器）
  - [x] 3.1 实现 WindowManager 类
    - 在 `src/main/window-manager.ts` 中实现 `WindowManager` 类
    - 实现 `createWindow(config)` 方法：创建无边框（`frame: false`）、透明（`transparent: true`）窗口
    - 设置默认尺寸 800×600，支持从 StateManager 恢复位置和尺寸
    - 配置预加载脚本路径，启用 `contextIsolation` 和 `sandbox`
    - 实现 `loadURL(url)` 方法，监听 `did-fail-load` 事件渲染错误页面（含重试按钮）
    - 实现 `getBounds()` 方法获取当前窗口位置和尺寸
    - _需求：1.1, 1.2, 1.4, 3.1, 3.3, 3.4_

  - [x] 3.2 实现窗口拖拽功能
    - 在预加载脚本 `src/preload/index.ts` 中设置 `-webkit-app-region: drag` 样式
    - 确保正文区域可拖拽移动窗口
    - _需求：1.3_

- [x] 4. 检查点 — 确保基础模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 5. 实现 ContentInjector（内容注入器）
  - [x] 5.1 实现 DOM 净化功能
    - 在 `src/main/content-injector.ts` 中实现 `ContentInjector` 类
    - 实现 `injectPurifyStyles(webContents)` 方法：通过 `webContents.insertCSS()` 注入净化 CSS
    - 使用 `WEREAD_PURIFY_RULES` 生成 CSS 规则隐藏导航栏、工具栏、侧边栏、头像、评论区、背景装饰
    - 注入正文区域全屏铺满样式
    - 实现 `togglePurify()` 和 `isPurifyEnabled()` 方法
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

  - [x] 5.2 实现 MutationObserver 动态净化
    - 在预加载脚本中注入 MutationObserver 监听 DOM 变更
    - 当检测到新增节点时，重新应用净化规则
    - _需求：4.7_

  - [x] 5.3 实现终端伪装主题
    - 实现 `injectTerminalTheme(webContents)` 方法：注入终端主题 CSS（黑底绿字等宽字体）
    - 实现 `removeTerminalTheme(webContents)` 方法：移除终端主题
    - 通过 JS 注入为段落添加行号前缀（CSS counter 方案）
    - 隐藏所有图片元素
    - 实现 `toggleTerminalTheme()` 和 `isTerminalThemeEnabled()` 方法
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.4 编写属性测试：净化规则应用完整性（属性 1）
    - **属性 1：净化规则应用完整性**
    - 生成随机 CSS 选择器集合，验证注入后匹配元素处于隐藏状态
    - **验证需求：4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 5.5 编写属性测试：DOM 变更后净化持续生效（属性 5）
    - **属性 5：DOM 变更后净化规则持续生效**
    - 生成随机 DOM 节点插入，验证净化规则被重新应用
    - **验证需求：4.7**

  - [ ]* 5.6 编写属性测试：净化模式切换往返（属性 6）
    - **属性 6：净化模式切换往返**
    - 生成随机初始状态，验证双次切换回到原状态
    - **验证需求：4.8**

  - [ ]* 5.7 编写属性测试：终端主题样式完整性（属性 7）
    - **属性 7：终端主题样式完整性**
    - 生成随机页面内容，验证主题激活后背景色、文字颜色、字体族、图片隐藏均生效
    - **验证需求：5.1, 5.2, 5.3, 5.5**

  - [ ]* 5.8 编写属性测试：终端主题行号前缀（属性 8）
    - **属性 8：终端主题行号前缀**
    - 生成随机段落数量和内容，验证行号递增且格式正确
    - **验证需求：5.4**

  - [ ]* 5.9 编写属性测试：终端主题切换往返（属性 9）
    - **属性 9：终端主题切换往返**
    - 生成随机初始状态，验证双次切换回到原状态
    - **验证需求：5.6**

- [x] 6. 实现 StealthController（智能显隐控制器）
  - [x] 6.1 实现 StealthController 类
    - 在 `src/main/stealth-controller.ts` 中实现 `StealthController` 类
    - 实现 `show()` 方法：设置窗口不透明度为 1.0，关闭点击穿透（`setIgnoreMouseEvents(false)`）
    - 实现 `hide()` 方法：100ms 内设置窗口不透明度为 0.0，开启点击穿透（`setIgnoreMouseEvents(true)`）
    - 实现 `toggle()` 方法：切换显隐状态
    - 实现 `isVisible()` 方法
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 6.2 实现鼠标驱动显隐
    - 在预加载脚本中监听 `mouseenter` / `mouseleave` 事件
    - 通过 IPC（`mouse:enter` / `mouse:leave`）通知主进程 StealthController
    - _需求：2.1, 2.2_

  - [ ]* 6.3 编写属性测试：显隐状态与操作一致性（属性 2）
    - **属性 2：显隐状态与操作一致性**
    - 生成随机初始状态序列，验证 `show()` 后不透明度为 1.0，`hide()` 后为 0.0
    - **验证需求：2.1, 2.2**

  - [ ]* 6.4 编写属性测试：隐藏状态不变量（属性 3）
    - **属性 3：隐藏状态不变量**
    - 生成随机操作序列，验证隐藏后窗口实例存在且点击穿透开启
    - **验证需求：2.3, 2.4**

  - [ ]* 6.5 编写属性测试：显隐切换往返（属性 4）
    - **属性 4：显隐切换往返**
    - 生成随机初始状态，验证双次 `toggle()` 回到原状态
    - **验证需求：2.5**

- [x] 7. 检查点 — 确保核心功能模块测试通过
  - 确保所有测试通过，如有问题请向用户确认。

- [x] 8. 实现 ShortcutManager（快捷键管理器）
  - [x] 8.1 实现 ShortcutManager 类
    - 在 `src/main/shortcut-manager.ts` 中实现 `ShortcutManager` 类
    - 实现 `registerAll(bindings)` 方法：使用 `globalShortcut.register()` 注册所有快捷键，注册失败时记录日志
    - 实现 `unregisterAll()` 方法：注销所有已注册快捷键
    - 实现 `updateBinding(action, newAccelerator)` 方法：更新单个快捷键，先检测冲突
    - 实现 `detectConflict(accelerator, excludeAction?)` 方法：检测快捷键冲突
    - 实现 `resetToDefaults()` 方法：恢复默认快捷键
    - 实现 `getAllBindings()` 和 `getDefaultBindings()` 方法
    - _需求：6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 6.9_

  - [x] 8.2 实现快捷键设置界面
    - 在 `src/renderer/shortcut-settings.html` 和 `src/renderer/shortcut-settings.ts` 中实现设置面板
    - 通过 IPC 获取当前快捷键绑定并展示列表
    - 支持点击操作项后按下新组合键更新绑定
    - 冲突时显示提示信息，要求用户确认是否覆盖
    - 提供"恢复默认快捷键"按钮
    - 通过 `Ctrl+Shift+K` 打开/关闭设置面板
    - _需求：6.5, 6.6, 6.7, 6.8_

  - [x] 8.3 注册 IPC 处理器
    - 在主进程中注册 `shortcuts:get-all`、`shortcuts:update`、`shortcuts:reset` 的 IPC 处理器
    - 更新快捷键后立即重新注册，无需重启
    - _需求：6.9_

  - [ ]* 8.4 编写属性测试：快捷键冲突检测（属性 11）
    - **属性 11：快捷键冲突检测**
    - 生成随机绑定集合（含重复快捷键），验证 `detectConflict()` 正确返回冲突信息
    - **验证需求：6.7**

  - [ ]* 8.5 编写属性测试：恢复默认快捷键幂等性（属性 12）
    - **属性 12：恢复默认快捷键幂等性**
    - 生成随机修改后的配置，验证 `resetToDefaults()` 后等于默认值，多次执行结果相同
    - **验证需求：6.8**

- [x] 9. 实现地址栏导航功能
  - [x] 9.1 实现 URL 输入和导航
    - 在渲染进程中实现简易地址栏 UI（通过 `Ctrl+L` 触发显示）
    - 通过 IPC（`navigate:url`）将用户输入的 URL 发送到主进程
    - 主进程调用 `WindowManager.loadURL()` 加载新 URL
    - _需求：3.2_

- [x] 10. 集成联调与主入口
  - [x] 10.1 实现应用主入口
    - 在 `src/main/index.ts` 中编写应用启动逻辑
    - 初始化 StateManager，加载保存的配置
    - 创建 WindowManager 并根据配置创建窗口
    - 初始化 ContentInjector，页面加载完成后注入净化样式和主题
    - 初始化 StealthController，绑定鼠标事件
    - 初始化 ShortcutManager，注册所有快捷键并绑定对应操作
    - 监听 `before-quit` 事件，保存当前状态（窗口位置、主题、URL）
    - _需求：3.1, 7.1, 7.2, 7.3, 7.4, 5.7_

  - [x] 10.2 实现预加载脚本集成
    - 在 `src/preload/index.ts` 中整合所有渲染进程侧逻辑
    - 通过 `contextBridge.exposeInMainWorld()` 暴露安全的 IPC 接口
    - 集成鼠标事件监听、MutationObserver、拖拽样式
    - _需求：1.3, 2.1, 2.2, 4.7_

  - [x] 10.3 实现 Ctrl+Q 安全退出
    - 注册 `Ctrl+Q` 快捷键，触发时保存状态并调用 `app.quit()`
    - _需求：6.2_

- [x] 11. 最终检查点 — 确保所有测试通过
  - 确保所有测试通过，如有问题请向用户确认。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务均引用了对应的需求编号，确保可追溯性
- 检查点任务用于增量验证，确保每个阶段的代码质量
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
