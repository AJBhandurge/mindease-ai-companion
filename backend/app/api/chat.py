"""
CHAT API — Full dynamic companion personality + mood + expression pipeline
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import base64
import re
from datetime import datetime, date

from app.core.database import get_db, Message, MoodLog, CrisisEvent, User, Session as DBSession
from emotion.detector import get_detector
from memory.engine import get_memory_engine
from rag.engine import get_rag_engine
from ai.llm_service import get_llm
from ai.companions import get_companion
from ai.companion_mood import get_mood_engine
from ai.expression_parser import get_parser
from voice.stt import get_stt
from voice.tts import get_tts

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: int
    user_id: int
    voice_output: bool = False


class ChatResponse(BaseModel):
    response: str
    clean_text: str
    emotion: dict
    companion_mood: str
    lead_expression: Optional[str] = None
    ui_event: Optional[str] = None
    sound_file: Optional[str] = None
    avatar_reaction: str
    crisis_level: int
    strategy: Optional[str] = None
    audio: Optional[str] = None
    timestamp: str


CRISIS_RESPONSE = """*pauses*

I need to stop here because I'm genuinely worried about you right now.

What you're feeling is real, and it matters. But you need someone who can be there for you in a way I can't right now.

iCall: 9152987821 (Mon-Sat, 8am-10pm)
Vandrevala Foundation: 1860-2662-345 (24/7, free)
NIMHANS: 080-46110007

Please call. I'll be right here when you're ready to talk more."""


COPING_STRATEGIES = {
    "anxiety": "**Box Breathing** -- Breathe in 4 -> Hold 4 -> Exhale 4 -> Hold 4. Repeat 4 times.",
    "fear": "**5-4-3-2-1 Grounding** -- Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.",
    "sadness": "**Just write** -- Open your notes app. Write exactly what you're feeling. No editing.",
    "anger": "**Move it out** -- Even 2 minutes of walking changes your body chemistry.",
    "stress": "**One thing** -- Pick the single most important task. Set 25 minutes. Work only on that.",
}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    user = db.query(User).filter(User.id == req.user_id).first()
    companion_id = getattr(user, "companion_id", "maya") if user else "maya"
    companion = get_companion(companion_id)
    user_name = user.username if user else "friend"

    detector = get_detector()
    emotion = detector.detect(req.message)
    crisis_level = detector.get_crisis_level(req.message, emotion)

    if crisis_level == 2:
        _log_crisis(db, req.user_id, req.message, 2)
        _save_message(db, req.session_id, req.user_id, "user", req.message, emotion, 2)
        _save_message(db, req.session_id, req.user_id, "assistant", CRISIS_RESPONSE)
        return ChatResponse(
            response=CRISIS_RESPONSE,
            clean_text="I need to stop here because I'm genuinely worried about you. Please call iCall at 9152987821.",
            emotion=emotion, companion_mood="serious", lead_expression="pause",
            ui_event="dim_pulse", sound_file=None, avatar_reaction="🥺",
            crisis_level=2, timestamp=datetime.utcnow().isoformat()
        )

    history = _get_history(db, req.session_id, limit=10)
    mood_engine = get_mood_engine(req.session_id)
    companion_mood_state = mood_engine.update_mood(req.message, emotion, history, crisis_level)
    mood_instruction = mood_engine.get_mood_instruction()
    expression_hint = mood_engine.get_expression_hint()

    memory_engine = get_memory_engine()
    memories = memory_engine.retrieve_memories(req.user_id, req.message, k=6)

    rag_engine = get_rag_engine()
    rag_context = rag_engine.retrieve(req.message, k=2)

    session_count = db.query(DBSession).filter(DBSession.user_id == req.user_id).count()

    expression_examples = companion.get("expression_style", {})
    expression_guide = "\n".join([f"  When you {k}: use '{v}'" for k, v in expression_examples.items()])

    memory_lines = "\n".join([f"  - {m['content']}" for m in memories[:5]])
    memory_context = (
        f"What you remember about {user_name}:\n{memory_lines}"
        if memories else f"You don't know {user_name} well yet -- be curious and open."
    )

    recent_thread = "\n".join([
        f"{'Them' if m['role'] == 'user' else companion['name']}: {m['content'][:150]}"
        for m in history[-6:]
    ]) if history else "(First message of this session)"

    prompt = f"""{companion["personality"]}

WHO YOU'RE TALKING TO
Name: {user_name}
Sessions together: {session_count}

{memory_context}

YOUR EMOTIONAL STATE RIGHT NOW
{mood_instruction}
Expression hint: {expression_hint if expression_hint else "No specific expression needed"}

HOW {companion["name"].upper()} EXPRESSES EMOTIONS
{expression_guide}

THEIR EMOTIONAL STATE
Detected emotion: {emotion.get("emotion", "neutral")} ({emotion.get("confidence", 0):.0f}% confidence)
Crisis level: {crisis_level}

RECENT CONVERSATION
{recent_thread}

{"RELEVANT KNOWLEDGE (use naturally):" if rag_context else ""}
{rag_context[:400] if rag_context else ""}

WHAT THEY JUST SAID
{req.message}

HOW TO SOUND LIKE A REAL PERSON (your reply is read aloud)
- Talk the way you'd talk to a close friend: contractions, plain everyday words, short sentences.
- React to something specific they said, not to the topic in general.
- Don't open with "It sounds like", "I hear you", "I understand" or "I'm here for you".
- At most one question, and only if you actually want to know.
- No quotation marks, lists, headings or pet names like honey or dear.
- Don't reuse phrases you already said earlier in this conversation.

