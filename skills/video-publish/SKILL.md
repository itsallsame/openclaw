---
name: video-publish
command: video-publish
description: 智能视频剪辑并发布到社交媒体平台（小红书、抖音等）
metadata: {"openclaw":{"emoji":"📤","requires":{"skills":["video-edit"],"extensions":["content-publisher"]}}}
---

# Video Publish (视频剪辑与发布)

这个 skill 整合了视频剪辑和社交媒体发布功能。它会：
1. 调用 video-edit skill 进行智能剪辑
2. 使用 LLM 生成适合平台的标题、描述、标签
3. 调用 content-publisher 发布到指定平台

## 使用方法

**基本用法：**
```bash
openclaw agent --message "把这个视频剪辑后发布到小红书：/path/to/video.mp4"
```

**指定剪辑要求：**
```bash
openclaw agent --message "把 /path/to/video.mp4 剪辑成60秒精彩片段，提取结论和数据部分，然后发布到小红书"
```

**发布到多个平台：**
```bash
openclaw agent --message "把 /path/to/video.mp4 剪辑后发布到小红书和抖音"
```

## 前置条件

1. **video-edit skill** - 用于视频剪辑
2. **content-publisher extension** - 用于发布
3. **Doubao ASR 凭证** - 设置环境变量：
   ```bash
   export DOUBAO_APP_ID="your_app_id"
   export DOUBAO_ACCESS_TOKEN="your_token"
   ```
4. **平台登录** - 需要先登录目标平台：
   ```bash
   openclaw browser --browser-profile social start
   openclaw browser --browser-profile social open https://creator.xiaohongshu.com
   ```

## 工作流程

### 步骤 1: 视频剪辑（可选）

如果用户提供的是原始视频，先调用 video-edit skill 进行剪辑：
- 使用 video-edit skill 生成精彩片段
- 获取剪辑后的视频路径和字幕文件

### 步骤 2: 分析视频内容

读取视频的字幕文件（.srt）来了解视频内容：
- 如果是 video-edit 的输出，读取 `clip-01.srt` 或对应的字幕文件
- 提取视频的核心内容、主题、关键信息

### 步骤 3: 生成发布内容

根据视频内容和目标平台，使用 LLM 生成：
- **标题**：吸引人的标题（小红书限制 20 字符）
- **正文**：描述视频内容，突出亮点（小红书限制 1000 字符）
- **标签**：相关话题标签（不带 # 前缀）

生成时要考虑平台特点：
- 小红书：年轻化、生活化、有共鸣
- 标题要有吸引力，正文要有价值

### 步骤 4: 发布到平台

使用 content_publish 工具发布：
```
content_publish(
  platform="xiaohongshu",
  title="生成的标题",
  content="生成的正文",
  video={type: "path", value: "视频路径"},
  tags=["标签1", "标签2"],
  draft=true  // 默认保存为草稿
)
```

### 步骤 5: 返回结果

显示发布状态和链接

## 支持的平台

- ✅ 小红书 (Xiaohongshu)
- 🚧 抖音 (Douyin) - 即将支持

## 注意事项

- 视频剪辑可能需要几分钟时间
- 发布前会预览生成的标题和描述
- 默认不自动提交，需要用户确认
- 支持保存为草稿
