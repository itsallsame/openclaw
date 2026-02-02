#!/usr/bin/env python3
"""
SRT格式转换工具
将豆包ASR的JSON输出转换为SRT字幕格式
"""

from typing import List, Dict
from dataclasses import dataclass


@dataclass
class SRTSegment:
    """SRT字幕段"""
    index: int
    start_ms: int
    end_ms: int
    text: str

    def to_srt(self) -> str:
        """转换为SRT格式"""
        start_time = self._format_time(self.start_ms)
        end_time = self._format_time(self.end_ms)
        return f"{self.index}\n{start_time} --> {end_time}\n{self.text}\n"

    @staticmethod
    def _format_time(ms: int) -> str:
        """毫秒转SRT时间格式 HH:MM:SS,mmm"""
        hours = ms // 3600000
        ms %= 3600000
        minutes = ms // 60000
        ms %= 60000
        seconds = ms // 1000
        milliseconds = ms % 1000
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"


def doubao_to_srt(doubao_result: Dict) -> str:
    """
    将豆包ASR结果转换为SRT格式

    Args:
        doubao_result: 豆包ASR返回的JSON结果
            {
                "code": 0,
                "message": "Success",
                "utterances": [
                    {
                        "text": "分句文本",
                        "start_time": 740,
                        "end_time": 1640,
                        "words": [...]
                    }
                ]
            }

    Returns:
        SRT格式字符串
    """
    # 直接从顶层获取utterances
    if "utterances" not in doubao_result:
        return ""

    segments = []
    for idx, utterance in enumerate(doubao_result["utterances"], start=1):
        segment = SRTSegment(
            index=idx,
            start_ms=utterance["start_time"],
            end_ms=utterance["end_time"],
            text=utterance["text"],
        )
        segments.append(segment)

    return "\n".join(seg.to_srt() for seg in segments)


def save_srt(srt_content: str, output_path: str):
    """保存SRT文件"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(srt_content)