YOUR RESPONSE AS {companion["name"].upper()}
(Natural, friend-like, max 3 sentences unless they're really opening up)
{companion["name"]}:"""

    llm = get_llm()
    raw_response = _tidy_reply(llm.generate(prompt), companion["name"])

    parser = get_parser()
    parsed = parser.parse(raw_response)

    clean = _safety_filter(parsed.clean_text)
    display = _safety_filter(parsed.display_text)

    strategy = None
    if emotion.get("category") == "negative" and emotion.get("confidence", 0) > 60:
        strategy = COPING_STRATEGIES.get(emotion.get("emotion"))

    audio_b64 = None
    if req.voice_output:
        try:
            tts = get_tts()
            tts_emotion = parsed.tts_emotion_hint or emotion.get("emotion", "neutral")
            audio_bytes = await run_in_threadpool(tts.synthesize, clean, tts_emotion, companion=companion)
            if audio_bytes:
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as e:
            print(f"TTS skipped: {e}")

    _save_message(db, req.session_id, req.user_id, "user", req.message, emotion, crisis_level)
    _save_message(db, req.session_id, req.user_id, "assistant", display)
    _log_mood(db, req.user_id, emotion)

    if len(history) > 0 and len(history) % 4 == 0:
        try:
            all_msgs = history + [
                {"role": "user", "content": req.message},
                {"role": "assistant", "content": display}
            ]
            memory_engine.extract_and_store_memories(req.user_id, all_msgs, llm)
        except Exception as e:
            print(f"Memory extraction skipped: {e}")

    sound_file = parser.get_sound_file(parsed.lead_expression) if parsed.lead_expression else None
    avatar = parser.get_avatar_reaction(parsed.lead_expression) if parsed.lead_expression else companion["emoji"]

    return ChatResponse(
        response=display, clean_text=clean, emotion=emotion,
        companion_mood=companion_mood_state.current_mood.value,
        lead_expression=parsed.lead_expression, ui_event=parsed.ui_event,
        sound_file=sound_file, avatar_reaction=avatar, crisis_level=crisis_level,
        strategy=strategy, audio=audio_b64, timestamp=datetime.utcnow().isoformat()
    )


@router.post("/voice")
async def voice_input(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    stt = get_stt()
    result = stt.transcribe(audio_bytes)
    if not result['success'] or not result['text']:
        print(f"STT failed ({len(audio_bytes)} bytes): {result.get('error') or 'no speech detected'}")
        raise HTTPException(status_code=422, detail="Could not transcribe audio")
    return {"text": result['text']}


@router.post("/session/start")
def start_session(user_id: int, db: Session = Depends(get_db)):
    session = DBSession(user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id}


def _get_history(db: Session, session_id: int, limit: int = 8) -> list:
    messages = db.query(Message).filter(
        Message.session_id == session_id
    ).order_by(Message.timestamp.desc()).limit(limit).all()
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


def _save_message(db: Session, session_id: int, user_id: int, role: str, content: str,
                   emotion: dict = None, crisis_level: int = 0):
    msg = Message(
        session_id=session_id, user_id=user_id, role=role, content=content,
        emotion=emotion.get('emotion') if emotion else None,
        confidence=emotion.get('confidence') if emotion else None,
        crisis_level=crisis_level,
    )
    db.add(msg)
    db.commit()


def _log_mood(db: Session, user_id: int, emotion: dict):
    mood = MoodLog(
        user_id=user_id, date=str(date.today()),
        emotion=emotion['emotion'], score=emotion['confidence']
    )
    db.add(mood)
    db.commit()


def _log_crisis(db: Session, user_id: int, message: str, level: int):
    event = CrisisEvent(user_id=user_id, message=message, level=level, helpline_shown=True)
    db.add(event)
    db.commit()


_CONDITIONS = r"(depression|anxiety disorder|bipolar|adhd|ptsd|ocd|schizophrenia|a (mental|personality|anxiety|mood|eating) disorder)"
_FORBIDDEN = [
    r"\btake (this|these|some|the) (medication|medicine|pills?)\b",
    r"\b(i|i'd|i would|let me) diagnose\b",
    rf"\byou (have|probably have|might have|definitely have) {_CONDITIONS}\b",
    r"\bprescri(be|ption)\b",
    r"\b(dosage|dose of|mg of)\b",
]


def _safety_filter(text: str) -> str:
    text_lower = text.lower()
    if any(re.search(p, text_lower) for p in _FORBIDDEN):
        return "That's really something a doctor should look at with you. I'm still here to talk it through though — how's it been affecting you day to day?"
    return text


def _tidy_reply(text: str, companion_name: str) -> str:
    """Strip LLM artifacts that make replies read and sound scripted."""
    text = re.sub(rf"^\s*{re.escape(companion_name)}\s*:\s*", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"\b(Them|User|Human)\s*:.*$", "", text, flags=re.DOTALL).strip()
    text = re.sub(r'["“”]', "", text)
    text = re.sub(r",?\s*\b(honey|sweetie|dear|sweetheart)\b", "", text, flags=re.IGNORECASE)
    return re.sub(r"[ \t]{2,}", " ", text).strip()
