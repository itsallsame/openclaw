# 视频智能剪辑与多平台发布系统

## What This Is

一个对话式的视频处理工作流系统，用户通过自然语言指令即可完成视频剪辑和多平台发布。系统使用 LLM 智能理解视频内容，自动提取精彩片段，生成适合各平台的标题、描述和标签，并自动发布到小红书、抖音等社交媒体平台。

## Core Value

让视频创作者通过简单的对话即可完成从剪辑到发布的完整流程，无需手动操作复杂的剪辑软件和各平台的发布界面。

## Requirements

### Validated

- ✓ 视频智能剪辑功能 (video-edit skill) — existing
- ✓ 小红书内容发布功能 (content-publisher extension) — existing
- ✓ Doubao ASR 视频转录 — existing
- ✓ LLM 精彩片段选择 — existing
- ✓ 字幕自动生成和烧录 — existing
- ✓ 浏览器自动化发布 — existing

### Active

- [ ] 创建新的 video-publish skill 整合剪辑和发布流程
- [ ] 实现对话式指令解析（提取剪辑要求、目标平台、输出模式）
- [ ] 实现基于视频内容的智能标题生成
- [ ] 实现基于视频内容的智能描述文案生成
- [ ] 实现基于视频内容的智能标签生成
- [ ] 添加抖音平台支持到 content-publisher
- [ ] 支持多个独立片段的批量发布
- [ ] 支持单个合并视频的发布
- [ ] 实现发布结果的统一返回和展示

### Out of Scope

- 视频特效和转场 — 专注于内容剪辑，不做复杂特效
- 实时视频流处理 — 只处理本地视频文件
- 视频存储服务 — 用户自行管理视频文件
- 平台数据分析 — 只负责发布，不做数据统计
- 视频水印和品牌定制 — 保持简单，用户可自行添加

## Context

**现有技术栈：**
- OpenClaw 多平台 AI 代理框架
- video-edit skill：使用 Doubao ASR + LLM + ffmpeg 实现智能剪辑
- content-publisher extension：浏览器自动化发布到小红书
- Pi AI agent framework：LLM 集成和工具调用

**用户场景：**
- 视频创作者需要快速处理和发布视频内容
- 希望通过自然语言描述需求，而不是手动操作
- 需要同时发布到多个平台以扩大影响力
- 希望系统自动生成适合平台的文案和标签

**技术约束：**
- 必须使用现有的 video-edit skill 和 content-publisher extension
- 新功能以 skill 形式实现，不是 extension
- 需要保持与现有 OpenClaw 架构的一致性

## Constraints

- **技术栈**: 必须基于现有的 TypeScript/Node.js 技术栈
- **依赖**: 复用 video-edit skill 和 content-publisher extension
- **架构**: 新功能以 skill 形式实现，遵循 OpenClaw skill 规范
- **平台**: 优先支持小红书和抖音，其他平台后续扩展
- **性能**: 视频处理和发布可能需要较长时间，需要合理的进度反馈

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 以 skill 形式实现而非 extension | Skill 更适合工作流编排，extension 更适合底层能力扩展 | — Pending |
| 默认输出多个独立片段 | 多个短视频更符合社交媒体平台的推荐算法 | — Pending |
| LLM 自动生成标题和描述 | 减少用户手动输入，提高效率 | — Pending |
| 复用现有 content-publisher | 避免重复开发浏览器自动化逻辑 | — Pending |

---
*Last updated: 2026-02-02 after initialization*
