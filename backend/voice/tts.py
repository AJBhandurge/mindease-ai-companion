"""
TEXT-TO-SPEECH — Coqui XTTS v2 (human-like voice cloning), falling back to
Microsoft Edge neural voices when Coqui isn't installed (it needs Python <3.12).
"""
import asyncio
import io
import os
import re
import tempfile
import wave

EMOTION_SPEED = {
    'sadness': 0.85, 'fear': 0.88, 'anxiety': 0.90, 'anger': 0.92,
    'joy': 1.05, 'excited': 1.08, 'shocked': 1.0, 'surprised': 1.02,
    'concerned': 0.90, 'sad': 0.85, 'neutral': 1.0,
}


# Small pitch shifts read as mood; large ones sound synthetic
EMOTION_PITCH_HZ = {
    'sadness': -4, 'sad': -4, 'fear': -2, 'anxiety': -2, 'concerned': -2,
    'joy': 3, 'excited': 4, 'surprised': 3,
}


def _clean_for_tts(text: str) -> str:
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'_?\*(.*?)\*_?', '', text)          # *sighs softly* is shown, not read
    text = re.sub(r'#+\s', '', text)
    text = re.sub(r'["“”_]', '', text)
    text = re.sub(r'[\U0001F000-\U0001FAFF☀-➿️]', '', text)  # emoji
    text = re.sub(r'\s*[—–]\s*', ', ', text)            # dashes become a natural breath
    text = re.sub(r'\.{3,}|…', '... ', text)
    text = re.sub(r'\n+', '. ', text)
    text = re.sub(r'\s+([,.!?])', r'\1', text)
    text = re.sub(r'^[,.\s]+', '', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()[:600]


def _speed_for(emotion: str, companion: dict = None) -> float:
    base = (companion or {}).get("tts_speed", 1.0)
    # Damp the emotion effect and clamp: very slow or fast speech sounds robotic
    speed = base * (1 + (EMOTION_SPEED.get(emotion, 1.0) - 1) * 0.5)
    return max(0.9, min(1.1, speed))


class TextToSpeech:
    def __init__(self, reference_audio: str = "voice/maya_reference.wav", gpu: bool = True):
        print("Loading XTTS v2 TTS model (first load takes ~30 seconds)...")
        from TTS.api import TTS
        self.tts = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            gpu=gpu
        )
        self.reference_audio = reference_audio if os.path.exists(reference_audio) else None
        if not self.reference_audio:
            print("No reference audio found — using default voice.")
            print("TIP: record a 6-10 second clip and save as voice/<companion>_reference.wav")
        print("XTTS v2 loaded.")

    def synthesize(self, text: str, emotion: str = "neutral", speed: float = None, companion: dict = None) -> bytes:
        use_speed = speed if speed is not None else _speed_for(emotion, companion)

        clean_text = _clean_for_tts(text)
        if not clean_text:
            return b""

        reference = (companion or {}).get("voice_ref")
        if not reference or not os.path.exists(reference):
            reference = self.reference_audio

        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name

            if reference:
                self.tts.tts_to_file(
                    text=clean_text, speaker_wav=reference,
                    language="en", file_path=tmp_path, speed=use_speed
                )
            else:
                self.tts.tts_to_file(
                    text=clean_text, language="en",
                    file_path=tmp_path, speed=use_speed
                )

            with open(tmp_path, "rb") as f:
                audio_bytes = f.read()
            os.unlink(tmp_path)
            return audio_bytes

        except Exception as e:
            print(f"TTS error: {e}")
            return b""


class EdgeTextToSpeech:
    """Natural Microsoft neural voices via edge-tts. Needs an internet connection."""

    DEFAULT_VOICE = "en-US-AvaMultilingualNeural"

    def __init__(self):
        import edge_tts
        self._edge_tts = edge_tts
        print("Edge TTS ready.")

    def synthesize(self, text: str, emotion: str = "neutral", speed: float = None, companion: dict = None) -> bytes:
        use_speed = speed if speed is not None else _speed_for(emotion, companion)
        voice = (companion or {}).get("edge_voice", self.DEFAULT_VOICE)

        clean_text = _clean_for_tts(text)
        if not clean_text:
            return b""

        rate = f"{round((use_speed - 1) * 100):+d}%"
        pitch = f"{EMOTION_PITCH_HZ.get(emotion, 0):+d}Hz"
        try:
            mp3 = asyncio.run(self._stream(clean_text, voice, rate, pitch))
            return self._mp3_to_wav(mp3) if mp3 else b""
        except Exception as e:
            print(f"TTS error: {e}")
            return b""

    async def _stream(self, text: str, voice: str, rate: str, pitch: str) -> bytes:
        communicate = self._edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        audio = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        return bytes(audio)

    @staticmethod
    def _mp3_to_wav(mp3: bytes, rate: int = 24000) -> bytes:
        # The app saves replies as .wav, so hand it real WAV data
        import av
        resampler = av.AudioResampler(format="s16", layout="mono", rate=rate)
        pcm = bytearray()
        with av.open(io.BytesIO(mp3)) as container:
            for frame in container.decode(audio=0):
                for out in resampler.resample(frame):
                    pcm += out.to_ndarray().tobytes()
        for out in resampler.resample(None):
            pcm += out.to_ndarray().tobytes()

        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(bytes(pcm))
        return buf.getvalue()


_tts = None


def get_tts():
    global _tts
    if _tts is None:
        try:
            _tts = TextToSpeech()
        except ImportError:
            print("Coqui TTS not installed — falling back to Edge TTS.")
            _tts = EdgeTextToSpeech()
    return _tts
