> 呀呼！欢迎使用 **Ethereal 主题 v1.2.2** 版本
>
> 本次更新带来公告栏支持写入 HTML 等功能
>
> 如在主题使用中遇到问题或者建议，欢迎在 [Issue](https://github.com/AloneNanNan/halo-theme-ethereal/issues) 中提交。也可前往 [主题交流群](https://qm.qq.com/q/onMpJjYvgQ) 进行讨论

### 新增

- **公告栏支持写入 HTML**：公告内容新增「呈现为HTML」选项及「内容最大高度(px)」设置，可在「主题设置 → 侧边栏 → 公告小组件 → 公告内容」写入 HTML，实现链接、图标、富文本等自定义样式；开启后内容按 HTML 渲染且高度自适应（由内容决定展示高度），仅以可配置的最大高度作防撑破侧栏的上限（默认 640px），默认关闭时按纯文本转义显示 #55

### 修复

- **移动端搜索框聚焦后未占满宽度**：修复移动端搜索面板输入框聚焦后因沿用桌面端 `focus:w-60` 定宽而缩窄、出现空白的问题 #58

### 回退 

- **移除三栏布局右侧栏空态收列机制**：移除了commit[a41228b](https://github.com/AloneNanNan/Halo-Theme-Ethereal/commit/a41228b) 三栏布局下右侧栏在空态时自动收列的逻辑，保持布局一致性，用户可以在使用三栏模式且右侧栏为空的时候正常使用三栏模式的布局和目录组件

### 其它

- 版本号提升至 v1.2.2

**变更完整日志**: https://github.com/AloneNanNan/Halo-Theme-Ethereal/compare/v1.2.1...v1.2.2
