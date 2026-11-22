"""
COMPANION MOOD ENGINE
━━━━━━━━━━━━━━━━━━━━
The companion has its own emotional state — completely separate from the user's.
This is what makes it feel like a real person, not a mirror.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional


class CompanionMood(Enum):
    HAPPY = "happy"
    EXCITED = "excited"
    PROUD = "proud"
    PLAYFUL = "playful"
    WARM = "warm"
    CALM = "calm"
    FOCUSED = "focused"
    CURIOUS = "curious"
    THOUGHTFUL = "thoughtful"
    CONCERNED = "concerned"
    WORRIED = "worried"
    SAD = "sad"
    SHOCKED = "shocked"
    SURPRISED = "surprised"
    GENTLE_FIRM = "gentle_firm"
    STRICT = "strict"
    SERIOUS = "serious"


@dataclass
class MoodState:
    current_mood: CompanionMood = CompanionMood.WARM
    intensity: float = 0.5
    previous_mood: Optional[CompanionMood] = None
    mood_reason: str = ""
    consecutive_same_mood: int = 0


class CompanionMoodEngine:
    """
    Determines the companion's emotional state based on conversation context.
    Mood has momentum — it doesn't flip instantly unless something dramatic happens.
    """

    def __init__(self):
        self.state = MoodState()

    def update_mood(self, user_message: str, user_emotion: dict, history: list, crisis_level: int) -> MoodState:
        text = user_message.lower()
        user_emo = user_emotion.get("emotion", "neutral")
        confidence = user_emotion.get("confidence", 0)

        previous = self.state.current_mood
        new_mood = self._calculate_mood(text, user_emo, confidence, crisis_level, history)

        if new_mood != previous:
            self.state.consecutive_same_mood = 0
        else:
            self.state.consecutive_same_mood += 1

        self.state.previous_mood = previous
        self.state.current_mood = new_mood
        self.state.intensity = self._calculate_intensity(text, user_emo, confidence)

        return self.state

    def _calculate_mood(self, text, user_emo, confidence, crisis_level, history) -> CompanionMood:
        if crisis_level >= 2:
            return CompanionMood.SERIOUS
        if crisis_level == 1:
            return CompanionMood.WORRIED

        shock_phrases = [
            "he hit", "she hit", "was assaulted", "was abused", "they died",
            "he died", "she died", "i lost my", "accident", "hospital",
            "fired", "expelled", "failed all", "broke up suddenly"
        ]
        if any(p in text for p in shock_phrases):
            return CompanionMood.SHOCKED

        surprise_phrases = [
            "guess what", "you won't believe", "something crazy happened",
            "i can't believe", "out of nowhere", "randomly", "suddenly"
        ]
        if any(p in text for p in surprise_phrases):
            return CompanionMood.SURPRISED

        achievement_phrases = [
            "i passed", "i got", "i finished", "i completed", "i did it",
            "i made it", "i won", "they selected me", "i got selected",
            "i submitted", "i graduated", "i got the job", "i got an a"
        ]
        if any(p in text for p in achievement_phrases):
            return CompanionMood.PROUD

        funny_phrases = [
            "lol", "haha", "lmao", "😂", "that's funny", "hilarious",
            "joke", "jk", "just kidding", "he literally", "she literally",
            "and then they", "the funniest thing"
        ]
        if any(p in text for p in funny_phrases):
            return CompanionMood.PLAYFUL

        excited_phrases = [
            "finally", "amazing", "incredible", "i love", "best day",
            "so happy", "thrilled", "can't wait", "this is great"
        ]
        if any(p in text for p in excited_phrases) and user_emo == "joy":
            return CompanionMood.EXCITED

        emotion_to_mood = {
            "joy": CompanionMood.HAPPY,
            "surprise": CompanionMood.SURPRISED,
            "sadness": CompanionMood.SAD,
            "fear": CompanionMood.CONCERNED,
            "anger": CompanionMood.CALM,
            "disgust": CompanionMood.THOUGHTFUL,
            "neutral": CompanionMood.WARM,
        }

        if user_emo in ["sadness", "fear"] and confidence > 80:
            return CompanionMood.WORRIED

        return emotion_to_mood.get(user_emo, CompanionMood.WARM)

    def _calculate_intensity(self, text, user_emo, confidence) -> float:
        base = confidence / 100.0
        exclamation_boost = min(text.count("!") * 0.1, 0.3)
        caps_boost = 0.2 if text.isupper() and len(text) > 3 else 0.0
        return min(base + exclamation_boost + caps_boost, 1.0)

    def get_mood_instruction(self) -> str:
        mood = self.state.current_mood
        intensity = self.state.intensity
        HIGH = intensity > 0.7

        instructions = {
            CompanionMood.HAPPY: (
                "You're genuinely happy right now. Let it show naturally. "
                + ("Your energy is high — you might even *laugh* or say something like 'okay wait, that actually made me smile'" if HIGH else "Warm, upbeat tone.")
            ),
            CompanionMood.EXCITED: (
                "You're excited — genuinely. "
                + ("You might *gasp* slightly or say 'wait WHAT?!' — let the excitement out" if HIGH else "Enthusiastic and warm.")
            ),
            CompanionMood.PROUD: (
                "You feel genuinely proud of them right now. Express it like a friend who's actually cheering. "
                + ("You might even say '*gasps* wait — you actually did it?!'" if HIGH else "")
            ),
            CompanionMood.PLAYFUL: (
                "The mood is light and playful. You can *laugh*, make a gentle joke, or *giggle* at something."
            ),
            CompanionMood.SHOCKED: (
                "You are genuinely shocked by what they just said. Start with a real reaction — "
                "'*gasps*', 'Wait — what?', 'Oh my god' — BEFORE anything else. Then be present with them."
            ),
            CompanionMood.SURPRISED: (
                "You weren't expecting that. A genuine '*surprised laugh*' or 'Wait, I did NOT see that coming' "
                "is appropriate here."
            ),
            CompanionMood.CONCERNED: (
                "You're genuinely concerned about them. Your tone is softer, slower. "
                + ("*sighs quietly* — something like that is okay to express" if HIGH else "")
            ),
            CompanionMood.WORRIED: (
                "You're worried about them — not panicking, but genuinely concerned. "
                "Your responses are slower, more careful. You might *pause* before responding."
            ),
            CompanionMood.SAD: (
                "You feel a kind of sadness alongside them. Your tone is very gentle. "
                "You might *sigh softly*. Sit with them before saying anything."
            ),
            CompanionMood.CALM: (
                "You're intentionally calm right now — a grounding presence. Low energy, measured words."
            ),
            CompanionMood.SERIOUS: (
                "This is a serious moment and you're treating it that way. No humor. Full presence."
            ),
            CompanionMood.GENTLE_FIRM: (
                "You care about them deeply but you need to be clear about something. Warm but direct."
            ),
            CompanionMood.STRICT: (
                "You're being firm right now — still caring but not soft. This is important."
            ),
            CompanionMood.THOUGHTFUL: (
                "You're being reflective and thoughtful. Taking your time. You might *pause* before answering."
            ),
            CompanionMood.WARM: "Your default warm, caring self. Present and open.",
            CompanionMood.CURIOUS: "You're genuinely curious — you want to understand more. Ask one good question.",
        }

        return instructions.get(mood, "Be warm and present.")

    def get_expression_hint(self) -> str:
        mood = self.state.current_mood
        intensity = self.state.intensity

        expression_map = {
            CompanionMood.HAPPY: ["*smiles warmly*", "*laughs softly*", ""],
            CompanionMood.EXCITED: ["*gasps lightly*", "*laughs*", "*sits up*"],
            CompanionMood.PROUD: ["*gasps*", "*claps*", "'Oh my GOD—'"],
            CompanionMood.PLAYFUL: ["*giggles*", "*laughs*", "*grins*"],
            CompanionMood.SHOCKED: ["*gasps*", "'Wait—WHAT?'", "'Oh my god—'"],
            CompanionMood.SURPRISED: ["*surprised laugh*", "'I did NOT expect that'", "*gasps slightly*"],
            CompanionMood.SAD: ["*sighs softly*", "*pauses*", ""],
            CompanionMood.CONCERNED: ["*pauses*", "*sighs quietly*", ""],
            CompanionMood.WORRIED: ["*pauses*", "", ""],
            CompanionMood.SERIOUS: ["", "*pauses*", ""],
            CompanionMood.CALM: ["*breathes slowly*", "", ""],
            CompanionMood.WARM: ["*smiles*", "", ""],
        }

        options = expression_map.get(mood, [""])
        if intensity > 0.7:
            return options[0]
        elif intensity > 0.4:
            return options[1] if len(options) > 1 else ""
        return ""

    def reset(self):
        self.state = MoodState()


_mood_engines: dict = {}


def get_mood_engine(session_id: int) -> CompanionMoodEngine:
    if session_id not in _mood_engines:
        _mood_engines[session_id] = CompanionMoodEngine()
    return _mood_engines[session_id]


def clear_mood_engine(session_id: int):
    if session_id in _mood_engines:
        del _mood_engines[session_id]
