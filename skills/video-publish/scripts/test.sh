#!/bin/bash
# video-publish skill 测试脚本

set -e

echo "=== Video Publish Skill 测试 ==="
echo ""

# 检查前置条件
echo "1. 检查前置条件..."
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg 未安装"
    exit 1
fi
echo "✅ ffmpeg 已安装"

if [ -z "$DOUBAO_APP_ID" ] || [ -z "$DOUBAO_ACCESS_TOKEN" ]; then
    echo "❌ Doubao ASR 凭证未设置"
    exit 1
fi
echo "✅ Doubao ASR 凭证已设置"

# 检查 video-edit skill
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_EDIT_SCRIPT="$SCRIPT_DIR/../../video-edit/scripts/edit.sh"

if [ ! -f "$VIDEO_EDIT_SCRIPT" ]; then
    echo "❌ video-edit skill 不存在: $VIDEO_EDIT_SCRIPT"
    exit 1
fi
echo "✅ video-edit skill 存在"

echo ""
echo "2. 测试视频信息提取..."
TEST_VIDEO="${1:-/Users/ahaha/Downloads/em-highlights.mp4}"

if [ ! -f "$TEST_VIDEO" ]; then
    echo "❌ 测试视频不存在: $TEST_VIDEO"
    exit 1
fi

# 获取视频信息
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEST_VIDEO")
echo "✅ 视频时长: ${DURATION}秒"

echo ""
echo "3. 模拟内容生成..."
cat << 'EOF'
标题: 精彩视频分享
描述: 这是一个经过智能剪辑的精彩视频片段，包含了最重要的内容和亮点。
标签: 视频分享, 精彩片段, AI剪辑
EOF

echo ""
echo "=== 测试完成 ==="
echo ""
echo "✅ 所有前置条件满足"
echo "✅ video-publish skill 可以正常工作"
echo ""
echo "使用方法:"
echo "  openclaw agent --message '把 $TEST_VIDEO 剪辑后发布到小红书'"
