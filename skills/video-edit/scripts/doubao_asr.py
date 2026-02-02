#!/usr/bin/env python3
"""
豆包ASR HTTP客户端
使用音视频字幕生成API进行录音文件识别
"""

import requests
import time
import json
from pathlib import Path
from typing import Dict, Optional


class DoubaoASRClient:
    """豆包ASR HTTP客户端"""

    SUBMIT_URL = "https://openspeech.bytedance.com/api/v1/vc/submit"
    QUERY_URL = "https://openspeech.bytedance.com/api/v1/vc/query"

    def __init__(
        self,
        app_id: str,
        access_token: str,
        language: str = "zh-CN",
    ):
        self.app_id = app_id
        self.access_token = access_token
        self.language = language

    def transcribe_audio(
        self,
        audio_path: Path,
        use_itn: bool = True,  # 数字转换
        use_punc: bool = True,  # 标点符号
        max_lines: int = 1,
        words_per_line: int = 15,
    ) -> Dict:
        """
        转录音频文件

        Returns:
            {
                "id": "task-id",
                "code": 0,
                "message": "Success",
                "utterances": [
                    {
                        "text": "分句文本",
                        "start_time": 0,  # 毫秒
                        "end_time": 3197,
                        "words": [...]
                    }
                ]
            }
        """
        # 1. 提交音频文件
        task_id = self._submit_audio(
            audio_path,
            use_itn=use_itn,
            use_punc=use_punc,
            max_lines=max_lines,
            words_per_line=words_per_line,
        )

        # 2. 查询结果（阻塞模式）
        result = self._query_result(task_id, blocking=True)

        return result

    def _submit_audio(
        self,
        audio_path: Path,
        use_itn: bool,
        use_punc: bool,
        max_lines: int,
        words_per_line: int,
    ) -> str:
        """提交音频文件，返回任务ID"""

        # 构建请求参数
        params = {
            "appid": self.app_id,
            "language": self.language,
            "use_itn": str(use_itn),
            "use_punc": str(use_punc),
            "max_lines": max_lines,
            "words_per_line": words_per_line,
        }

        # 构建请求头
        headers = {
            "Authorization": f"Bearer; {self.access_token}",
            "Content-Type": "audio/wav",
        }

        # 读取音频文件
        with open(audio_path, "rb") as f:
            audio_data = f.read()

        # 发送请求
        response = requests.post(
            self.SUBMIT_URL,
            params=params,
            headers=headers,
            data=audio_data,
            timeout=60,
        )

        # 解析响应
        result = response.json()

        if result.get("code") != 0:
            raise Exception(f"Submit failed: {result.get('message')}")

        task_id = result.get("id")
        if not task_id:
            raise Exception("No task ID returned")

        return task_id

    def _query_result(
        self,
        task_id: str,
        blocking: bool = True,
        poll_interval: int = 3,
        max_wait: int = 300,
    ) -> Dict:
        """
        查询识别结果

        Args:
            task_id: 任务ID
            blocking: 是否阻塞等待结果
            poll_interval: 轮询间隔（秒）
            max_wait: 最大等待时间（秒）

        Returns:
            识别结果字典
        """
        params = {
            "appid": self.app_id,
            "id": task_id,
        }

        headers = {
            "Authorization": f"Bearer; {self.access_token}",
        }

        start_time = time.time()

        while True:
            # 发送查询请求
            response = requests.get(
                self.QUERY_URL,
                params=params,
                headers=headers,
                timeout=30,
            )

            result = response.json()

            # 检查错误
            if result.get("code") != 0:
                raise Exception(f"Query failed: {result.get('message')}")

            # 如果有utterances字段，说明识别完成
            if "utterances" in result:
                return result

            # 如果没有utterances，可能还在处理中
            if not blocking:
                return result

            # 检查是否超时
            elapsed = time.time() - start_time
            if elapsed > max_wait:
                raise Exception(f"Query timeout after {max_wait}s")

            # 等待后继续轮询
            time.sleep(poll_interval)


def transcribe_with_doubao(
    audio_path: Path,
    app_id: str,
    access_token: str,
    language: str = "zh-CN",
) -> Dict:
    """
    使用豆包ASR转录音频文件

    Args:
        audio_path: 音频文件路径
        app_id: 应用ID
        access_token: 访问令牌
        language: 语言代码

    Returns:
        识别结果字典
    """
    client = DoubaoASRClient(
        app_id=app_id,
        access_token=access_token,
        language=language,
    )

    result = client.transcribe_audio(audio_path)
    return result
