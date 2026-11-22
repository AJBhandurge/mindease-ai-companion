"""
LLM SERVICE — Ollama Integration
"""
import requests

from app.core.config import settings

OLLAMA_BASE = settings.OLLAMA_BASE_URL
DEFAULT_MODEL = settings.DEFAULT_LLM_MODEL


class LLMService:
    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self.base_url = OLLAMA_BASE

    def generate(self, prompt: str) -> str:
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.8,
                        "top_p": 0.9,
                        "repeat_penalty": 1.15,
                        "num_predict": 300,
                        "stop": ["USER:", "HUMAN:", "Them:", "\n\n\n"]
                    }
                },
                timeout=90
            )
            result = response.json()
            text = result.get("response", "").strip()
            return text if text else "I'm here. Can you tell me a bit more?"
        except requests.exceptions.ConnectionError:
            return "*pauses* I'm having trouble connecting right now — but I'm still here. Can you try again in a moment?"
        except Exception as e:
            print(f"LLM generation error: {e}")
            return "I'm here for you. Can you tell me more about what's going on?"

    def generate_simple(self, prompt: str) -> str:
        return self.generate(prompt)


_llm = None


def get_llm() -> LLMService:
    global _llm
    if _llm is None:
        _llm = LLMService()
    return _llm
