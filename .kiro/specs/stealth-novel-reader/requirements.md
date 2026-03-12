# 需求文档

## 简介

"沉浸式隐蔽小说阅读器"是一款基于 Electron 的极简桌面应用。它以无边框透明窗口加载微信读书网页版，通过 DOM 注入净化非正文内容，并提供终端伪装模式（黑底绿字等宽字体），使阅读界面看起来像终端日志或代码编辑器，实现办公环境下的隐蔽阅读体验。

## 术语表

- **Reader_App**: 沉浸式隐蔽小说阅读器桌面应用主程序（基于 Electron）
- **Main_Window**: Reader_App 的主窗口，采用无边框（Frameless）设计
- **Content_Injector**: 负责向加载的网页注入 CSS/JS 脚本以净化页面内容的模块
- **Stealth_Controller**: 负责根据鼠标位置控制窗口显隐的模块
- **Terminal_Theme**: 终端伪装主题，使用纯黑背景、绿色文字（#00FF00）、等宽字体（Consolas / Fira Code）
- **WeRead**: 微信读书网页版（weread.qq.com）

## 需求

### 需求 1：无边框透明窗口

**用户故事：** 作为一名用户，我希望阅读器窗口没有标题栏和边框，以便最大程度减少视觉特征，降低被注意到的概率。

#### 验收标准

1. THE Main_Window SHALL 以无边框（frameless）模式创建，不显示标题栏、菜单栏和窗口边框
2. THE Main_Window SHALL 在启动时设置默认尺寸为 800×600 像素
3. THE Main_Window SHALL 支持通过拖拽正文区域移动窗口位置
4. THE Main_Window SHALL 保持置顶层级为可配置选项，默认不置顶

### 需求 2：鼠标驱动的智能显隐

**用户故事：** 作为一名用户，我希望鼠标移入窗口时显示内容、移出时窗口立刻"消失"，以便在他人靠近时快速隐藏阅读内容。

#### 验收标准

1. WHEN 鼠标指针进入 Main_Window 区域, THE Stealth_Controller SHALL 将 Main_Window 的不透明度设置为 1.0 以显示窗口内容
2. WHEN 鼠标指针离开 Main_Window 区域, THE Stealth_Controller SHALL 在 100 毫秒内将 Main_Window 的不透明度设置为 0.0 以隐藏窗口内容
3. WHILE Main_Window 处于隐藏状态（不透明度为 0.0）, THE Stealth_Controller SHALL 保持窗口进程运行且不销毁窗口实例
4. WHILE Main_Window 处于隐藏状态, THE Stealth_Controller SHALL 使窗口不响应点击事件（点击穿透），避免误触
5. WHEN 用户按下预设快捷键（默认 Ctrl+Shift+H）, THE Stealth_Controller SHALL 切换 Main_Window 的显隐状态，作为鼠标显隐的备用方案

### 需求 3：网页内容加载

**用户故事：** 作为一名用户，我希望应用默认加载微信读书网页版，以便直接开始阅读我的书架内容。

#### 验收标准

1. WHEN Reader_App 启动完成, THE Main_Window SHALL 自动加载 WeRead 页面（https://weread.qq.com）
2. THE Main_Window SHALL 支持用户通过快捷键（默认 Ctrl+L）输入自定义 URL 进行导航
3. IF WeRead 页面加载失败, THEN THE Reader_App SHALL 在窗口内显示简洁的错误提示信息，包含重试按钮
4. THE Main_Window SHALL 保持 WeRead 的登录会话状态，避免每次启动都需要重新登录

### 需求 4：DOM 内容净化

**用户故事：** 作为一名用户，我希望页面只保留章节正文内容，隐藏所有干扰元素，以便获得纯净的阅读体验。

#### 验收标准

1. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 注入 CSS 样式隐藏顶部导航栏
2. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 注入 CSS 样式隐藏底部工具栏
3. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 注入 CSS 样式隐藏侧边栏（书架、目录面板等）
4. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 注入 CSS 样式隐藏用户头像、评论区和社交元素
5. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 注入 CSS 样式隐藏背景图片和装饰性元素
6. WHEN WeRead 页面加载完成, THE Content_Injector SHALL 使章节正文内容区域铺满整个窗口
7. WHEN WeRead 页面发生动态 DOM 变更（如翻页、加载新章节）, THE Content_Injector SHALL 重新应用净化规则以确保新加载的内容同样被净化
8. THE Content_Injector SHALL 提供一个快捷键（默认 Ctrl+Shift+C）用于临时切换净化模式的开启和关闭

