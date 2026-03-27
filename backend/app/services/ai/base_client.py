from __future__ import annotations

import json
import re
import time
from typing import Any

import requests

from app.core.config import get_settings


class CerebrasBaseAIClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.cerebras_api_key)

    def chat_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        fallback: dict[str, Any],
        max_tokens: int,
        temperature: float,
    ) -> dict[str, Any]:
        if not self.enabled:
            return dict(fallback)

        url = f"{self.settings.cerebras_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.settings.cerebras_api_key}",
            "Content-Type": "application/json",
        }
        base_body = {
            "model": self.settings.cerebras_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        attempts = max(1, int(self.settings.cerebras_retry_attempts))
        backoff = max(0.0, float(self.settings.cerebras_retry_backoff_seconds))

        for attempt in range(attempts):
            for use_response_format in (True, False):
                body = dict(base_body)
                if use_response_format:
                    body["response_format"] = {"type": "json_object"}

                try:
                    response = requests.post(
                        url,
                        headers=headers,
                        json=body,
                        timeout=self.settings.cerebras_timeout_seconds,
                    )
                    response.raise_for_status()
                    data = response.json()
                    content = self._extract_content(data)
                    if not content:
                        continue

                    parsed = self._extract_json(content)
                    if isinstance(parsed, dict):
                        merged = dict(fallback)
                        merged.update(parsed)
                        merged["source"] = "cerebras"
                        return merged
                except Exception:
                    continue

            if attempt < attempts - 1 and backoff > 0:
                time.sleep(backoff * (attempt + 1))

        return dict(fallback)

    def _extract_content(self, response_data: dict[str, Any]) -> str:
        try:
            choices = response_data.get("choices")
            if not isinstance(choices, list) or not choices:
                return ""

            message = choices[0].get("message")
            if not isinstance(message, dict):
                return ""

            content = message.get("content")
            return content if isinstance(content, str) else ""
        except Exception:
            return ""

    def _extract_json(self, content: str) -> dict[str, Any] | None:
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                return parsed
            return None
        except Exception:
            pass

        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            return None

        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except Exception:
            return None

    def to_float(self, value: Any, default: float) -> float:
        try:
            return float(value)
        except Exception:
            return float(default)
