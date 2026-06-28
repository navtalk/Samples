"""StepFun voice-call proxy: browser WebSocket in, ASR + LLM + TTS cloud APIs out."""

from __future__ import annotations

import audioop
import argparse
import asyncio
import base64
import contextlib
import inspect
import json
import logging
import os
import re
import signal
import sys
import time
import uuid
from collections import deque
from dataclasses import dataclass, replace
from http import HTTPStatus
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Set
from urllib.parse import parse_qs, urlparse

import httpx
import websockets
from websockets.exceptions import ConnectionClosed
try:
    from websockets.legacy.server import serve as websocket_serve
except ImportError:  # pragma: no cover - kept for very old websockets releases.
    websocket_serve = websockets.serve


# -----------------------------------------------------------------------------
# Static paths, API defaults, and voice catalog
# -----------------------------------------------------------------------------
LOGGER = logging.getLogger("stepfun.voice_call")
ROOT_DIR = Path(__file__).resolve().parent
INDEX_PATH = ROOT_DIR / "index.html"

DEFAULT_SYSTEM_PROMPT = (
    "You are a real-time voice avatar assistant. User messages come from speech recognition transcripts. "
    "Answer directly and naturally. Reply primarily in English; switch to another language only when the user clearly asks for it "
    "or speaks entirely in that language. "
    "Do not say you cannot hear audio, cannot receive voice, or are text-only."
)
CHAT_TIMEOUT = httpx.Timeout(connect=10.0, read=None, write=30.0, pool=None)
HTTP_LIMITS = httpx.Limits(max_connections=10, max_keepalive_connections=4, keepalive_expiry=120.0)
TTS_PUNCTUATION_RE = re.compile(r"[.!?;,\n:\u3002\uff01\uff1f\uff1b\uff0c\u3001\uff1a]")
TTS_STRONG_PUNCTUATION_RE = re.compile(r"[.!?\n\u3002\uff01\uff1f]")
TTS_SOFT_BOUNDARY_CHARS = " \t\r\n,;:\u3001\uff0c\uff1b\uff1a"
MIME_BY_FORMAT = {
    "pcm": "audio/pcm",
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "flac": "audio/flac",
    "opus": "audio/ogg; codecs=opus",
    "mp3_stream": "audio/mpeg",
    "flac_stream": "audio/flac",
    "opus_stream": "audio/ogg; codecs=opus",
}
TTS_MODEL_VOICES = {
    "step-tts-2": {
        "boyinnansheng",
        "cixingnansheng",
        "elegantgentle-female",
        "energeticconfident-female",
        "ganliannvsheng",
        "hejunzongda-1",
        "hejunzongda-2",
        "hejunzongda-3",
        "huolinvsheng",
        "jilingshaonv",
        "jingdiannvsheng",
        "lengyanyujie",
        "linjiajiejie",
        "linjiameimei",
        "lively-girl",
        "livelybreezy-female",
        "magnetic-voiced-male",
        "qingchunshaonv",
        "qingniandaxuesheng",
        "qinhenvsheng",
        "qinqienvsheng",
        "ruanmengnvsheng",
        "ruyananshi",
        "shenchennanyin",
        "shuangkuaijiejie",
        "shuangkuainansheng",
        "soft-spoken-gentleman",
        "tianmeinvsheng",
        "vibrant-youth",
        "wenjingxuejie",
        "wenrougongzi",
        "wenrounansheng",
        "wenrounvsheng",
        "wenroushunv",
        "youyanvsheng",
        "yuanqinansheng",
        "yuanqishaonv",
        "zhengpaiqingnian",
        "zhixingjiejie",
        "zixinnansheng",
    },
    "step-tts-mini": {
        "qingniandaxuesheng",
        "zhixingjiejie",
        "linjiameimei",
        "kefunvsheng",
        "jilingshaonv",
        "rxh",
        "qrs",
        "yyjw",
        "jrt",
        "yueyuesx",
        "hyx",
        "wky",
    },
    "stepaudio-2.5-tts": {
        "boyinnansheng",
        "candid-girl",
        "cixingnansheng",
        "dushexiaoyu",
        "elegantgentle-female",
        "energeticconfident-female",
        "ganliannvsheng",
        "huolinvsheng",
        "jilingshaonv",
        "jingdiannvsheng",
        "lengyanyujie",
        "linjiajiejie",
        "linjiameimei",
        "lively-girl",
        "livelybreezy-female",
        "magnetic-voiced-male",
        "noble-cast",
        "qingchunshaonv",
        "qingniandaxuesheng",
        "qinhenvsheng",
        "qinqienvsheng",
        "ruanmengnvsheng",
        "ruyananshi",
        "shanghaifemale",
        "shanghaifemalezh",
        "shanghaimale",
        "shenchennanyin",
        "shuangkuaijiejie",
        "shuangkuainansheng",
        "soft-girl",
        "soft-spoken-gentleman",
        "tianmeinvsheng",
        "velvet-youth",
        "vibrant-youth",
        "wenjingxuejie",
        "wenrougongzi",
        "wenrounansheng",
        "wenrounvsheng",
        "wenroushunv",
        "xiaoyue",
        "yingwennansheng",
        "yingwennvsheng",
        "yinhejingling",
        "youyanvsheng",
        "yuanqinansheng",
        "yuanqishaonv",
        "zhengpaiqingnian",
        "zhixingjiejie",
        "zixinnansheng",
    },
}
DEFAULT_TTS_VOICE_BY_MODEL = {
    "step-tts-2": "magnetic-voiced-male",
    "step-tts-mini": "qingniandaxuesheng",
    "stepaudio-2.5-tts": "cixingnansheng",
}
VOICE_CACHE: Dict[str, tuple[float, Dict[str, Any]]] = {}
VOICE_CACHE_TTL_SECONDS = 300


# -----------------------------------------------------------------------------
# Environment parsing and shared audio utilities
# -----------------------------------------------------------------------------
def env_str(name: str, default: str) -> str:
    """Read a string environment variable with trimming and a safe fallback."""
    return os.environ.get(name, default).strip() or default


