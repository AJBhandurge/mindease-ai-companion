"""
SPEECH-TO-TEXT — Faster-Whisper
"""
import tempfile
import os


class SpeechToText:
    def __init__(self, model_size="small", device="cpu"):
        print("Loading Whisper STT model...")
        from faster_whisper import WhisperModel
        compute_type = "float16" if device == "cuda" else "int8"
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("Whisper loaded.")

    def transcribe(self, audio_bytes: bytes) -> dict:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            segments, info = self.model.transcribe(
                tmp_path,
                beam_size=5,
                language="en",
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            text = " ".join([seg.text for seg in segments]).strip()
            return {"success": True, "text": text, "language": info.language}
        except Exception as e:
            return {"success": False, "text": "", "error": str(e)}
        finally:
            os.unlink(tmp_path)


_stt = None


def get_stt() -> SpeechToText:
    global _stt
    if _stt is None:
        _stt = SpeechToText()
    return _stt
