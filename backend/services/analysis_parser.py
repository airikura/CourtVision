"""
Incremental JSON parser for streaming Gemini responses.
Uses a brace-depth state machine to yield complete Insight objects
as they appear in the token stream, without waiting for the full response.
"""
import json
from typing import AsyncIterator
from models.schemas import Insight


async def parse_stream(stream) -> AsyncIterator[Insight]:
    """
    Takes a Gemini streaming response and yields complete Insight objects
    as soon as each JSON object is fully received.
    """
    buffer = ""
    depth = 0
    in_string = False
    escape_next = False
    object_start = -1

    async for chunk in _iter_chunks(stream):
        for char in chunk:
            buffer += char

            if escape_next:
                escape_next = False
                continue

            if char == "\\" and in_string:
                escape_next = True
                continue

            if char == '"':
                in_string = not in_string
                continue

            if in_string:
                continue

            if char == "{":
                if depth == 0:
                    object_start = len(buffer) - 1
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0 and object_start >= 0:
                    raw_obj = buffer[object_start:]
                    try:
                        data = json.loads(raw_obj)
                        insight = Insight(**data)
                        yield insight
                    except (json.JSONDecodeError, Exception):
                        pass
                    object_start = -1


async def _iter_chunks(stream):
    """Adapt both sync iterables and async Gemini responses."""
    try:
        for chunk in stream:
            text = getattr(chunk, "text", None)
            if text:
                yield text
    except TypeError:
        async for chunk in stream:
            text = getattr(chunk, "text", None)
            if text:
                yield text