def env_int(name: str, default: int) -> int:
    """Read an integer environment variable and fall back when parsing fails."""
    value = os.environ.get(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    """Read a float environment variable and fall back when parsing fails."""
    value = os.environ.get(name)
    if not value:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def env_bool(name: str, default: bool) -> bool:
    """Read a boolean environment variable from common true/false strings."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def configure_logging() -> None:
    """Configure process logging for proxy, ASR, LLM, and TTS trace output."""
    level_name = env_str("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    LOGGER.setLevel(level)


def mask_secret(value: str) -> str:
    """Mask API keys before they are written to logs."""
    if not value:
        return "<empty>"
    if len(value) <= 10:
        return "***"
    return f"{value[:4]}...{value[-4:]}"


def pcm16_duration_ms(chunk: bytes) -> int:
    """Convert 16 kHz mono PCM16 byte length into an approximate duration."""
    return round((len(chunk) / 2 / 16000) * 1000)


def pcm16_rms(chunk: bytes) -> float:
    """Calculate normalized RMS energy for a PCM16 audio chunk."""
    if not chunk:
        return 0.0
    if len(chunk) % 2:
        chunk = chunk[:-1]
    if not chunk:
        return 0.0
    return min(1.0, audioop.rms(chunk, 2) / 32768.0)


# -----------------------------------------------------------------------------
# Voice catalog helpers
# -----------------------------------------------------------------------------
def normalize_tts_voice(model: str, voice_id: str) -> str:
    """Validate a voice against the selected TTS model and choose a fallback if needed."""
    allowed = TTS_MODEL_VOICES.get(model)
    if not allowed or voice_id in allowed:
        return voice_id
    fallback = DEFAULT_TTS_VOICE_BY_MODEL.get(model, "cixingnansheng")
    LOGGER.warning("unsupported tts voice for model; model=%s voice=%s fallback=%s", model, voice_id, fallback)
    return fallback


def effective_transcript_len(text: str) -> int:
    """Count meaningful transcript characters for barge-in confirmation."""
    # Strip fillers/punctuation so barge-in ignores "um ah" and single noise syllables.
    ignored = set(" \t\r\n,....!?;:'\"-um uh ah er hmm")
    return sum(1 for char in text.strip() if char not in ignored)


def infer_voice_gender(voice_id: str, detail: Dict[str, Any]) -> str:
    """Infer a voice gender label from StepFun voice metadata and voice IDs."""
    lower_id = voice_id.lower()
    if any(token in lower_id for token in ("female", "girl", "sister", "nvsheng", "shaonv", "meimei", "jiejie", "yujie", "shunv", "xuejie")):
        return "female"
    if any(token in lower_id for token in ("male", "nansheng", "nanyin", "gentleman", "gongzi")):
        return "male"

    voice_name = str(detail.get("voice-name") or detail.get("voice_name") or "")
    if "\u5973" in voice_name:
        return "female"
    if "\u7537" in voice_name:
        return "male"

    text = " ".join(
        str(detail.get(key) or "")
        for key in ("voice-description", "voice_description", "recommended_scene")
    )
    if "\u5973" in text and "\u7537" not in text:
        return "female"
    if "\u7537" in text and "\u5973" not in text:
        return "male"
    return "unknown"


def local_voice_payload(model: str) -> Dict[str, Any]:
    """Return a local fallback voice list when StepFun system_voices is unavailable."""
    voices = sorted(TTS_MODEL_VOICES.get(model) or {"cixingnansheng"})
    return {
        "model": model,
        "source": "local-fallback",
        "voices": [
            {
                "id": voice_id,
                "name": voice_id,
                "gender": infer_voice_gender(voice_id, {}),
                "description": "",
                "recommended_scene": "",
            }
            for voice_id in voices
        ],
    }


async def fetch_system_voices_payload(model: str) -> Dict[str, Any]:
    """Fetch StepFun TTS voices for the selected model and cache them for the UI."""
    now = time.time()
    cached = VOICE_CACHE.get(model)
    if cached and now - cached[0] < VOICE_CACHE_TTL_SECONDS:
        return cached[1]

    settings = Settings.from_env()
    if not settings.api_key:
        payload = local_voice_payload(model)
        payload["error"] = "missing STEP_API_KEY"
        return payload

    url = f"{settings.base_url}/audio/system_voices"
    headers = {"Authorization": f"Bearer {settings.api_key}"}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10, read=20, write=10, pool=10)) as client:
            response = await client.get(url, headers=headers, params={"model": model})
        if response.status_code >= 400:
            payload = local_voice_payload(model)
            payload["error"] = f"HTTP {response.status_code}: {response.text[:300]}"
            return payload
        data = response.json()
    except Exception as exc:
        LOGGER.exception("system voices fetch failed model=%s", model)
        payload = local_voice_payload(model)
        payload["error"] = str(exc)
        return payload

    details = data.get("voices-details") or data.get("voices_details") or {}
    voices = []
    for voice_id in data.get("voices") or []:
        detail = details.get(voice_id) or {}
        voice_name = str(detail.get("voice-name") or detail.get("voice_name") or voice_id)
        voices.append(
            {
                "id": voice_id,
                "name": voice_name or voice_id,
                "gender": infer_voice_gender(voice_id, detail),
                "description": str(detail.get("voice-description") or detail.get("voice_description") or ""),
                "recommended_scene": str(detail.get("recommended_scene") or ""),
            }
        )

    payload = {"model": model, "source": "stepfun-system_voices", "voices": voices}
    VOICE_CACHE[model] = (now, payload)
    TTS_MODEL_VOICES[model] = {voice["id"] for voice in voices}
    if voices and DEFAULT_TTS_VOICE_BY_MODEL.get(model) not in TTS_MODEL_VOICES[model]:
        DEFAULT_TTS_VOICE_BY_MODEL[model] = voices[0]["id"]
    return payload


# -----------------------------------------------------------------------------
# Client config sanitizers and event helpers
# -----------------------------------------------------------------------------
def clean_text(value: Any, default: str, max_len: int = 2000) -> str:
    """Sanitize a client-provided string while applying length limits."""
    if value is None:
        return default
    text = str(value).strip()
    return (text or default)[:max_len]


def clean_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    """Sanitize a client-provided integer and clamp it into an allowed range."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, number))


def clean_float(value: Any, default: float, minimum: float, maximum: float) -> float:
    """Sanitize a client-provided float and clamp it into an allowed range."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, number))


def dumps(data: Dict[str, Any]) -> str:
    """Serialize compact JSON for browser WebSocket events."""
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def event_id(prefix: str) -> str:
    """Create a stable-looking event ID for ASR items and internal turns."""
    return f"{prefix}_{uuid.uuid4().hex}"


# -----------------------------------------------------------------------------
# StepFun runtime settings and endpoint construction
# -----------------------------------------------------------------------------
@dataclass(frozen=True)
class Settings:
    """Runtime config from env vars; browser can override most fields via session.start / config.update."""

    api_key: str
    base_url: str
    ws_base: str
    asr_model: str
    llm_model: str
    tts_model: str
    tts_voice: str
    system_prompt: str
    language: str
    asr_prompt: str
    asr_silence_ms: int
    asr_vad_threshold: float
    asr_local_rms_threshold: float
    asr_min_audio_ms: int
    asr_start_voice_ms: int
    asr_preroll_ms: int
    asr_min_voice_ms: int
    asr_noise_multiplier: float
    asr_sse_retries: int
    http_trust_env: bool
    asr_full_rerun_on_commit: bool
    asr_enable_itn: bool
    tts_response_format: str
    tts_sample_rate: int
    tts_mode: str
    tts_speed_ratio: float
    tts_volume_ratio: float
    tts_instruction: str
    llm_temperature: float
    llm_max_tokens: int
    llm_warmup_enabled: bool
    barge_in_min_chars: int

    @classmethod
    def from_env(cls) -> "Settings":
        """Build server defaults from environment variables for the whole StepFun chain."""
        # The .ai deployment uses one account key for ASR, LLM, and TTS.
        # Endpoints stay server-side so the browser never receives secrets or base URLs.
        ws_base = env_str("STEPFUN_WS_BASE", "wss://api.stepfun.ai/v1").rstrip("/")
        return cls(
            api_key=os.environ.get("STEP_API_KEY", "").strip(),
            base_url=env_str("STEPFUN_BASE_URL", "https://api.stepfun.ai/v1").rstrip("/"),
            ws_base=ws_base,
            asr_model=env_str("ASR_MODEL", "stepaudio-2.5-asr"),
            llm_model=env_str("LLM_MODEL", "step-3.5-flash"),
            tts_model=env_str("TTS_MODEL", "step-tts-2"),
            tts_voice=env_str("TTS_VOICE", "magnetic-voiced-male"),
            system_prompt=env_str("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT),
            language=env_str("ASR_LANGUAGE", "en"),
            asr_prompt=env_str("ASR_PROMPT", "Please transcribe everything you hear."),
            asr_silence_ms=env_int("ASR_SILENCE_MS", 400),
            asr_vad_threshold=env_float("ASR_VAD_THRESHOLD", 0.5),
            asr_local_rms_threshold=env_float("ASR_LOCAL_RMS_THRESHOLD", 0.022),
            asr_min_audio_ms=env_int("ASR_MIN_AUDIO_MS", 450),
            asr_start_voice_ms=env_int("ASR_START_VOICE_MS", 120),
            asr_preroll_ms=env_int("ASR_PREROLL_MS", 120),
            asr_min_voice_ms=env_int("ASR_MIN_VOICE_MS", 160),
            asr_noise_multiplier=env_float("ASR_NOISE_MULTIPLIER", 3.0),
            asr_sse_retries=env_int("ASR_SSE_RETRIES", 1),
            http_trust_env=env_bool("STEPFUN_HTTP_TRUST_ENV", False),
            asr_full_rerun_on_commit=env_bool("ASR_FULL_RERUN_ON_COMMIT", True),
            asr_enable_itn=env_bool("ASR_ENABLE_ITN", True),
            tts_response_format=env_str("TTS_RESPONSE_FORMAT", "pcm"),
            tts_sample_rate=env_int("TTS_SAMPLE_RATE", 24000),
            tts_mode=env_str("TTS_MODE", "default"),
            tts_speed_ratio=env_float("TTS_SPEED_RATIO", 1.0),
            tts_volume_ratio=env_float("TTS_VOLUME_RATIO", 1.0),
            tts_instruction=env_str("TTS_INSTRUCTION", ""),
            llm_temperature=env_float("LLM_TEMPERATURE", 0.5),
            llm_max_tokens=env_int("LLM_MAX_TOKENS", 2048),
            llm_warmup_enabled=env_bool("LLM_WARMUP_ENABLED", True),
            barge_in_min_chars=env_int("BARGE_IN_MIN_CHARS", 2),
        )

    def apply_client_config(self, config: Dict[str, Any]) -> "Settings":
        """Apply browser-selected models and safe tuning values to current settings."""
        response_format = clean_text(config.get("tts_response_format"), self.tts_response_format, 32)
        if response_format not in MIME_BY_FORMAT:
            response_format = self.tts_response_format
        mode = clean_text(config.get("tts_mode"), self.tts_mode, 32)
        if mode not in {"default", "sentence"}:
            mode = self.tts_mode
        tts_model = clean_text(config.get("tts_model"), self.tts_model, 120)
        requested_tts_voice = clean_text(config.get("tts_voice"), self.tts_voice, 120)
        tts_voice = normalize_tts_voice(tts_model, requested_tts_voice)

        return replace(
            self,
            asr_model=clean_text(config.get("asr_model"), self.asr_model, 120),
            llm_model=clean_text(config.get("llm_model"), self.llm_model, 120),
            tts_model=tts_model,
            tts_voice=tts_voice,
            system_prompt=clean_text(config.get("system_prompt"), self.system_prompt, 2000) if config.get("system_prompt") else self.system_prompt,
            language=clean_text(config.get("language"), self.language, 24),
            asr_prompt=clean_text(config.get("asr_prompt"), self.asr_prompt, 500),
            asr_silence_ms=clean_int(config.get("asr_silence_ms"), self.asr_silence_ms, 200, 3000),
            asr_vad_threshold=clean_float(config.get("asr_vad_threshold"), self.asr_vad_threshold, 0.0, 1.0),
            asr_local_rms_threshold=clean_float(
                config.get("asr_local_rms_threshold"),
                self.asr_local_rms_threshold,
                0.001,
                0.2,
            ),
            asr_min_audio_ms=clean_int(config.get("asr_min_audio_ms"), self.asr_min_audio_ms, 100, 3000),
            asr_start_voice_ms=self.asr_start_voice_ms,
            asr_preroll_ms=self.asr_preroll_ms,
            asr_min_voice_ms=self.asr_min_voice_ms,
            asr_noise_multiplier=self.asr_noise_multiplier,
            asr_sse_retries=self.asr_sse_retries,
            http_trust_env=self.http_trust_env,
            tts_response_format=response_format,
            tts_sample_rate=clean_int(config.get("tts_sample_rate"), self.tts_sample_rate, 8000, 48000),
            tts_mode=mode,
            tts_speed_ratio=clean_float(config.get("tts_speed_ratio"), self.tts_speed_ratio, 0.5, 2.0),
            tts_volume_ratio=clean_float(config.get("tts_volume_ratio"), self.tts_volume_ratio, 0.1, 2.0),
            tts_instruction=clean_text(config.get("tts_instruction"), self.tts_instruction, 200),
            llm_temperature=clean_float(config.get("llm_temperature"), self.llm_temperature, 0.0, 2.0),
            llm_max_tokens=clean_int(config.get("llm_max_tokens"), self.llm_max_tokens, 64, 4096),
            llm_warmup_enabled=self.llm_warmup_enabled,
            barge_in_min_chars=clean_int(config.get("barge_in_min_chars"), self.barge_in_min_chars, 1, 12),
        )

    @property
    def chat_url(self) -> str:
        """Return the StepFun Chat Completions endpoint used for LLM SSE."""
        return f"{self.base_url}/chat/completions"

    @property
    def asr_sse_url(self) -> str:
        """Return the StepFun ASR SSE endpoint used for speech recognition."""
        # StepFun .ai exposes ASR as HTTP + SSE, not the old bidirectional ASR WebSocket.
        return f"{self.base_url}/audio/asr/sse"

    @property
    def tts_url(self) -> str:
        """Return the StepFun realtime TTS WebSocket URL for the selected model."""
        return f"{self.ws_base}/realtime/audio?model={self.tts_model}"

    def public_config(self) -> Dict[str, Any]:
        """Expose non-secret runtime settings back to the browser UI."""
        return {
            "asr_model": self.asr_model,
            "llm_model": self.llm_model,
            "tts_model": self.tts_model,
            "tts_voice": self.tts_voice,
            "tts_response_format": self.tts_response_format,
            "tts_sample_rate": self.tts_sample_rate,
            "language": self.language,
            "llm_warmup_enabled": self.llm_warmup_enabled,
            "barge_in_min_chars": self.barge_in_min_chars,
            "asr_endpoint": self.asr_sse_url,
        }


# -----------------------------------------------------------------------------
# StepFun transport helpers and LLM response parsing
# -----------------------------------------------------------------------------
async def connect_stepfun_ws(url: str, api_key: str):
    """Open a StepFun WebSocket with bearer authentication and proxy handling."""
    # websockets versions differ on extra_headers vs additional_headers.
    LOGGER.info("connect stepfun ws url=%s api_key=%s", url, mask_secret(api_key))
    headers = [("Authorization", f"Bearer {api_key}")]
    kwargs: Dict[str, Any] = {
        "max_size": None,
        "ping_interval": 20,
        "ping_timeout": 20,
    }
    if "additional_headers" in inspect.signature(websockets.connect).parameters:
        kwargs["additional_headers"] = headers
    else:
        kwargs["extra_headers"] = headers

    proxy_setting = env_str("STEPFUN_WS_PROXY", "")
    if proxy_setting.lower() in {"none", "false", "0", "off", "direct"}:
        kwargs["proxy"] = None
    elif proxy_setting:
        kwargs["proxy"] = proxy_setting

    return await websockets.connect(url, **kwargs)


ASR_TRANSPORT_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.ConnectError,
    httpx.WriteError,
    httpx.PoolTimeout,
)


def extract_error(event: Dict[str, Any]) -> str:
    """Extract a readable error message from StepFun event payloads."""
    error = event.get("error") or event.get("data") or event
    if isinstance(error, dict):
        return str(error.get("message") or error.get("code") or error)
    return str(error)


def extract_llm_text(chunk: Dict[str, Any]) -> str:
    """Extract streamed assistant text from Chat Completions SSE chunks."""
    parts: List[str] = []
    for choice in chunk.get("choices") or []:
        delta = choice.get("delta") or {}
        content = delta.get("content")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text") or item.get("content")
                    if isinstance(text, str):
                        parts.append(text)
    return "".join(parts)


def extract_llm_reasoning(chunk: Dict[str, Any]) -> str:
    """Extract reasoning-only deltas when the selected model emits them."""
    parts: List[str] = []
    for choice in chunk.get("choices") or []:
        delta = choice.get("delta") or {}
        for key in ("reasoning_content", "reasoning"):
            value = delta.get(key)
            if isinstance(value, str):
                parts.append(value)
    return "".join(parts)


def extract_finish_reasons(chunk: Dict[str, Any]) -> List[str]:
    """Collect finish reasons from Chat Completions choices for diagnostics."""
    reasons: List[str] = []
    for choice in chunk.get("choices") or []:
        reason = choice.get("finish_reason")
        if reason:
            reasons.append(str(reason))
    return reasons


def trim_history(history: List[Dict[str, str]], max_messages: int = 16) -> List[Dict[str, str]]:
    """Keep recent chat messages so each LLM turn has bounded context."""
    if len(history) <= max_messages:
        return history
    return history[-max_messages:]


# -----------------------------------------------------------------------------
# TTS text chunking and realtime audio streaming
# -----------------------------------------------------------------------------
class TTSChunker:
    """Splits streaming LLM text into speakable chunks before sending to TTS."""

    def __init__(self, streamer: "TTSStreamer") -> None:
        """Bind the chunker to a live TTS streamer and initialize text buffers."""
        self.streamer = streamer
        self.buffer = ""
        self.buffer_started_at = 0.0
        self.emitted_any = False

    async def feed(self, text: str) -> None:
        """Append LLM text deltas and emit TTS chunks once punctuation is seen."""
        if not text:
            return
        if not self.buffer:
            self.buffer_started_at = time.perf_counter()
        self.buffer += text
        LOGGER.info(
            "tts chunker feed turn=%s delta_chars=%s buffer_chars=%s delta_text=%r",
            self.streamer.turn_id,
            len(text),
            len(self.buffer),
            text,
        )
        while True:
            cut = self._next_cut()
            if cut <= 0:
                return
            piece = self.buffer[:cut].strip()
            self.buffer = self.buffer[cut:]
            if piece:
                self.emitted_any = True
                LOGGER.info(
                    "tts chunker emit turn=%s piece_chars=%s remaining_chars=%s piece_text=%r",
                    self.streamer.turn_id,
                    len(piece),
                    len(self.buffer),
                    piece,
                )
                await self.streamer.send_text(piece)
                await self.streamer.flush()
            self.buffer_started_at = time.perf_counter() if self.buffer else 0.0

    async def finish(self) -> None:
        """Flush any remaining buffered text and close the TTS text stream."""
        piece = self.buffer.strip()
        self.buffer = ""
        self.buffer_started_at = 0.0
        if piece:
            self.emitted_any = True
            LOGGER.info(
                "tts chunker finish emit turn=%s piece_chars=%s piece_text=%r",
                self.streamer.turn_id,
                len(piece),
                piece,
            )
            await self.streamer.send_text(piece)
            await self.streamer.flush()
        LOGGER.info("tts chunker finish turn=%s", self.streamer.turn_id)
        await self.streamer.finish()

    def _next_cut(self) -> int:
        """Find the next punctuation boundary that forms a natural TTS chunk."""
        if not self.buffer:
            return 0
        min_chars = 8 if not self.emitted_any else 18
        target_chars = 18 if not self.emitted_any else 42
        max_chars = 42 if not self.emitted_any else 80
        timeout_ms = 520 if not self.emitted_any else 900
        elapsed_ms = (time.perf_counter() - self.buffer_started_at) * 1000 if self.buffer_started_at else 0

        match = TTS_PUNCTUATION_RE.search(self.buffer)
        if match and (match.end() >= min_chars or TTS_STRONG_PUNCTUATION_RE.fullmatch(match.group(0))):
            return match.end()
        if len(self.buffer) >= max_chars:
            return self._safe_forced_cut(max_chars, min_chars) or max_chars
        if elapsed_ms >= timeout_ms and len(self.buffer) >= target_chars:
            return self._safe_forced_cut(len(self.buffer), min_chars) or len(self.buffer)
        return 0

    def _safe_forced_cut(self, limit: int, min_chars: int) -> int:
        """Choose a forced cut that avoids splitting English words when possible."""
        limit = min(len(self.buffer), max(limit, 0))
        if limit < min_chars:
            return 0
        for index in range(limit - 1, min_chars - 2, -1):
            if self.buffer[index] in TTS_SOFT_BOUNDARY_CHARS:
                return index + 1
        cut = limit
        while (
            cut > min_chars
            and cut < len(self.buffer)
            and self.buffer[cut - 1].isascii()
            and self.buffer[cut - 1].isalnum()
            and self.buffer[cut].isascii()
            and self.buffer[cut].isalnum()
        ):
            cut -= 1
        return cut if cut >= min_chars else 0


class TTSStreamer:
    """One StepFun realtime TTS WebSocket session per assistant turn (or pre-warmed idle slot)."""

    def __init__(self, session: "CallSession", turn_id: int, settings: Settings) -> None:
        """Store TTS turn state, readiness flags, and audio latency counters."""
        self.session = session
        self.turn_id = turn_id
        self.settings = settings
        self.ws = None
        self.reader_task: Optional[asyncio.Task] = None
        self.session_id = ""
        self.connection_ready = asyncio.Event()
        self.create_ready = asyncio.Event()
        self.done = asyncio.Event()
        self.closed = False
        self.audio_chunks = 0
        self.synthesis_started = False
        self.audio_done_seen = False
        self.first_text_sent_at = 0.0
        self.first_sentence_started_at = 0.0
        self.first_audio_delta_at = 0.0

    async def start(self) -> None:
        """Connect to StepFun realtime TTS and wait until the session is ready."""
        LOGGER.info(
            "tts start turn=%s model=%s voice=%s format=%s rate=%s",
            self.turn_id,
            self.settings.tts_model,
            self.settings.tts_voice,
            self.settings.tts_response_format,
            self.settings.tts_sample_rate,
        )
        self.ws = await connect_stepfun_ws(self.settings.tts_url, self.settings.api_key)
        self.reader_task = asyncio.create_task(self._read_events())
        await asyncio.wait_for(self.connection_ready.wait(), timeout=15)
        await self._send_create()
        await asyncio.wait_for(self.create_ready.wait(), timeout=15)
        await self.session.send_browser(
            {
                "type": "tts.ready",
                "turn_id": self.turn_id,
                "model": self.settings.tts_model,
                "voice": self.settings.tts_voice,
                "format": self.settings.tts_response_format,
            }
        )

    async def _send_create(self) -> None:
        """Send the StepFun tts.create event with voice and audio format options."""
        data: Dict[str, Any] = {
            "session_id": self.session_id,
            "voice_id": self.settings.tts_voice,
            "response_format": self.settings.tts_response_format,
            "sample_rate": self.settings.tts_sample_rate,
            "mode": self.settings.tts_mode,
            "speed_ratio": self.settings.tts_speed_ratio,
            "volume_ratio": self.settings.tts_volume_ratio,
            "markdown_filter": True,
        }
        if "2.5-tts" in self.settings.tts_model and self.settings.tts_instruction:
            data["instruction"] = self.settings.tts_instruction
        LOGGER.info("tts send create turn=%s session_id=%s", self.turn_id, self.session_id)
        await self._send({"type": "tts.create", "data": data})

    async def send_text(self, text: str) -> None:
        """Stream one speakable text chunk into StepFun TTS as tts.text.delta events."""
        if self.closed or not self.ws or not self.session_id:
            return
        self.synthesis_started = True
        if not self.first_text_sent_at:
            self.first_text_sent_at = time.perf_counter()
        LOGGER.info("tts send text turn=%s chars=%s text=%r", self.turn_id, len(text), text)
        for start in range(0, len(text), 950):
            piece = text[start : start + 950]
            LOGGER.info(
                "tts send delta turn=%s piece_index=%s chars=%s text=%r",
                self.turn_id,
                start // 950 + 1,
                len(piece),
                piece,
            )
            await self._send(
                {
                    "type": "tts.text.delta",
                    "data": {"session_id": self.session_id, "text": piece},
                }
            )

    async def flush(self) -> None:
        """Ask StepFun TTS to synthesize the text currently buffered server-side."""
        if self.closed or not self.ws or not self.session_id:
            return
        LOGGER.info("tts flush turn=%s event=tts.text.flush", self.turn_id)
        await self._send({"type": "tts.text.flush", "data": {"session_id": self.session_id}})

    async def finish(self) -> None:
        """Signal that no more text will be sent for this TTS response."""
        if self.closed or not self.ws or not self.session_id:
            return
        LOGGER.info("tts text done turn=%s event=tts.text.done", self.turn_id)
        await self._send({"type": "tts.text.done", "data": {"session_id": self.session_id}})

    async def wait_done(self, timeout: float = 45.0) -> None:
        """Wait for TTS audio completion without blocking forever."""
        with contextlib.suppress(asyncio.TimeoutError):
            await asyncio.wait_for(self.done.wait(), timeout=timeout)

    async def close(self) -> None:
        """Close the TTS WebSocket and cancel its background reader task."""
        self.closed = True
        if self.ws is not None:
            with contextlib.suppress(Exception):
                await self.ws.close()
        if self.reader_task is not None:
            self.reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.reader_task
        self.done.set()

    async def _send(self, payload: Dict[str, Any]) -> None:
        """Send a raw JSON event to the StepFun TTS WebSocket."""
        if self.ws is not None:
            await self.ws.send(dumps(payload))

    async def _read_events(self) -> None:
        """Read StepFun TTS events and forward audio deltas to the browser."""
        try:
            async for raw in self.ws:
                event = json.loads(raw)
                event_type = event.get("type")
                data = event.get("data") or {}

                if event_type == "tts.connection.done":
                    self.session_id = data.get("session_id", "")
                    LOGGER.info("tts connection done turn=%s session_id=%s", self.turn_id, self.session_id)
                    self.connection_ready.set()
                elif event_type == "tts.response.created":
                    LOGGER.info("tts response created turn=%s", self.turn_id)
                    self.create_ready.set()
                elif event_type == "tts.response.sentence.start":
                    self.synthesis_started = True
                    sentence_text = data.get("text", "")
                    if not self.first_sentence_started_at:
                        self.first_sentence_started_at = time.perf_counter()
                        LOGGER.info(
                            "tts first sentence latency turn=%s latency_ms=%s",
                            self.turn_id,
                            round((self.first_sentence_started_at - self.first_text_sent_at) * 1000)
                            if self.first_text_sent_at
                            else None,
                        )
                    LOGGER.info(
                        "tts sentence start turn=%s text_chars=%s text=%r",
                        self.turn_id,
                        len(sentence_text),
                        sentence_text,
                    )
                    await self.session.send_browser(
                        {
                            "type": "tts.started",
                            "turn_id": self.turn_id,
                            "text": data.get("text", ""),
                        }
                    )
                elif event_type == "tts.response.audio.delta":
                    audio = data.get("audio")
                    if audio:
                        if not self.session.is_current_turn(self.turn_id):
                            LOGGER.info("tts_drop_stale_audio turn=%s chunk=%s", self.turn_id, self.audio_chunks + 1)
                            continue
                        self.synthesis_started = True
                        self.audio_chunks += 1
                        if not self.first_audio_delta_at:
                            self.first_audio_delta_at = time.perf_counter()
                            LOGGER.info(
                                "tts first audio latency turn=%s latency_ms=%s",
                                self.turn_id,
                                round((self.first_audio_delta_at - self.first_text_sent_at) * 1000)
                                if self.first_text_sent_at
                                else None,
                            )
                        LOGGER.info(
                            "tts audio delta turn=%s chunk=%s status=%s duration=%s audio_b64_chars=%s",
                            self.turn_id,
                            self.audio_chunks,
                            data.get("status"),
                            data.get("duration"),
                            len(audio),
                        )
                        avatar_audio = await self.session.send_avatar_audio(self.turn_id, audio)
                        await self.session.send_browser(
                            {
                                "type": "tts.audio",
                                "turn_id": self.turn_id,
                                "audio": audio,
                                "avatar_audio": avatar_audio,
                                "format": self.settings.tts_response_format,
                                "mime_type": MIME_BY_FORMAT.get(self.settings.tts_response_format, "application/octet-stream"),
                                "sample_rate": self.settings.tts_sample_rate,
                                "duration": data.get("duration"),
                                "status": data.get("status"),
                            }
                        )
                elif event_type == "tts.text.flushed":
                    LOGGER.info("tts flushed turn=%s", self.turn_id)
                    await self.session.send_browser({"type": "tts.flushed", "turn_id": self.turn_id})
                elif event_type in {"tts.response.audio.done", "response.audio.done"}:
                    self.audio_done_seen = True
                    LOGGER.info("tts audio done turn=%s chunks=%s", self.turn_id, self.audio_chunks)
                    audio = data.get("audio")
                    if audio and self.audio_chunks == 0:
                        if not self.session.is_current_turn(self.turn_id):
                            LOGGER.info("tts_drop_stale_audio_done turn=%s", self.turn_id)
                        else:
                            avatar_audio = await self.session.send_avatar_audio(self.turn_id, audio)
                            await self.session.send_browser(
                                {
                                    "type": "tts.audio",
                                    "turn_id": self.turn_id,
                                    "audio": audio,
                                    "avatar_audio": avatar_audio,
                                    "format": self.settings.tts_response_format,
                                    "mime_type": MIME_BY_FORMAT.get(
                                        self.settings.tts_response_format,
                                        "application/octet-stream",
                                    ),
                                    "sample_rate": self.settings.tts_sample_rate,
                                    "duration": data.get("duration"),
                                    "status": "finished",
                                }
                            )
                    if self.session.is_current_turn(self.turn_id):
                        LOGGER.info("tts avatar drain start turn=%s", self.turn_id)
                        await self.session.finish_avatar_audio(self.turn_id)
                        LOGGER.info("tts avatar drain done turn=%s", self.turn_id)
                        await self.session.send_browser({"type": "tts.done", "turn_id": self.turn_id})
                    else:
                        LOGGER.info("tts_drop_stale_done turn=%s", self.turn_id)
                    self.done.set()
                elif event_type == "tts.response.error":
                    LOGGER.error("tts_failed turn=%s error=%s", self.turn_id, extract_error(event))
                    self.done.set()
                    if self.session.is_current_turn(self.turn_id):
                        await self.session.reset_avatar_audio("tts_failed")
                    await self.session.send_browser({"type": "session.error", "stage": "tts", "message": extract_error(event)})
                elif event_type:
                    LOGGER.debug("tts event turn=%s type=%s", self.turn_id, event_type)
        except asyncio.CancelledError:
            raise
        except ConnectionClosed as exc:
            if self.audio_done_seen or self.done.is_set() or self.closed:
                LOGGER.info(
                    "tts websocket closed after done turn=%s code=%s reason=%s",
                    self.turn_id,
                    getattr(exc, "code", None),
                    getattr(exc, "reason", ""),
                )
            else:
                LOGGER.exception("tts reader connection closed before done turn=%s", self.turn_id)
                if self.session.is_current_turn(self.turn_id):
                    await self.session.reset_avatar_audio("tts_connection_closed")
                await self.session.send_browser({"type": "session.error", "stage": "tts", "message": str(exc)})
        except Exception as exc:
            if self.audio_done_seen or self.done.is_set() or self.closed:
                LOGGER.info("tts reader ended after done turn=%s error=%s", self.turn_id, exc)
            elif not self.closed:
                LOGGER.exception("tts reader failed turn=%s", self.turn_id)
                if self.session.is_current_turn(self.turn_id):
                    await self.session.reset_avatar_audio("tts_reader_failed")
                await self.session.send_browser({"type": "session.error", "stage": "tts", "message": str(exc)})
        finally:
            self.done.set()
            self.connection_ready.set()
            self.create_ready.set()


# -----------------------------------------------------------------------------
# Browser call session orchestration
# -----------------------------------------------------------------------------
class CallSession:
    """Orchestrates one browser call: ASR events drive LLM turns; LLM deltas feed TTS."""

    def __init__(self, browser_ws) -> None:
        """Initialize per-browser call state for ASR segmentation, LLM turns, and TTS playback."""
        self.browser_ws = browser_ws
        self.browser_send_lock = asyncio.Lock()
        self.settings = Settings.from_env()
        self.active = False
        self.closing = False
        self.asr_tasks: Set[asyncio.Task] = set()
        self.asr_speech_active = False
        self.asr_current_item_id = ""
        self.asr_audio_buffer = bytearray()
        self.asr_audio_clock_ms = 0
        self.asr_segment_start_ms = 0
        self.asr_segment_voice_ms = 0
        self.asr_last_voice_at = 0.0
        self.asr_last_voice_audio_ms = 0
        self.asr_pre_roll: Deque[tuple[bytes, int, int, float]] = deque()
        self.asr_pre_roll_ms = 0
        self.asr_candidate_active = False
        self.asr_candidate_start_ms = 0
        self.asr_candidate_voice_ms = 0
        self.asr_candidate_peak_rms = 0.0
        self.asr_noise_floor = 0.0
        self.llm_task: Optional[asyncio.Task] = None
        self.tts_streamer: Optional[TTSStreamer] = None
        self.tts_prepare_lock = asyncio.Lock()
        self.history: List[Dict[str, str]] = []
        self.partial_by_item: Dict[str, str] = {}
        self.completed_items = set()
        self.turn_id = 0
        self.interrupted_turns: Set[int] = set()
        self.pending_barge_in = False
        self.pending_barge_in_started_at = 0.0
        self.http_client: Optional[httpx.AsyncClient] = None
        self.avatar_start_task: Optional[asyncio.Task] = None

    # Browser WebSocket lifecycle and control messages.
    async def run(self) -> None:
        """Drive the browser WebSocket loop and dispatch binary audio or JSON control events."""
        LOGGER.info("browser session connected")
        await self.send_browser({"type": "session.idle"})
        try:
            async for message in self.browser_ws:
                if isinstance(message, bytes):
                    await self.handle_audio(message)
                    continue
                await self.handle_json(json.loads(message))
        except ConnectionClosed:
            pass
        except json.JSONDecodeError as exc:
            await self.send_browser({"type": "session.error", "stage": "browser", "message": f"Invalid JSON: {exc}"})
        finally:
            await self.close()
            LOGGER.info("browser session closed")

    async def handle_json(self, message: Dict[str, Any]) -> None:
        """Handle browser control messages such as start, stop, interrupt, and config updates."""
        message_type = message.get("type")
        if message_type == "session.start":
            await self.start(message.get("config") or {})
        elif message_type == "avatar.start":
            self.trigger_avatar_start("browser_avatar_start")
        elif message_type == "session.stop":
            await self.close()
        elif message_type == "interrupt":
            await self.interrupt_current_turn("client_interrupt")
        elif message_type == "config.update":
            self.settings = self.settings.apply_client_config(message.get("config") or {})
            await self.send_browser({"type": "config.updated", "config": self.settings.public_config()})
        elif message_type == "input_audio_buffer.commit":
            await self.commit_asr_audio()
        else:
            await (self.handle_avatar_json(message) if message_type in {"avatar.answer", "avatar.iceCandidate", "avatar.video.stats"} else self.send_browser({"type": "session.event", "message": f"Ignored unknown event: {message_type}"}))

    async def start(self, config: Dict[str, Any]) -> None:
        """Start a call by preparing ASR state, prewarming TTS, and validating LLM access."""
        # Cold start: prepare ASR segmentation, pre-warm TTS, and validate LLM before mic audio flows.
        if self.active:
            self.trigger_avatar_start("session_start_active")
            await self.send_browser({"type": "session.ready", "config": self.settings.public_config()})
            return

        self.closing = False
        self.reset_asr_segment()
        self.settings = Settings.from_env().apply_client_config(config)
        LOGGER.info(
            "session start requested asr=%s llm=%s tts=%s voice=%s base=%s ws=%s key=%s",
            self.settings.asr_model,
            self.settings.llm_model,
            self.settings.tts_model,
            self.settings.tts_voice,
            self.settings.base_url,
            self.settings.ws_base,
            mask_secret(self.settings.api_key),
        )
        avatar_task = self.trigger_avatar_start("session_start")
        if not self.settings.api_key:
            await self.send_browser(
                {
                    "type": "session.error",
                    "stage": "config",
                    "message": "Missing API key config: STEP_API_KEY.",
                }
            )
            return

        self.active = True
        await self.send_browser({"type": "session.state", "state": "connecting"})
        asr_task = asyncio.create_task(self.prepare_asr())
        tts_task = asyncio.create_task(self.ensure_tts_ready(turn_id=0))
        llm_task = asyncio.create_task(self.warmup_llm())
        LOGGER.info("startup tasks launched: asr/llm/tts/avatar avatar_task_active=%s", bool(avatar_task and not avatar_task.done()))
        tts_task.add_done_callback(lambda task: asyncio.create_task(self._report_optional_startup_result("tts", task)))
        llm_task.add_done_callback(lambda task: asyncio.create_task(self._report_optional_startup_result("llm", task)))

        try:
            await asr_task
        except Exception as exc:
            LOGGER.exception("asr startup failed")
            await self.send_browser({"type": "session.error", "stage": "asr", "message": str(exc)})
            for task in (tts_task, llm_task):
                if not task.done():
                    task.cancel()
            for task in (tts_task, llm_task):
                with contextlib.suppress(Exception, asyncio.CancelledError):
                    await task
            await self.close()
            return

        LOGGER.info("session ready: asr prepared; llm/tts/avatar continue independently")
        await self.send_browser({"type": "session.ready", "config": self.settings.public_config()})
        await self.send_browser({"type": "session.state", "state": "listening"})

    def trigger_avatar_start(self, reason: str) -> Optional[asyncio.Task]:
        """Start the Avatar connection independently from StepFun ASR/LLM/TTS startup."""
        if self.closing:
            LOGGER.info("avatar start skipped reason=%s session_closing=true", reason)
            return None
        task = self.avatar_start_task
        if task is not None and not task.done():
            LOGGER.info("avatar start already pending reason=%s", reason)
            return task
        LOGGER.info("avatar start triggered reason=%s", reason)
        task = asyncio.create_task(self.ensure_avatar_ready())
        self.avatar_start_task = task
        task.add_done_callback(self._log_avatar_startup_result)
        return task

    async def _report_optional_startup_result(self, stage: str, task: asyncio.Task) -> None:
        """Report non-fatal warmup results without closing the call session."""
        if self.closing:
            return
        try:
            task.result()
        except asyncio.CancelledError:
            return
        except Exception as exc:
            LOGGER.exception("%s warmup failed; continuing session", stage)
            await self.send_browser(
                {
                    "type": "session.event",
                    "message": f"{stage} warmup failed; will retry when needed: {exc}",
                }
            )
            return
        LOGGER.info("%s warmup completed", stage)

    def _log_avatar_startup_result(self, task: asyncio.Task) -> None:
        """Keep early Avatar connection errors from surfacing as unhandled task failures."""
        if self.avatar_start_task is task:
            self.avatar_start_task = None
        try:
            result = task.result()
        except asyncio.CancelledError:
            return
        except Exception:
            LOGGER.exception("avatar startup task failed")
            return
        LOGGER.info("avatar startup task completed result=%s", result)

    # Local ASR VAD, speech segmentation, and StepFun ASR SSE submission.
    async def handle_audio(self, chunk: bytes) -> None:
        """Process each PCM chunk through local VAD and create ASR-ready speech segments."""
        if not self.active or not chunk:
            return
        # The browser sends a continuous PCM stream; .ai ASR accepts one-shot audio,
        # so the proxy cuts speech segments locally before submitting them to SSE.
        chunk_ms = pcm16_duration_ms(chunk)
        chunk_start_ms = self.asr_audio_clock_ms
        self.asr_audio_clock_ms += chunk_ms
        rms = pcm16_rms(chunk)
        effective_threshold = self.effective_asr_threshold()
        is_voice = rms >= effective_threshold
        now = time.perf_counter()

        if self.asr_speech_active:
            self.asr_audio_buffer.extend(chunk)
            if is_voice:
                self.asr_segment_voice_ms += chunk_ms
                self.asr_last_voice_at = now
                self.asr_last_voice_audio_ms = self.asr_audio_clock_ms
            silence_ms = self.asr_audio_clock_ms - self.asr_last_voice_audio_ms if self.asr_last_voice_audio_ms else 0
            if silence_ms >= self.settings.asr_silence_ms:
                await self.finish_asr_segment("silence")
            return

        self.remember_asr_preroll(chunk, chunk_ms, chunk_start_ms, rms)
        if is_voice:
            if not self.asr_candidate_active:
                self.asr_candidate_active = True
                self.asr_candidate_start_ms = chunk_start_ms
                self.asr_candidate_voice_ms = 0
                self.asr_candidate_peak_rms = 0.0
                LOGGER.info(
                    "asr voice candidate start audio_start_ms=%s rms=%.4f noise_floor=%.4f effective_threshold=%.4f",
                    chunk_start_ms,
                    rms,
                    self.asr_noise_floor,
                    effective_threshold,
                )
            self.asr_candidate_voice_ms += chunk_ms
            self.asr_candidate_peak_rms = max(self.asr_candidate_peak_rms, rms)
            if self.asr_candidate_voice_ms >= self.settings.asr_start_voice_ms:
                await self.begin_asr_segment(now, self.asr_candidate_start_ms, rms, effective_threshold)
            return

        if self.asr_candidate_active:
            LOGGER.info(
                "asr voice candidate reset reason=below_threshold candidate_voice_ms=%s rms=%.4f noise_floor=%.4f effective_threshold=%.4f",
                self.asr_candidate_voice_ms,
                rms,
                self.asr_noise_floor,
                effective_threshold,
            )
            self.reset_asr_candidate()
        self.update_asr_noise_floor(rms)

    async def commit_asr_audio(self) -> None:
        """Force-submit the current ASR segment when the browser sends a manual commit event."""
        if not self.active:
            return
        LOGGER.info(
            "asr local commit audio active=%s candidate=%s buffered_bytes=%s candidate_voice_ms=%s",
            self.asr_speech_active,
            self.asr_candidate_active,
            len(self.asr_audio_buffer),
            self.asr_candidate_voice_ms,
        )
        if self.asr_candidate_active and not self.asr_speech_active:
            self.reset_asr_candidate()
        await self.finish_asr_segment("commit")

    async def send_browser(self, payload: Dict[str, Any]) -> None:
        """Send one JSON event to the browser with serialized writes protected by a lock."""
        async with self.browser_send_lock:
            try:
                await self.browser_ws.send(dumps(payload))
            except ConnectionClosed:
                pass

    async def get_http_client(self) -> httpx.AsyncClient:
        """Create or reuse the shared HTTP client used for StepFun LLM requests."""
        if self.http_client is None or self.http_client.is_closed:
            LOGGER.info("create shared http client base_url=%s", self.settings.base_url)
            self.http_client = httpx.AsyncClient(timeout=CHAT_TIMEOUT, limits=HTTP_LIMITS)
        return self.http_client

    def effective_asr_threshold(self) -> float:
        """Combine static RMS threshold with the adaptive noise floor threshold."""
        dynamic_threshold = self.asr_noise_floor * self.settings.asr_noise_multiplier
        return max(self.settings.asr_local_rms_threshold, dynamic_threshold)

    def update_asr_noise_floor(self, rms: float) -> None:
        """Update ambient noise estimation only while the user is idle."""
        # Only update the ambient floor while idle; likely speech is handled by candidate/speech states.
        if self.asr_speech_active or self.asr_candidate_active:
            return
        if self.asr_noise_floor <= 0:
            self.asr_noise_floor = rms
        else:
            self.asr_noise_floor = (self.asr_noise_floor * 0.95) + (rms * 0.05)

    def remember_asr_preroll(self, chunk: bytes, chunk_ms: int, chunk_start_ms: int, rms: float) -> None:
        """Keep a small pre-roll buffer so ASR does not lose the first syllable."""
        if self.settings.asr_preroll_ms <= 0:
            return
        self.asr_pre_roll.append((bytes(chunk), chunk_ms, chunk_start_ms, rms))
        self.asr_pre_roll_ms += chunk_ms
        while self.asr_pre_roll and self.asr_pre_roll_ms > self.settings.asr_preroll_ms:
            _, old_ms, _, _ = self.asr_pre_roll.popleft()
            self.asr_pre_roll_ms -= old_ms

    def reset_asr_candidate(self) -> None:
        """Clear the unconfirmed speech candidate state used before speech_started."""
        self.asr_candidate_active = False
        self.asr_candidate_start_ms = 0
        self.asr_candidate_voice_ms = 0
        self.asr_candidate_peak_rms = 0.0

    async def prepare_asr(self) -> None:
        """Reset local ASR state and notify the browser that ASR SSE mode is ready."""
        # There is no remote ASR socket to pre-open for .ai ASR SSE. These ready events
        # keep the browser state machine aligned with the TTS/LLM warmup flow.
        self.reset_asr_segment(reset_noise=True)
        LOGGER.info(
            "asr sse ready model=%s url=%s language=%s silence_ms=%s rms_threshold=%s start_voice_ms=%s preroll_ms=%s min_audio_ms=%s min_voice_ms=%s noise_multiplier=%s",
            self.settings.asr_model,
            self.settings.asr_sse_url,
            self.settings.language,
            self.settings.asr_silence_ms,
            self.settings.asr_local_rms_threshold,
            self.settings.asr_start_voice_ms,
            self.settings.asr_preroll_ms,
            self.settings.asr_min_audio_ms,
            self.settings.asr_min_voice_ms,
            self.settings.asr_noise_multiplier,
        )
        await self.send_browser({"type": "asr.session_created", "mode": "http_sse"})
        await self.send_browser({"type": "asr.session_updated", "mode": "http_sse"})

    def reset_asr_segment(self, reset_noise: bool = False) -> None:
        """Clear the active ASR segment and optionally reset the ambient noise floor."""
        self.asr_speech_active = False
        self.asr_current_item_id = ""
        self.asr_audio_buffer = bytearray()
        self.asr_segment_start_ms = self.asr_audio_clock_ms
        self.asr_segment_voice_ms = 0
        self.asr_last_voice_at = 0.0
        self.asr_last_voice_audio_ms = 0
        self.asr_pre_roll.clear()
        self.asr_pre_roll_ms = 0
        self.reset_asr_candidate()
        if reset_noise:
            self.asr_noise_floor = 0.0

    async def begin_asr_segment(self, now: float, audio_start_ms: int, rms: float, effective_threshold: float) -> None:
        """Promote a confirmed voice candidate into an active ASR segment."""
        pre_roll_chunks = list(self.asr_pre_roll)
        pre_roll_ms = sum(chunk_ms for _, chunk_ms, _, _ in pre_roll_chunks)
        pre_roll_start_ms = pre_roll_chunks[0][2] if pre_roll_chunks else audio_start_ms
        candidate_voice_ms = self.asr_candidate_voice_ms
        candidate_peak_rms = self.asr_candidate_peak_rms
        self.asr_speech_active = True
        self.asr_current_item_id = event_id("item")
        self.asr_audio_buffer = bytearray()
        for pre_roll_chunk, _, _, _ in pre_roll_chunks:
            self.asr_audio_buffer.extend(pre_roll_chunk)
        self.asr_segment_start_ms = pre_roll_start_ms
        self.asr_segment_voice_ms = candidate_voice_ms
        self.asr_last_voice_at = now
        self.asr_last_voice_audio_ms = self.asr_audio_clock_ms
        self.asr_pre_roll.clear()
        self.asr_pre_roll_ms = 0
        self.reset_asr_candidate()
        if self.response_active():
            # Treat local VAD as a candidate only; actual barge-in waits for recognized text.
            self.pending_barge_in = True
            self.pending_barge_in_started_at = now
            LOGGER.info("barge-in candidate from local speech_started; waiting for transcript turn=%s", self.turn_id)
        LOGGER.info(
            "asr local speech started item=%s audio_start_ms=%s candidate_start_ms=%s preroll_ms=%s candidate_voice_ms=%s rms=%.4f peak_rms=%.4f noise_floor=%.4f effective_threshold=%.4f",
            self.asr_current_item_id,
            pre_roll_start_ms,
            audio_start_ms,
            pre_roll_ms,
            candidate_voice_ms,
            rms,
            candidate_peak_rms,
            self.asr_noise_floor,
            effective_threshold,
        )
        await self.send_browser(
            {
                "type": "asr.speech_started",
                "item_id": self.asr_current_item_id,
                "audio_start_ms": pre_roll_start_ms,
            }
        )
        await self.send_browser({"type": "session.state", "state": "recognizing"})

    async def finish_asr_segment(self, reason: str) -> None:
        """Close the current ASR segment, filter weak audio, and submit valid audio to SSE."""
        if not self.asr_speech_active:
            return
        item_id = self.asr_current_item_id or event_id("item")
        audio_bytes = bytes(self.asr_audio_buffer)
        audio_end_ms = self.asr_audio_clock_ms
        audio_ms = pcm16_duration_ms(audio_bytes)
        segment_voice_ms = self.asr_segment_voice_ms
        noise_floor = self.asr_noise_floor
        effective_threshold = self.effective_asr_threshold()
        self.reset_asr_segment()
        LOGGER.info(
            "asr local speech stopped item=%s reason=%s audio_ms=%s segment_voice_ms=%s bytes=%s noise_floor=%.4f effective_threshold=%.4f",
            item_id,
            reason,
            audio_ms,
            segment_voice_ms,
            len(audio_bytes),
            noise_floor,
            effective_threshold,
        )
        await self.send_browser(
            {
                "type": "asr.speech_stopped",
                "item_id": item_id,
                "audio_end_ms": audio_end_ms,
            }
        )
        skip_reason = ""
        if audio_ms < self.settings.asr_min_audio_ms:
            skip_reason = "audio_too_short"
        elif segment_voice_ms < self.settings.asr_min_voice_ms:
            skip_reason = "voice_too_short"
        if skip_reason:
            LOGGER.info(
                "asr skip segment item=%s skip_reason=%s audio_ms=%s min_audio_ms=%s segment_voice_ms=%s min_voice_ms=%s noise_floor=%.4f effective_threshold=%.4f",
                item_id,
                skip_reason,
                audio_ms,
                self.settings.asr_min_audio_ms,
                segment_voice_ms,
                self.settings.asr_min_voice_ms,
                noise_floor,
                effective_threshold,
            )
            self.pending_barge_in = False
            await self.send_browser({"type": "session.state", "state": "listening"})
            return
        # Run ASR independently so microphone capture can continue while recognition streams back.
        task = asyncio.create_task(self.run_asr_sse(item_id, audio_bytes, audio_ms))
        self.asr_tasks.add(task)
        task.add_done_callback(self.asr_tasks.discard)

    async def run_asr_sse(self, item_id: str, audio_bytes: bytes, audio_ms: int) -> None:
        """Build the StepFun ASR SSE request and retry transient transport failures."""
        text = ""
        done_seen = False
        # Payload shape follows StepFun .ai ASR SSE docs: base64 PCM16/16k/mono.
        payload = {
            "audio": {
                "data": base64.b64encode(audio_bytes).decode("ascii"),
                "input": {
                    "transcription": {
                        "language": self.settings.language,
                        "model": self.settings.asr_model,
                        "enable_itn": self.settings.asr_enable_itn,
                        "enable_timestamp": True,
                    },
                    "format": {
                        "type": "pcm",
                        "codec": "pcm_s16le",
                        "rate": 16000,
                        "bits": 16,
                        "channel": 1,
                    },
                },
            }
        }
        headers = {
            "Authorization": f"Bearer {self.settings.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        started_at = time.perf_counter()
        LOGGER.info(
            "asr sse request item=%s model=%s url=%s audio_ms=%s bytes=%s",
            item_id,
            self.settings.asr_model,
            self.settings.asr_sse_url,
            audio_ms,
            len(audio_bytes),
        )
        try:
            max_attempts = max(1, self.settings.asr_sse_retries + 1)
            for attempt in range(1, max_attempts + 1):
                try:
                    text, done_seen = await self.stream_asr_sse_attempt(
                        item_id=item_id,
                        payload=payload,
                        headers=headers,
                        started_at=started_at,
                        attempt=attempt,
                    )
                    break
                except ASR_TRANSPORT_ERRORS as exc:
                    if attempt >= max_attempts:
                        raise
                    LOGGER.warning(
                        "asr sse transport retry item=%s attempt=%s/%s error=%s",
                        item_id,
                        attempt,
                        max_attempts,
                        exc,
                    )
                    await asyncio.sleep(0.25 * attempt)
            if not done_seen:
                LOGGER.info("asr sse stream ended without done item=%s chars=%s", item_id, len(text))
                await self.handle_asr_final(item_id, text.strip())
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            LOGGER.exception("asr sse failed item=%s", item_id)
            self.pending_barge_in = False
            await self.send_browser({"type": "session.error", "stage": "asr", "message": str(exc)})
            if self.active:
                await self.send_browser({"type": "session.state", "state": "listening"})

    async def stream_asr_sse_attempt(
        self,
        item_id: str,
        payload: Dict[str, Any],
        headers: Dict[str, str],
        started_at: float,
        attempt: int,
    ) -> tuple[str, bool]:
        """Perform one ASR SSE HTTP request and parse transcript delta/done events."""
        text = ""
        done_seen = False
        timeout = httpx.Timeout(connect=10, read=45, write=20, pool=10)
        # ASR is a short one-shot upload. A fresh client avoids stale keep-alive reuse while LLM SSE is active.
        LOGGER.info(
            "asr sse attempt item=%s attempt=%s trust_env=%s",
            item_id,
            attempt,
            self.settings.http_trust_env,
        )
        async with httpx.AsyncClient(
            timeout=timeout,
            limits=httpx.Limits(max_keepalive_connections=0),
            trust_env=self.settings.http_trust_env,
        ) as client:
            async with client.stream("POST", self.settings.asr_sse_url, headers=headers, json=payload) as response:
                LOGGER.info(
                    "asr sse response item=%s attempt=%s http_status=%s response_header_latency_ms=%s",
                    item_id,
                    attempt,
                    response.status_code,
                    round((time.perf_counter() - started_at) * 1000),
                )
                if response.status_code >= 400:
                    body = await response.aread()
                    message = body.decode("utf-8", errors="replace")[:1000]
                    raise RuntimeError(f"ASR HTTP {response.status_code}: {message}")

                async for line in response.aiter_lines():
                    data = line.strip()
                    if not data:
                        continue
                    # httpx yields raw SSE lines; only JSON data frames carry ASR events.
                    if data.startswith("data:"):
                        data = data[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    if not data.startswith("{"):
                        continue
                    event = json.loads(data)
                    event_type = event.get("type")
                    if event_type == "transcript.text.delta":
                        delta = event.get("delta") or ""
                        if delta:
                            text += delta
                            LOGGER.info(
                                "asr sse delta item=%s chars=%s total_chars=%s text=%r",
                                item_id,
                                len(delta),
                                len(text),
                                delta,
                            )
                            await self.handle_asr_partial(item_id, delta, text)
                    elif event_type == "transcript.text.done":
                        done_seen = True
                        final_text = (event.get("text") or text).strip()
                        LOGGER.info(
                            "asr sse done item=%s chars=%s usage=%s text=%r",
                            item_id,
                            len(final_text),
                            event.get("usage"),
                            final_text,
                        )
                        await self.handle_asr_final(item_id, final_text)
                    elif event_type == "error":
                        raise RuntimeError(event.get("message") or extract_error(event))
                    elif event_type:
                        LOGGER.debug("asr sse event item=%s type=%s", item_id, event_type)
        return text, done_seen

    # ASR transcript handling and confirmed barge-in decisions.
    async def handle_asr_partial(self, item_id: str, delta: str, text: str) -> None:
        """Forward ASR partial text and confirm barge-in only after meaningful transcript text."""
        self.partial_by_item[item_id] = text
        await self.send_browser({"type": "asr.partial", "item_id": item_id, "delta": delta, "text": text})
        # Confirm barge-in by transcript length, which filters out brief noise and VAD spikes.
        if (
            self.pending_barge_in
            and self.response_active()
            and effective_transcript_len(text) >= self.settings.barge_in_min_chars
        ):
            LOGGER.info(
                "barge-in confirmed by asr sse transcript item=%s effective_chars=%s",
                item_id,
                effective_transcript_len(text),
            )
            self.pending_barge_in = False
            await self.interrupt_current_turn("speech_transcript_confirmed")

    async def handle_asr_final(self, item_id: str, transcript: str) -> None:
        """Forward final ASR text and start the next LLM turn when the transcript is usable."""
        if item_id in self.completed_items:
            return
        self.completed_items.add(item_id)
        self.partial_by_item.pop(item_id, None)
        LOGGER.info("asr final item=%s chars=%s text=%s", item_id, len(transcript), transcript[:120])
        await self.send_browser({"type": "asr.final", "item_id": item_id, "text": transcript})
        if transcript:
            effective_chars = effective_transcript_len(transcript)
            if self.response_active() and effective_chars < self.settings.barge_in_min_chars:
                LOGGER.info(
                    "ignore short barge-in final item=%s effective_chars=%s text=%s",
                    item_id,
                    effective_chars,
                    transcript[:40],
                )
                self.pending_barge_in = False
            else:
                self.pending_barge_in = False
                await self.start_llm_turn(transcript)
        else:
            self.pending_barge_in = False
            if self.active:
                await self.send_browser({"type": "session.state", "state": "listening"})

    # TTS preparation and LLM turn streaming.
    async def ensure_tts_ready(self, turn_id: int = 0) -> TTSStreamer:
        """Return a ready TTS streamer, reusing an idle prewarmed socket when possible."""
        # Reuse an idle TTS socket when possible to cut first-audio latency on the next turn.
        async with self.tts_prepare_lock:
            if (
                self.tts_streamer is not None
                and not self.tts_streamer.closed
                and self.tts_streamer.create_ready.is_set()
                and not self.tts_streamer.synthesis_started
                and not self.tts_streamer.done.is_set()
            ):
                self.tts_streamer.turn_id = turn_id
                LOGGER.info("tts already ready turn=%s session_id=%s", turn_id, self.tts_streamer.session_id)
                return self.tts_streamer

            if self.tts_streamer is not None:
                await self.tts_streamer.close()
                self.tts_streamer = None

            streamer = TTSStreamer(self, turn_id, self.settings)
            self.tts_streamer = streamer
            await streamer.start()
            LOGGER.info("tts ready for future turn turn=%s session_id=%s", turn_id, streamer.session_id)
            return streamer

    async def warmup_llm(self) -> None:
        """Send a tiny streaming LLM request to validate credentials and reduce first-turn latency."""
        # One-token stream request to validate API key and reduce cold-start latency on first user turn.
        if not self.settings.llm_warmup_enabled:
            LOGGER.info("llm warmup skipped by config")
            return

        payload = {
            "model": self.settings.llm_model,
            "stream": True,
            "temperature": 0,
            "max_tokens": 1,
            "messages": [
                {"role": "system", "content": "Connection test."},
                {"role": "user", "content": "ping"},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self.settings.api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        started_at = time.perf_counter()
        LOGGER.info("llm warmup request model=%s url=%s", self.settings.llm_model, self.settings.chat_url)
        client = await self.get_http_client()
        async with client.stream("POST", self.settings.chat_url, headers=headers, json=payload) as response:
            LOGGER.info("llm warmup response http_status=%s", response.status_code)
            if response.status_code >= 400:
                body = await response.aread()
                message = body.decode("utf-8", errors="replace")[:1000]
                raise RuntimeError(f"LLM warmup HTTP {response.status_code}: {message}")

            seen_event = False
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data:
                    continue
                seen_event = True
                if data == "[DONE]":
                    break
                chunk = json.loads(data)
                text = extract_llm_text(chunk)
                if text:
                    LOGGER.info(
                        "llm warmup first delta latency_ms=%s chars=%s",
                        round((time.perf_counter() - started_at) * 1000),
                        len(text),
                    )
                    break
            if not seen_event:
                LOGGER.warning("llm warmup finished with no SSE data events")

    def response_active(self) -> bool:
        """Report whether the assistant is currently producing text or audio."""
        # Assistant is "speaking" while LLM streams or TTS has started synthesis.
        llm_active = self.llm_task is not None and not self.llm_task.done()
        tts_active = (
            self.tts_streamer is not None
            and self.tts_streamer.synthesis_started
            and not self.tts_streamer.done.is_set()
        )
        return llm_active or tts_active

    def is_current_turn(self, turn_id: int) -> bool:
        """Return whether a streamed TTS event still belongs to the active assistant turn."""
        return self.active and not self.closing and turn_id == self.turn_id and turn_id not in self.interrupted_turns

    async def start_llm_turn(self, user_text: str) -> None:
        """Create a new assistant turn from final ASR text and start LLM streaming."""
        if self.response_active():
            await self.interrupt_current_turn("new_user_turn")
        self.turn_id += 1
        turn_id = self.turn_id
        self.interrupted_turns.discard(turn_id)
        self.history.append({"role": "user", "content": user_text})
        self.history = trim_history(self.history)
        LOGGER.info("llm turn start turn=%s user_chars=%s", turn_id, len(user_text))
        self.llm_task = asyncio.create_task(self._run_llm_turn(turn_id))

    async def _run_llm_turn(self, turn_id: int) -> None:
        """Stream StepFun LLM deltas to both browser text and StepFun TTS chunking."""
        # Stream LLM SSE; mirror each delta to browser and TTSChunker; reprepare TTS when done.
        assistant_text = ""
        tts: Optional[TTSStreamer] = None
        chunker: Optional[TTSChunker] = None
        current_task = asyncio.current_task()
        reprepare_tts = False
        cancelled = False

        try:
            await self.send_browser({"type": "session.state", "state": "responding"})
            try:
                tts = await self.ensure_tts_ready(turn_id=turn_id)
                chunker = TTSChunker(tts)
            except Exception as exc:
                await self.send_browser({"type": "session.error", "stage": "tts", "message": f"TTS startup failed, text only: {exc}"})
                if tts is not None:
                    await tts.close()
                tts = None
                self.tts_streamer = None

            payload = {
                "model": self.settings.llm_model,
                "stream": True,
                "temperature": self.settings.llm_temperature,
                "max_tokens": self.settings.llm_max_tokens,
                "messages": (
                    ([{"role": "system", "content": self.settings.system_prompt}] if self.settings.system_prompt else [])
                    + self.history
                ),
            }
            headers = {
                "Authorization": f"Bearer {self.settings.api_key}",
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
            }

            client = await self.get_http_client()
            llm_started_at = time.perf_counter()
            LOGGER.info("llm request turn=%s model=%s url=%s", turn_id, self.settings.llm_model, self.settings.chat_url)
            async with client.stream("POST", self.settings.chat_url, headers=headers, json=payload) as response:
                LOGGER.info(
                    "llm response turn=%s http_status=%s response_header_latency_ms=%s",
                    turn_id,
                    response.status_code,
                    round((time.perf_counter() - llm_started_at) * 1000),
                )
                if response.status_code >= 400:
                    body = await response.aread()
                    message = body.decode("utf-8", errors="replace")[:1000]
                    raise RuntimeError(f"LLM HTTP {response.status_code}: {message}")

                chunk_count = 0
                reasoning_chars = 0
                finish_reasons: List[str] = []
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        break
                    chunk = json.loads(data)
                    reasoning = extract_llm_reasoning(chunk)
                    if reasoning:
                        reasoning_chars += len(reasoning)
                        LOGGER.debug(
                            "llm reasoning delta turn=%s chars=%s total_reasoning_chars=%s text=%r",
                            turn_id,
                            len(reasoning),
                            reasoning_chars,
                            reasoning[:160],
                        )
                    finish_reasons.extend(extract_finish_reasons(chunk))
                    text = extract_llm_text(chunk)
                    if not text:
                        continue
                    chunk_count += 1
                    if chunk_count == 1:
                        LOGGER.info(
                            "llm first delta turn=%s latency_ms=%s chars=%s",
                            turn_id,
                            round((time.perf_counter() - llm_started_at) * 1000),
                            len(text),
                        )
                    LOGGER.info(
                        "llm delta turn=%s chunk=%s chars=%s text=%r",
                        turn_id,
                        chunk_count,
                        len(text),
                        text,
                    )
                    assistant_text += text
                    await self.send_browser({"type": "llm.delta", "turn_id": turn_id, "text": text})
                    if chunker is not None:
                        await chunker.feed(text)

            if chunker is not None:
                await chunker.finish()
            await self.send_browser({"type": "llm.done", "turn_id": turn_id, "text": assistant_text})
            LOGGER.info(
                "llm done turn=%s chunks=%s chars=%s reasoning_chars=%s finish_reasons=%s",
                turn_id,
                chunk_count,
                len(assistant_text),
                reasoning_chars,
                finish_reasons[-3:],
            )
            LOGGER.info("llm full text turn=%s chars=%s text=%r", turn_id, len(assistant_text), assistant_text)
            if not assistant_text.strip() and reasoning_chars:
                LOGGER.warning(
                    "llm returned reasoning but no final content turn=%s model=%s max_tokens=%s reasoning_chars=%s finish_reasons=%s",
                    turn_id,
                    self.settings.llm_model,
                    self.settings.llm_max_tokens,
                    reasoning_chars,
                    finish_reasons[-3:],
                )
            if assistant_text.strip():
                self.history.append({"role": "assistant", "content": assistant_text.strip()})
                self.history = trim_history(self.history)
            if tts is not None:
                await self.send_browser({"type": "session.state", "state": "speaking"})
                await tts.wait_done()
                await tts.close()
                reprepare_tts = True
        except asyncio.CancelledError:
            cancelled = True
            if tts is not None:
                await tts.close()
            raise
        except Exception as exc:
            LOGGER.exception("llm turn failed turn=%s", turn_id)
            await self.send_browser({"type": "session.error", "stage": "llm", "message": str(exc)})
            if tts is not None:
                await tts.close()
                reprepare_tts = True
        finally:
            if self.tts_streamer is tts:
                self.tts_streamer = None
            if self.llm_task is current_task:
                self.llm_task = None
            if self.active and not cancelled:
                if reprepare_tts and not self.closing:
                    try:
                        await self.ensure_tts_ready(turn_id=0)
                    except Exception as exc:
                        LOGGER.exception("tts reprepare failed after turn=%s", turn_id)
                        await self.send_browser({"type": "session.error", "stage": "tts", "message": str(exc)})
                await self.send_browser({"type": "session.state", "state": "listening"})

    # Barge-in cancellation and session cleanup.
    async def interrupt_current_turn(self, reason: str) -> None:
        """Cancel active LLM/TTS work and notify the browser when a turn is interrupted."""
        # Cancel LLM task, close active TTS, notify browser, then pre-warm TTS for the next utterance.
        had_active = self.response_active()
        interrupted_turn = self.turn_id
        if interrupted_turn:
            self.interrupted_turns.add(interrupted_turn)
        await self.reset_avatar_audio(reason)
        LOGGER.info("interrupt requested reason=%s active=%s turn=%s", reason, had_active, interrupted_turn)
        if self.llm_task is not None and not self.llm_task.done():
            self.llm_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.llm_task
        close_tts = (
            self.tts_streamer is not None
            and (self.tts_streamer.synthesis_started or reason == "session_stop")
        )
        if close_tts:
            await self.tts_streamer.close()
            self.tts_streamer = None
        if had_active:
            await self.send_browser({"type": "turn.interrupted", "reason": reason, "turn_id": self.turn_id})
            if not self.closing:
                try:
                    await self.ensure_tts_ready(turn_id=0)
                except Exception as exc:
                    LOGGER.exception("tts reprepare failed after interrupt reason=%s", reason)
                    await self.send_browser({"type": "session.error", "stage": "tts", "message": str(exc)})
            await self.send_browser({"type": "session.state", "state": "listening"})

    async def close_asr(self) -> None:
        """Cancel in-flight ASR SSE tasks and reset local ASR buffers."""
        # A browser disconnect can leave one-shot ASR SSE requests in flight; cancel them explicitly.
        for task in list(self.asr_tasks):
            task.cancel()
        for task in list(self.asr_tasks):
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task
        self.asr_tasks.clear()
        self.reset_asr_segment()

    async def close(self) -> None:
        """Shut down all per-call resources and tell the browser the session is closed."""
        self.closing = True
        self.active = False
        await self.interrupt_current_turn("session_stop")
        await self.close_asr()
        avatar_start_task = self.avatar_start_task
        self.avatar_start_task = None
        if avatar_start_task is not None and not avatar_start_task.done():
            avatar_start_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await avatar_start_task
        if self.http_client is not None and not self.http_client.is_closed:
            await self.http_client.aclose()
        self.http_client = None; await self.close_avatar()
        await self.send_browser({"type": "session.state", "state": "closed"})


# -----------------------------------------------------------------------------
# NavTalk AudioBack bridge
# -----------------------------------------------------------------------------
NAVTALK_AUDIO_APPEND = "realtime.input_audio_buffer.append"
NAVTALK_TAIL_SILENCE_MS = env_int("NAVTALK_TAIL_SILENCE_MS", 250)
NAVTALK_AUDIO_SAMPLE_RATE = 24000
NAVTALK_AUDIO_CHUNK_SAMPLES = env_int("NAVTALK_AUDIO_CHUNK_SAMPLES", 1024)
NAVTALK_IDLE_SILENCE_DEFAULT_MS = round(NAVTALK_AUDIO_CHUNK_SAMPLES * 1000 / NAVTALK_AUDIO_SAMPLE_RATE)
NAVTALK_SEND_TIMEOUT_SECONDS = env_float("NAVTALK_SEND_TIMEOUT_SECONDS", 2.0)
NAVTALK_CONNECT_OPEN_TIMEOUT_SECONDS = env_float("NAVTALK_CONNECT_OPEN_TIMEOUT_SECONDS", 30.0)
NAVTALK_CONNECT_RETRIES = env_int("NAVTALK_CONNECT_RETRIES", 3)
NAVTALK_CONNECT_RETRY_DELAY_SECONDS = env_float("NAVTALK_CONNECT_RETRY_DELAY_SECONDS", 1.5)
NAVTALK_AVATAR_IMAGE_URL = "https://navtalk.s3.us-east-2.amazonaws.com/uploadFiles/navtalk.Leo.png"


@dataclass(frozen=True)
class NavTalkAudioItem:
    """One immutable PCM chunk bound to a single assistant audio turn."""

    turn_id: int
    epoch: int
    stream_id: str
    trace_id: str
    sequence: int
    audio_bytes: bytes
    duration_seconds: float
    enqueued_at: float
    kind: str = "audio"


def navtalk_public_config() -> Dict[str, Any]:
    """Return non-secret Avatar configuration for the browser UI."""
    enabled = env_bool("NAVTALK_ENABLED", True)
    license_key = os.environ.get("NAVTALK_LICENSE", "").strip()
    avatar_id = os.environ.get("NAVTALK_AVATAR_ID", "").strip()
    ws_url = env_str("NAVTALK_WS_URL", "ws://localhost:8811/wss/v2/realtime-chat")
    return {
        "enabled": enabled,
        "configured": bool(enabled and license_key and avatar_id and ws_url),
        "image_url": env_str("NAVTALK_AVATAR_IMAGE_URL", NAVTALK_AVATAR_IMAGE_URL),
    }


class NavTalkAudioBackClient:
    """Bridge StepFun TTS PCM chunks into NavTalk AudioBack and forward WebRTC signaling."""

    def __init__(self, session: CallSession) -> None:
        self.session = session
        self.enabled = env_bool("NAVTALK_ENABLED", True)
        self.license_key = os.environ.get("NAVTALK_LICENSE", "").strip()
        self.avatar_id = os.environ.get("NAVTALK_AVATAR_ID", "").strip()
        self.ws_url = env_str("NAVTALK_WS_URL", "ws://localhost:8811/wss/v2/realtime-chat")
        self.ws = None
        self.reader_task: Optional[asyncio.Task] = None
        self.idle_silence_task: Optional[asyncio.Task] = None
        self.audio_sender_task: Optional[asyncio.Task] = None
        self.audio_queue: Optional[asyncio.Queue] = None
        self.start_lock = asyncio.Lock()
        self.send_lock = asyncio.Lock()
        self.ready_to_send_audio = False
        self.closed = False
        self.video_keepalive_enabled = env_bool("NAVTALK_VIDEO_KEEPALIVE_ENABLED", True)
        self.video_keepalive_idle_always = env_bool("NAVTALK_VIDEO_KEEPALIVE_IDLE_ALWAYS", True)
        self.idle_silence_ms = env_int("NAVTALK_VIDEO_KEEPALIVE_MS", NAVTALK_IDLE_SILENCE_DEFAULT_MS)
        self.idle_silence_paused = False
        self.send_timeout_seconds = NAVTALK_SEND_TIMEOUT_SECONDS
        self.connect_open_timeout_seconds = NAVTALK_CONNECT_OPEN_TIMEOUT_SECONDS
        self.connect_retries = max(1, NAVTALK_CONNECT_RETRIES)
        self.connect_retry_delay_seconds = max(0.0, NAVTALK_CONNECT_RETRY_DELAY_SECONDS)
        self.ws_proxy = env_str("NAVTALK_WS_PROXY", "direct")
        self.configuration: Dict[str, Any] = {"iceServers": [{"urls": "stun:stun.l.google.com:19302"}]}
        self.turn_id = 0
        self.audio_epoch = 0
        self.stream_id = ""
        self.trace_id = ""
        self.sequence = 0
        self.audio_epoch_pending: Dict[int, int] = {}
        self.audio_epoch_pending_seconds: Dict[int, float] = {}
        self.audio_epoch_events: Dict[int, asyncio.Event] = {}
        self.audio_failure_reported = False
        self.idle_stream_id = ""
        self.idle_trace_id = ""
        self.idle_sequence = 0
        self.next_audio_send_at = 0.0
        self.format_warning_sent = False
        self.last_video_stalled = False
        self.last_video_stats_at = 0.0

    @property
    def configured(self) -> bool:
        return bool(self.enabled and self.license_key and self.avatar_id and self.ws_url)

    async def start(self) -> bool:
        """Connect NavTalk AudioBack when configured."""
        if not self.enabled:
            await self._state("disabled", "Avatar disabled")
            return False
        if not self.configured:
            await self._state("unconfigured", "Avatar fallback audio")
            return False
        if self.ws is not None and not self.closed:
            return True
        async with self.start_lock:
            if self.ws is not None and not self.closed:
                return True
            self.closed = False
            self.ready_to_send_audio = False
            attempts = self.connect_retries
            for attempt in range(1, attempts + 1):
                await self._state("connecting", f"Avatar connecting ({attempt}/{attempts})")
                started_at = time.perf_counter()
                try:
                    LOGGER.info(
                        "navtalk connect attempt=%s/%s host=%s open_timeout=%s proxy=%s",
                        attempt,
                        attempts,
                        urlparse(self.ws_url).netloc,
                        self.connect_open_timeout_seconds,
                        self._proxy_label(),
                    )
                    self.ws = await websockets.connect(self._connection_url(), **self._connect_kwargs())
                    LOGGER.info(
                        "navtalk connect ok attempt=%s latency_ms=%s",
                        attempt,
                        round((time.perf_counter() - started_at) * 1000),
                    )
                    self.reader_task = asyncio.create_task(self._read_events())
                    return True
                except Exception as exc:
                    self.ws = None
                    latency_ms = round((time.perf_counter() - started_at) * 1000)
                    if attempt >= attempts:
                        LOGGER.exception("navtalk connect failed after %s attempts latency_ms=%s", attempts, latency_ms)
                        await self._error(f"NavTalk connect failed after {attempts} attempts: {exc}")
                        return False
                    LOGGER.warning(
                        "navtalk connect failed attempt=%s/%s latency_ms=%s error=%s; retrying",
                        attempt,
                        attempts,
                        latency_ms,
                        exc,
                    )
                    await self._state("connecting", f"Avatar reconnecting ({attempt + 1}/{attempts})")
                    await asyncio.sleep(self.connect_retry_delay_seconds * attempt)
            return False

    def _connection_url(self) -> str:
        separator = "&" if "?" in self.ws_url else "?"
        return f"{self.ws_url}{separator}license={self.license_key}&avatarId={self.avatar_id}&audioBack=true"

    def _connect_kwargs(self) -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {
            "max_size": None,
            "ping_interval": 20,
            "ping_timeout": 20,
        }
        parameters = inspect.signature(websockets.connect).parameters
        if "open_timeout" in parameters:
            kwargs["open_timeout"] = self.connect_open_timeout_seconds
        if "proxy" in parameters:
            proxy_setting = self.ws_proxy.strip()
            if proxy_setting.lower() in {"", "none", "false", "0", "off", "direct"}:
                kwargs["proxy"] = None
            else:
                kwargs["proxy"] = proxy_setting
        return kwargs

    def _proxy_label(self) -> str:
        proxy_setting = self.ws_proxy.strip()
        if proxy_setting.lower() in {"", "none", "false", "0", "off", "direct"}:
            return "direct"
        return "configured"

    async def _read_events(self) -> None:
        try:
            async for raw in self.ws:
                if not isinstance(raw, str):
                    continue
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    LOGGER.warning("navtalk ignored invalid json")
                    continue
                await self._handle_event(event)
        except ConnectionClosed as exc:
            if not self.closed:
                LOGGER.warning("navtalk websocket closed code=%s reason=%s", getattr(exc, "code", None), getattr(exc, "reason", ""))
        except Exception as exc:
            if not self.closed:
                LOGGER.exception("navtalk reader failed")
                await self._error(str(exc))
        finally:
            was_closed = self.closed
            self.ready_to_send_audio = False
            await self._stop_idle_silence()
            self.ws = None
            self.reader_task = None
            if not was_closed:
                self.closed = True
                await self._state("closed", "Avatar closed")

    async def _handle_event(self, event: Dict[str, Any]) -> None:
        event_type = event.get("type") or ""
        data = event.get("data") or {}
        log_method = LOGGER.debug if event_type in {"realtime.response.audio.delta", "realtime.response.video.delta"} else LOGGER.info
        log_method("navtalk event type=%s data_keys=%s", event_type, list(data.keys())[:8] if isinstance(data, dict) else [])
        if event_type == "conversation.connected.success":
            if data.get("iceServers"):
                self.configuration = {"iceServers": data.get("iceServers")}
            self.ready_to_send_audio = True
            if self.video_keepalive_idle_always:
                self._start_idle_silence("avatar_ready_idle")
            await self._state("ready", "Avatar ready")
        elif event_type == "conversation.connected.warning":
            await self._state("warning", event.get("message") or data.get("message") or "Avatar warning")
        elif event_type in {"conversation.connected.fail", "conversation.connected.close", "conversation.connected.insufficient_balance"}:
            await self._error(event.get("message") or data.get("message") or "Avatar connection failed")
        elif event_type == "webrtc.signaling.offer":
            await self.session.send_browser({"type": "avatar.offer", "sdp": data.get("sdp"), "configuration": self.configuration})
        elif event_type == "webrtc.signaling.iceCandidate":
            await self.session.send_browser({"type": "avatar.iceCandidate", "candidate": data.get("candidate")})
        elif event_type in {"realtime_synthesis.tts.error", "realtime_synthesis.stt.error"}:
            await self._error(event.get("message") or data.get("message") or "Avatar synthesis error")

    async def handle_browser_event(self, message: Dict[str, Any]) -> None:
        message_type = message.get("type")
        data = message.get("data") or {}
        if message_type == "avatar.answer":
            await self._send({"type": "webrtc.signaling.answer", "data": {"sdp": data.get("sdp") or message.get("sdp")}})
        elif message_type == "avatar.iceCandidate":
            await self._send({"type": "webrtc.signaling.iceCandidate", "data": {"candidate": data.get("candidate") or message.get("candidate")}})
        elif message_type == "avatar.video.stats":
            await self.handle_video_stats(data or message)

    async def handle_video_stats(self, data: Dict[str, Any]) -> None:
        """Receive browser WebRTC/video frame stats and start keepalive only when frames stall."""
        now = time.perf_counter()
        stalled = bool(data.get("stalled"))
        self.last_video_stalled = stalled
        self.last_video_stats_at = now
        LOGGER.info(
            "avatar.video.stats stalled=%s has_video=%s ready_state=%s paused=%s current_time=%s frames_decoded=%s fps=%s bytes_received=%s keepalive_running=%s keepalive_idle_always=%s",
            stalled,
            data.get("hasVideo"),
            data.get("readyState"),
            data.get("paused"),
            data.get("currentTime"),
            data.get("framesDecoded"),
            data.get("framesPerSecond"),
            data.get("bytesReceived"),
            self.idle_silence_task is not None and not self.idle_silence_task.done(),
            self.video_keepalive_idle_always,
        )
        if stalled and self.video_keepalive_enabled and self.ready_to_send_audio and not self.stream_id:
            self._start_idle_silence("video_stalled")
        elif not stalled and not self.video_keepalive_idle_always and self.idle_silence_task is not None:
            await self._stop_idle_silence()

    async def send_audio(self, turn_id: int, audio: str, audio_format: str, sample_rate: int) -> bool:
        """Forward one StepFun TTS audio delta to NavTalk."""
        if audio_format != "pcm" or int(sample_rate or 0) != 24000:
            if not self.format_warning_sent:
                self.format_warning_sent = True
                await self._error("Avatar requires pcm / 24000Hz TTS audio")
            return False
        if not self.configured:
            return False
        if self.ws is None or self.closed:
            await self.start()
        if not self.ready_to_send_audio:
            return False
        try:
            audio_bytes = base64.b64decode(audio)
        except Exception as exc:
            LOGGER.warning("navtalk ignored invalid tts audio: %s", exc)
            return False
        if len(audio_bytes) % 2:
            audio_bytes = audio_bytes[:-1]
        if not audio_bytes:
            return True
        if turn_id != self.turn_id or not self.stream_id:
            self._begin_audio_turn(turn_id)
        epoch = self.audio_epoch
        stream_id = self.stream_id
        trace_id = self.trace_id
        items = self._build_audio_items(turn_id, epoch, stream_id, trace_id, audio_bytes, "audio")
        if not items:
            return True
        self._ensure_audio_sender()
        for item in items:
            await self._enqueue_audio_item(item)
        LOGGER.info(
            "audio_enqueue turn=%s epoch=%s chunks=%s bytes=%s queue_ms=%s",
            turn_id,
            epoch,
            len(items),
            len(audio_bytes),
            round(self.audio_epoch_pending_seconds.get(epoch, 0.0) * 1000),
        )
        return True

    async def finish_audio(self, turn_id: int) -> None:
        """Send a short silence tail so AudioBack can finish the current utterance."""
        if turn_id != self.turn_id or not self.stream_id or not self.trace_id or not self.ready_to_send_audio:
            return
        epoch = self.audio_epoch
        stream_id = self.stream_id
        trace_id = self.trace_id
        if not await self._wait_for_audio_epoch(epoch):
            return
        if not self._audio_turn_matches(turn_id, epoch, stream_id, trace_id):
            LOGGER.info("audio_drop_stale turn=%s epoch=%s reason=finish_after_turn_switch", turn_id, epoch)
            return
        tail_samples = max(0, int(NAVTALK_TAIL_SILENCE_MS * NAVTALK_AUDIO_SAMPLE_RATE / 1000))
        tail_items = self._build_audio_items(turn_id, epoch, stream_id, trace_id, b"\x00\x00" * tail_samples, "tail")
        if tail_items:
            self._ensure_audio_sender()
            for item in tail_items:
                await self._enqueue_audio_item(item)
            LOGGER.info(
                "audio_enqueue turn=%s epoch=%s chunks=%s bytes=%s queue_ms=%s kind=tail",
                turn_id,
                epoch,
                len(tail_items),
                tail_samples * 2,
                round(self.audio_epoch_pending_seconds.get(epoch, 0.0) * 1000),
            )
            if not await self._wait_for_audio_epoch(epoch):
                return
        if self._audio_turn_matches(turn_id, epoch, stream_id, trace_id):
            LOGGER.info("audio_turn_finish turn=%s epoch=%s stream_id=%s", turn_id, epoch, stream_id)
            self.idle_stream_id = stream_id
            self.idle_trace_id = trace_id
            self.idle_sequence = self.sequence
            self.stream_id = ""
            self.trace_id = ""
            self.sequence = 0
            self.next_audio_send_at = 0.0
            if self.video_keepalive_idle_always:
                self._start_idle_silence("post_audio_idle")
            elif self.last_video_stalled:
                self._start_idle_silence("post_audio_stalled")

    async def reset_audio(self, reason: str) -> None:
        """Reset queued AudioBack audio without disturbing the continuous avatar video stream."""
        self._invalidate_audio_state(reason)
        if self.video_keepalive_idle_always:
            self._start_idle_silence(f"reset_{reason}_idle")
        elif self.last_video_stalled:
            self._start_idle_silence(f"reset_{reason}")

    async def close(self) -> None:
        self.closed = True
        self.ready_to_send_audio = False
        await self._stop_idle_silence()
        await self._stop_audio_sender()
        if self.ws is not None:
            with contextlib.suppress(Exception):
                await self.ws.close()
        if self.reader_task is not None:
            self.reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.reader_task
        self.ws = None
        self.reader_task = None
        await self._state("closed", "Avatar closed")

    def _start_idle_silence(self, reason: str = "video_keepalive") -> None:
        if not self.video_keepalive_enabled or self.closed or not self.ready_to_send_audio:
            return
        if self.idle_silence_task is not None and not self.idle_silence_task.done():
            self.idle_silence_paused = False
            return
        self.idle_silence_paused = False
        LOGGER.info("avatar.video.keepalive start reason=%s ms=%s", reason, self.idle_silence_ms)
        self.idle_silence_task = asyncio.create_task(self._idle_silence_loop())

    async def _stop_idle_silence(self) -> None:
        task = self.idle_silence_task
        self.idle_silence_task = None
        self.idle_stream_id = ""
        self.idle_trace_id = ""
        self.idle_sequence = 0
        self.idle_silence_paused = False
        if task is None or task.done() or task is asyncio.current_task():
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    async def _idle_silence_loop(self) -> None:
        silence_ms = self.idle_silence_ms if self.idle_silence_ms > 0 else NAVTALK_IDLE_SILENCE_DEFAULT_MS
        samples = max(1, int(NAVTALK_AUDIO_SAMPLE_RATE * silence_ms / 1000))
        silence = base64.b64encode(b"\x00\x00" * samples).decode("ascii")
        sleep_seconds = samples / NAVTALK_AUDIO_SAMPLE_RATE
        try:
            while not self.closed and self.ready_to_send_audio:
                if self.idle_silence_paused:
                    await asyncio.sleep(sleep_seconds)
                    continue
                if not self.idle_stream_id:
                    self.idle_stream_id = f"idle_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
                    self.idle_trace_id = f"trace_idle_{uuid.uuid4().hex[:12]}"
                    self.idle_sequence = 0
                sent = await self._send_audio_payload(
                    silence,
                    stream_id=self.idle_stream_id,
                    trace_id=self.idle_trace_id,
                    sequence=self.idle_sequence,
                )
                if not sent:
                    LOGGER.warning("avatar.video.keepalive send_failed")
                    break
                self.idle_sequence += 1
                await asyncio.sleep(sleep_seconds)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            LOGGER.warning("navtalk idle silence failed: %s", exc)
        finally:
            if self.idle_silence_task is asyncio.current_task():
                self.idle_silence_task = None

    def _ensure_audio_sender(self) -> None:
        if self.audio_queue is None:
            self.audio_queue = asyncio.Queue()
        if self.audio_sender_task is None or self.audio_sender_task.done():
            self.audio_sender_task = asyncio.create_task(self._audio_sender_loop())

    async def _stop_audio_sender(self) -> None:
        self._invalidate_audio_state("stop_audio_sender")
        task = self.audio_sender_task
        self.audio_sender_task = None
        self.next_audio_send_at = 0.0
        if task is None or task.done() or task is asyncio.current_task():
            self.audio_queue = None
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
        self.audio_queue = None

    def _begin_audio_turn(self, turn_id: int) -> None:
        self.idle_silence_paused = True
        if self.stream_id or self.trace_id:
            self._invalidate_audio_state("audio_turn_switch")
        else:
            self.audio_epoch += 1
        self.turn_id = turn_id
        if self.idle_stream_id and self.idle_trace_id:
            self.stream_id = self.idle_stream_id
            self.trace_id = self.idle_trace_id
            self.sequence = self.idle_sequence + 1
            stream_source = "idle_reuse"
        else:
            self.stream_id = f"audioback_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
            self.trace_id = f"trace_audio_{uuid.uuid4().hex[:12]}"
            self.sequence = 0
            self.idle_stream_id = self.stream_id
            self.idle_trace_id = self.trace_id
            self.idle_sequence = 0
            stream_source = "new"
        self.next_audio_send_at = 0.0
        self.audio_failure_reported = False
        LOGGER.info(
            "audio_turn_start turn=%s epoch=%s stream_id=%s trace_id=%s stream_source=%s sequence=%s",
            turn_id,
            self.audio_epoch,
            self.stream_id,
            self.trace_id,
            stream_source,
            self.sequence,
        )

    def _build_audio_items(
        self,
        turn_id: int,
        epoch: int,
        stream_id: str,
        trace_id: str,
        audio_bytes: bytes,
        kind: str,
    ) -> List[NavTalkAudioItem]:
        items: List[NavTalkAudioItem] = []
        max_bytes = NAVTALK_AUDIO_CHUNK_SAMPLES * 2
        now = time.perf_counter()
        for start in range(0, len(audio_bytes), max_bytes):
            chunk = audio_bytes[start : start + max_bytes]
            if len(chunk) % 2:
                chunk = chunk[:-1]
            if not chunk:
                continue
            sequence = self.sequence
            self.sequence += 1
            items.append(
                NavTalkAudioItem(
                    turn_id=turn_id,
                    epoch=epoch,
                    stream_id=stream_id,
                    trace_id=trace_id,
                    sequence=sequence,
                    audio_bytes=chunk,
                    duration_seconds=(len(chunk) // 2) / NAVTALK_AUDIO_SAMPLE_RATE,
                    enqueued_at=now,
                    kind=kind,
                )
            )
        return items

    async def _enqueue_audio_item(self, item: NavTalkAudioItem) -> None:
        if self.audio_queue is None:
            return
        event = self._audio_epoch_event(item.epoch)
        event.clear()
        self.audio_epoch_pending[item.epoch] = self.audio_epoch_pending.get(item.epoch, 0) + 1
        self.audio_epoch_pending_seconds[item.epoch] = (
            self.audio_epoch_pending_seconds.get(item.epoch, 0.0) + item.duration_seconds
        )
        await self.audio_queue.put(item)

    async def _wait_for_audio_epoch(self, epoch: int) -> bool:
        event = self._audio_epoch_event(epoch)
        timeout = max(15.0, self.audio_epoch_pending_seconds.get(epoch, 0.0) + 5.0)
        try:
            await asyncio.wait_for(event.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            LOGGER.warning("audio_drop_stale epoch=%s reason=wait_timeout timeout=%s", epoch, timeout)
            self._invalidate_audio_state("audio_wait_timeout")
            return False
        return True

    def _audio_epoch_event(self, epoch: int) -> asyncio.Event:
        event = self.audio_epoch_events.get(epoch)
        if event is None:
            event = asyncio.Event()
            self.audio_epoch_events[epoch] = event
        if self.audio_epoch_pending.get(epoch, 0) <= 0:
            event.set()
        return event

    def _complete_audio_item(self, item: NavTalkAudioItem) -> None:
        pending = self.audio_epoch_pending.get(item.epoch)
        if pending is None:
            return
        pending -= 1
        if pending <= 0:
            self.audio_epoch_pending.pop(item.epoch, None)
            self.audio_epoch_pending_seconds.pop(item.epoch, None)
            self._audio_epoch_event(item.epoch).set()
        else:
            self.audio_epoch_pending[item.epoch] = pending
            self.audio_epoch_pending_seconds[item.epoch] = max(
                0.0,
                self.audio_epoch_pending_seconds.get(item.epoch, 0.0) - item.duration_seconds,
            )

    def _audio_turn_matches(self, turn_id: int, epoch: int, stream_id: str, trace_id: str) -> bool:
        return (
            not self.closed
            and self.ready_to_send_audio
            and self.turn_id == turn_id
            and self.audio_epoch == epoch
            and self.stream_id == stream_id
            and self.trace_id == trace_id
        )

    def _is_audio_item_current(self, item: NavTalkAudioItem) -> bool:
        return self._audio_turn_matches(item.turn_id, item.epoch, item.stream_id, item.trace_id)

    def _invalidate_audio_state(self, reason: str) -> None:
        old_epoch = self.audio_epoch
        self.audio_epoch += 1
        dropped = self._clear_audio_queue(reason)
        self.turn_id = 0
        self.stream_id = ""
        self.trace_id = ""
        self.sequence = 0
        self.idle_stream_id = ""
        self.idle_trace_id = ""
        self.idle_sequence = 0
        self.next_audio_send_at = 0.0
        for epoch, event in list(self.audio_epoch_events.items()):
            if epoch <= old_epoch:
                self.audio_epoch_pending.pop(epoch, None)
                self.audio_epoch_pending_seconds.pop(epoch, None)
                event.set()
            if epoch < self.audio_epoch - 3:
                self.audio_epoch_events.pop(epoch, None)
        if dropped or old_epoch:
            LOGGER.info(
                "audio_drop_stale reason=%s old_epoch=%s new_epoch=%s dropped=%s",
                reason,
                old_epoch,
                self.audio_epoch,
                dropped,
            )

    def _clear_audio_queue(self, reason: str) -> int:
        dropped = 0
        if self.audio_queue is None:
            return dropped
        while True:
            try:
                item = self.audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
            else:
                dropped += 1
                if isinstance(item, NavTalkAudioItem):
                    LOGGER.info(
                        "audio_drop_stale turn=%s epoch=%s sequence=%s reason=%s",
                        item.turn_id,
                        item.epoch,
                        item.sequence,
                        reason,
                    )
                    self._complete_audio_item(item)
                self.audio_queue.task_done()
        return dropped

    async def _audio_sender_loop(self) -> None:
        try:
            while not self.closed:
                if self.audio_queue is None:
                    return
                item = await self.audio_queue.get()
                try:
                    if not isinstance(item, NavTalkAudioItem):
                        continue
                    if not self._is_audio_item_current(item):
                        LOGGER.info(
                            "audio_drop_stale turn=%s epoch=%s sequence=%s reason=sender_epoch_mismatch",
                            item.turn_id,
                            item.epoch,
                            item.sequence,
                        )
                        continue
                    await self._send_audio_item_realtime(item)
                finally:
                    if isinstance(item, NavTalkAudioItem):
                        self._complete_audio_item(item)
                    self.audio_queue.task_done()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            LOGGER.warning("navtalk audio sender failed: %s", exc)
        finally:
            if self.audio_sender_task is asyncio.current_task():
                self.audio_sender_task = None

    async def _send_audio_item_realtime(self, item: NavTalkAudioItem) -> None:
        now = time.perf_counter()
        if self.next_audio_send_at > now:
            await asyncio.sleep(self.next_audio_send_at - now)
        else:
            self.next_audio_send_at = now
        if not self._is_audio_item_current(item):
            LOGGER.info(
                "audio_drop_stale turn=%s epoch=%s sequence=%s reason=sender_after_sleep",
                item.turn_id,
                item.epoch,
                item.sequence,
            )
            return
        queue_ms = round(self.audio_epoch_pending_seconds.get(item.epoch, 0.0) * 1000)
        log_method = LOGGER.info if item.kind != "audio" or item.sequence % 25 == 0 else LOGGER.debug
        log_method(
            "audio_send turn=%s epoch=%s sequence=%s kind=%s bytes=%s queue_ms=%s",
            item.turn_id,
            item.epoch,
            item.sequence,
            item.kind,
            len(item.audio_bytes),
            queue_ms,
        )
        sent = await self._send_audio_payload(
            base64.b64encode(item.audio_bytes).decode("ascii"),
            stream_id=item.stream_id,
            trace_id=item.trace_id,
            sequence=item.sequence,
        )
        if sent:
            self.next_audio_send_at += item.duration_seconds
        else:
            await self._handle_audio_send_failed(item)

    async def _send_audio_payload(
        self,
        audio: str,
        stream_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        sequence: Optional[int] = None,
    ) -> bool:
        active_stream_id = stream_id or self.stream_id
        active_trace_id = trace_id or self.trace_id
        active_sequence = self.sequence if sequence is None else sequence
        if not active_stream_id or not active_trace_id:
            return False
        message_id = f"{active_stream_id}_{active_sequence}"
        sent = await self._send(
            {
                "type": NAVTALK_AUDIO_APPEND,
                "messageId": message_id,
                "traceId": active_trace_id,
                "data": {
                    "audio": audio,
                    "sampleRate": NAVTALK_AUDIO_SAMPLE_RATE,
                    "mimeType": f"audio/pcm;rate={NAVTALK_AUDIO_SAMPLE_RATE}",
                    "streamId": active_stream_id,
                    "traceId": active_trace_id,
                    "sequence": active_sequence,
                    "messageId": message_id,
                    "source": "user",
                },
            }
        )
        if sent and sequence is None:
            self.sequence += 1
        return sent

    async def _handle_audio_send_failed(self, item: NavTalkAudioItem) -> None:
        LOGGER.warning(
            "navtalk_send_failed turn=%s epoch=%s sequence=%s stream_id=%s",
            item.turn_id,
            item.epoch,
            item.sequence,
            item.stream_id,
        )
        self.ready_to_send_audio = False
        self._invalidate_audio_state("navtalk_send_failed")
        if not self.audio_failure_reported:
            self.audio_failure_reported = True
            await self.session.send_browser(
                {
                    "type": "avatar.error",
                    "message": "NavTalk audio send failed; using browser TTS fallback.",
                }
            )

    async def _send(self, payload: Dict[str, Any]) -> bool:
        if self.ws is None:
            return False
        async with self.send_lock:
            started_at = time.perf_counter()
            payload_type = str(payload.get("type") or "")
            try:
                await asyncio.wait_for(self.ws.send(dumps(payload)), timeout=self.send_timeout_seconds)
                latency_ms = round((time.perf_counter() - started_at) * 1000)
                if latency_ms >= 250:
                    LOGGER.warning("navtalk_send_slow type=%s latency_ms=%s", payload_type, latency_ms)
                else:
                    LOGGER.debug("navtalk_send type=%s latency_ms=%s", payload_type, latency_ms)
                return True
            except asyncio.TimeoutError:
                LOGGER.warning("navtalk_send_timeout type=%s timeout_seconds=%s", payload_type, self.send_timeout_seconds)
                self.ready_to_send_audio = False
                return False
            except Exception as exc:
                LOGGER.warning("navtalk_send_failed error=%s", exc)
                self.ready_to_send_audio = False
                return False

    async def _state(self, state: str, message: str) -> None:
        await self.session.send_browser({"type": "avatar.state", "state": state, "message": message})

    async def _error(self, message: str) -> None:
        self.ready_to_send_audio = False
        await self._stop_idle_silence()
        await self.session.send_browser({"type": "avatar.error", "message": message})


async def _call_session_ensure_avatar_ready(self: CallSession) -> bool:
    if self.closing:
        return False
    client = getattr(self, "avatar_client", None)
    if client is None:
        client = NavTalkAudioBackClient(self)
        self.avatar_client = client
    if self.closing:
        return False
    return await client.start()


async def _call_session_handle_avatar_json(self: CallSession, message: Dict[str, Any]) -> None:
    client = getattr(self, "avatar_client", None)
    if client is None and message.get("type") == "avatar.video.stats":
        return
    if client is None:
        client = NavTalkAudioBackClient(self)
        self.avatar_client = client
    await client.handle_browser_event(message)


async def _call_session_send_avatar_audio(self: CallSession, turn_id: int, audio: str) -> bool:
    if not self.is_current_turn(turn_id):
        LOGGER.info("audio_drop_stale turn=%s current_turn=%s reason=session_turn_mismatch", turn_id, self.turn_id)
        return False
    client = getattr(self, "avatar_client", None)
    if client is None:
        client = NavTalkAudioBackClient(self)
        self.avatar_client = client
    return await client.send_audio(turn_id, audio, self.settings.tts_response_format, self.settings.tts_sample_rate)


async def _call_session_finish_avatar_audio(self: CallSession, turn_id: int) -> None:
    if not self.is_current_turn(turn_id):
        LOGGER.info("audio_drop_stale turn=%s current_turn=%s reason=finish_turn_mismatch", turn_id, self.turn_id)
        return
    client = getattr(self, "avatar_client", None)
    if client is not None:
        await client.finish_audio(turn_id)


async def _call_session_reset_avatar_audio(self: CallSession, reason: str) -> None:
    client = getattr(self, "avatar_client", None)
    if client is not None:
        await client.reset_audio(reason)


async def _call_session_close_avatar(self: CallSession) -> None:
    client = getattr(self, "avatar_client", None)
    if client is not None:
        await client.close()
        self.avatar_client = None


CallSession.ensure_avatar_ready = _call_session_ensure_avatar_ready
CallSession.handle_avatar_json = _call_session_handle_avatar_json
CallSession.send_avatar_audio = _call_session_send_avatar_audio
CallSession.finish_avatar_audio = _call_session_finish_avatar_audio
CallSession.reset_avatar_audio = _call_session_reset_avatar_audio
CallSession.close_avatar = _call_session_close_avatar


# -----------------------------------------------------------------------------
# Static HTTP routes, WebSocket handler, and CLI entrypoint
# -----------------------------------------------------------------------------
async def process_request(path: str, request_headers) -> Optional[tuple]:
    """Serve static UI/API routes or allow /ws/call to upgrade to WebSocket."""
    # Same port serves static UI, health, voice catalog, and upgrades /ws/call to WebSocket.
    parsed = urlparse(path)
    clean_path = parsed.path
    if clean_path in {"/", "/index.html"}:
        body = INDEX_PATH.read_bytes()
        return (
            HTTPStatus.OK,
            [
                ("Content-Type", "text/html; charset=utf-8"),
                ("Cache-Control", "no-store"),
            ],
            body,
        )
    if clean_path == "/health":
        body = dumps({"ok": True}).encode("utf-8")
        return (
            HTTPStatus.OK,
            [
                ("Content-Type", "application/json; charset=utf-8"),
                ("Cache-Control", "no-store"),
            ],
            body,
        )
    if clean_path == "/api/voices":
        params = parse_qs(parsed.query)
        model = (params.get("model") or ["step-tts-2"])[0]
        payload = await fetch_system_voices_payload(model)
        body = dumps(payload).encode("utf-8")
        return (
            HTTPStatus.OK,
            [
                ("Content-Type", "application/json; charset=utf-8"),
                ("Cache-Control", "no-store"),
            ],
            body,
        )
    if clean_path == "/api/avatar-config":
        body = dumps(navtalk_public_config()).encode("utf-8")
        return (
            HTTPStatus.OK,
            [
                ("Content-Type", "application/json; charset=utf-8"),
                ("Cache-Control", "no-store"),
            ],
            body,
        )
    if clean_path == "/ws/call":
        return None
    return (
        HTTPStatus.NOT_FOUND,
        [("Content-Type", "text/plain; charset=utf-8")],
        b"not found",
    )


async def ws_handler(websocket, path: Optional[str] = None) -> None:
    """Accept browser WebSocket calls and bind each connection to a CallSession."""
    request_path = path or getattr(websocket, "path", "")
    if urlparse(request_path).path != "/ws/call":
        await websocket.close(code=1008, reason="invalid path")
        return
    session = CallSession(websocket)
    await session.run()


async def serve(host: str, port: int) -> None:
    """Start the combined static HTTP and WebSocket demo server."""
    async with websocket_serve(
        ws_handler,
        host,
        port,
        process_request=process_request,
        max_size=None,
        ping_interval=20,
        ping_timeout=20,
    ):
        LOGGER.info("StepFun voice-call proxy listening on http://%s:%s", host, port)
        print(f"StepFun voice-call proxy listening on http://{host}:{port}", flush=True)
        await asyncio.Future()


def parse_args(argv: List[str]) -> argparse.Namespace:
    """Parse host and port options for local proxy startup."""
    parser = argparse.ArgumentParser(description="StepFun ASR + LLM + TTS streaming voice-call proxy")
    parser.add_argument("--host", default=env_str("HOST", "127.0.0.1"))
    parser.add_argument("--port", default=env_int("PORT", 9876), type=int)
    return parser.parse_args(argv)


def install_signal_handlers(loop: asyncio.AbstractEventLoop) -> None:
    """Install stop handlers for Ctrl+C and termination signals when supported."""
    for name in ("SIGINT", "SIGTERM"):
        signal_value = getattr(signal, name, None)
        if signal_value is None:
            continue
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(signal_value, loop.stop)


def main(argv: List[str]) -> int:
    """Configure logging, create the event loop, and run the proxy server."""
    configure_logging()
    args = parse_args(argv)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    install_signal_handlers(loop)
    try:
        loop.run_until_complete(serve(args.host, args.port))
    except KeyboardInterrupt:
        return 0
    finally:
        loop.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
