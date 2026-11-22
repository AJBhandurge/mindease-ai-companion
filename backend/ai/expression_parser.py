"""
EXPRESSION PARSER
━━━━━━━━━━━━━━━━━
Extracts *action tokens* from LLM responses and converts them to:
1. Audio sound effects (laugh.mp3, gasp.mp3, etc.)
2. TTS prosody adjustments
3. UI animation triggers for the mobile app
"""

import re
from dataclasses import dataclass
from typing import Optional, List


@dataclass
class ParsedResponse:
    clean_text: str
    display_text: str
    expressions: List[str]
    lead_expression: Optional[str]
    tts_emotion_hint: str
    ui_event: Optional[str]


EXPRESSION_PATTERNS = {
    r'\*laughs?\*': "laugh",
    r'\*giggles?\*': "giggle",
    r'\*chuckles?\*': "chuckle",
    r'\*laughs softly\*': "laugh_soft",
    r'\*surprised laugh\*': "laugh_surprised",
    r'\*laughs warmly\*': "laugh_warm",
    r'\*gasps?\*': "gasp",
    r'\*gasps lightly\*': "gasp_light",
    r'\*gasps slightly\*': "gasp_light",
    r'\*gasps loudly\*': "gasp",
    r'\*shocked\*': "gasp",
    r'\*sighs?\*': "sigh",
    r'\*sighs softly\*': "sigh_soft",
    r'\*sighs quietly\*': "sigh_soft",
    r'\*sighs deeply\*': "sigh_deep",
    r'\*pauses?\*': "pause",
    r'\*thinks?\*': "pause",
    r'\*takes a breath\*': "breath",
    r'\*breathes slowly\*': "breath",
    r'\*smiles?\*': "smile",
    r'\*smiles warmly\*': "smile",
    r'\*grins?\*': "smile",
    r'\*sits up\*': "excited",
    r'\*claps?\*': "excited",
    r'\*nods?\*': "nod",
}

SOUND_EFFECTS = {
    "laugh": "sounds/laugh_natural.mp3",
    "laugh_soft": "sounds/laugh_soft.mp3",
    "laugh_warm": "sounds/laugh_warm.mp3",
    "laugh_surprised": "sounds/laugh_surprised.mp3",
    "giggle": "sounds/giggle.mp3",
    "chuckle": "sounds/chuckle.mp3",
    "gasp": "sounds/gasp.mp3",
    "gasp_light": "sounds/gasp_light.mp3",
    "sigh": "sounds/sigh.mp3",
    "sigh_soft": "sounds/sigh_soft.mp3",
    "sigh_deep": "sounds/sigh_deep.mp3",
    "pause": None,
    "breath": "sounds/breath.mp3",
    "smile": None,
    "excited": None,
    "nod": None,
}

TTS_EMOTION_HINTS = {
    "laugh": "joyful",
    "giggle": "playful",
    "gasp": "shocked",
    "gasp_light": "surprised",
    "sigh": "sad",
    "sigh_soft": "concerned",
    "breath": "calm",
    "pause": "thoughtful",
    "smile": "warm",
    "excited": "excited",
}

UI_ANIMATIONS = {
    "laugh": "bounce",
    "giggle": "wiggle",
    "gasp": "shake",
    "gasp_light": "pulse",
    "sigh": "fade_dim",
    "sigh_soft": "fade_dim",
    "smile": "glow",
    "excited": "bounce_fast",
    "pause": "dim_pulse",
}

AVATAR_REACTIONS = {
    "laugh": "😄",
    "giggle": "😊",
    "gasp": "😮",
    "gasp_light": "😯",
    "sigh": "😔",
    "sigh_soft": "🥺",
    "smile": "🙂",
    "excited": "🤩",
    "pause": "🤔",
    "breath": "😌",
}


class ExpressionParser:

    def parse(self, llm_response: str) -> ParsedResponse:
        expressions = []
        clean_text = llm_response
        display_text = llm_response

        for pattern, event in EXPRESSION_PATTERNS.items():
            matches = re.findall(pattern, llm_response, re.IGNORECASE)
            if matches:
                expressions.append(event)
            clean_text = re.sub(pattern, "", clean_text, flags=re.IGNORECASE)
            display_text = re.sub(pattern, f"_{matches[0]}_" if matches else "", display_text, flags=re.IGNORECASE)

        inline_patterns = [
            (r"\bwait[—-]\s*WHAT\?!", "gasp"),
            (r"\bOh my (god|gosh|goodness)[—!]", "gasp"),
            (r"\bhahahaha+\b", "laugh"),
            (r"\blmao\b", "laugh"),
            (r"\bhehe+\b", "giggle"),
            (r"\baww+\b", "smile"),
        ]
        for pattern, event in inline_patterns:
            if re.search(pattern, llm_response, re.IGNORECASE):
                if event not in expressions:
                    expressions.append(event)

        clean_text = re.sub(r"\s+", " ", clean_text).strip()
        clean_text = re.sub(r"^\s*[,\.]\s*", "", clean_text)

        lead_expression = expressions[0] if expressions else None
        tts_hint = TTS_EMOTION_HINTS.get(lead_expression, "neutral") if lead_expression else "neutral"
        ui_event = UI_ANIMATIONS.get(lead_expression) if lead_expression else None

        return ParsedResponse(
            clean_text=clean_text,
            display_text=display_text,
            expressions=expressions,
            lead_expression=lead_expression,
            tts_emotion_hint=tts_hint,
            ui_event=ui_event,
        )

    def get_sound_file(self, expression: str) -> Optional[str]:
        return SOUND_EFFECTS.get(expression)

    def get_avatar_reaction(self, expression: str) -> str:
        return AVATAR_REACTIONS.get(expression, "🌿")


_parser = None


def get_parser() -> ExpressionParser:
    global _parser
    if _parser is None:
        _parser = ExpressionParser()
    return _parser