### 需求 5：终端伪装主题

**用户故事：** 作为一名用户，我希望阅读界面看起来像终端或代码编辑器，以便在办公环境中不引起注意。

#### 验收标准

1. WHEN 用户激活 Terminal_Theme, THE Content_Injector SHALL 将页面背景色设置为纯黑色（#000000）
2. WHEN 用户激活 Terminal_Theme, THE Content_Injector SHALL 将正文文字颜色设置为绿色（#00FF00）
3. WHEN 用户激活 Terminal_Theme, THE Content_Injector SHALL 将正文字体设置为等宽字体族（Consolas, "Fira Code", "Courier New", monospace）
4. WHEN 用户激活 Terminal_Theme, THE Content_Injector SHALL 在每个段落前添加仿终端行号前缀（如 "$ "、"> " 或递增行号）
5. WHEN 用户激活 Terminal_Theme, THE Content_Injector SHALL 隐藏所有图片元素，仅保留纯文本内容
6. THE Reader_App SHALL 提供快捷键（默认 Ctrl+Shift+T）用于切换 Terminal_Theme 的开启和关闭
7. THE Reader_App SHALL 在下次启动时恢复上次退出时的主题状态

### 需求 6：快捷键管理

**用户故事：** 作为一名用户，我希望通过键盘快捷键控制应用的各项功能，并能自定义快捷键绑定，以便按照个人习惯快速操作而无需依赖鼠标菜单。

#### 验收标准

1. THE Reader_App SHALL 支持以下默认全局快捷键：Ctrl+Shift+H（显隐切换）、Ctrl+Shift+T（终端主题切换）、Ctrl+Shift+C（净化模式切换）、Ctrl+L（地址栏）、Ctrl+Q（退出应用）
2. WHEN 用户按下 Ctrl+Q, THE Reader_App SHALL 安全退出应用并保存当前状态
3. IF 快捷键与系统或其他应用冲突, THEN THE Reader_App SHALL 在启动时输出日志提示冲突信息
4. THE Reader_App SHALL 将快捷键绑定存储在本地 JSON 配置文件中，格式为 `{ "actionName": "快捷键组合" }` 的键值对
5. THE Reader_App SHALL 提供快捷键设置界面（通过快捷键 Ctrl+Shift+K 打开），允许用户查看所有可用操作及其当前绑定
6. WHEN 用户在快捷键设置界面中选择某个操作并按下新的组合键, THE Reader_App SHALL 将该操作的快捷键更新为新的组合键
7. IF 用户设置的新快捷键与已有绑定冲突, THEN THE Reader_App SHALL 提示冲突信息并要求用户确认是否覆盖原有绑定
8. THE Reader_App SHALL 提供"恢复默认快捷键"按钮，一键将所有快捷键重置为默认值
9. WHEN 用户修改快捷键后, THE Reader_App SHALL 立即生效新的快捷键绑定，无需重启应用

### 需求 7：状态持久化

**用户故事：** 作为一名用户，我希望应用记住我的窗口位置、主题选择等偏好设置，以便每次启动时无需重新配置。

#### 验收标准

1. WHEN Reader_App 退出, THE Reader_App SHALL 将当前窗口位置和尺寸保存到本地配置文件
2. WHEN Reader_App 退出, THE Reader_App SHALL 将当前主题状态（Terminal_Theme 开启/关闭）保存到本地配置文件
3. WHEN Reader_App 退出, THE Reader_App SHALL 将当前加载的 URL 保存到本地配置文件
4. WHEN Reader_App 启动, THE Reader_App SHALL 从本地配置文件读取并恢复上次保存的窗口位置、尺寸、主题状态和 URL
5. IF 本地配置文件不存在或损坏, THEN THE Reader_App SHALL 使用默认配置启动并创建新的配置文件
