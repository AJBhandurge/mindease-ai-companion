"""
EMOTION DETECTOR
Combines HuggingFace DistilRoBERTa emotion classification with VADER sentiment.
"""

class EmotionDetector:
    def __init__(self):
        print("Loading emotion detection model...")
        try:
            from transformers import pipeline
            self.classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=None,
            )
        except Exception as e:
            print(f"Could not load HF emotion model, falling back to keyword mode: {e}")
            self.classifier = None

        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            self.vader = SentimentIntensityAnalyzer()
        except Exception:
            self.vader = None

        self.crisis_keywords = [
            'suicide', 'suicidal', 'kill myself', 'want to die',
            'end my life', 'hurt myself', 'self harm', 'no reason to live'
        ]
        self.risk_keywords = [
            'hopeless', 'worthless', "can't go on", 'give up',
            'nobody cares', 'better off dead', 'no point'
        ]
        print("Emotion detector ready.")

    def detect(self, text: str) -> dict:
        if not text or len(text.strip()) < 2:
            return self._neutral()

        if self.classifier:
            results = self.classifier([text[:512]])[0]
            results_sorted = sorted(results, key=lambda x: x['score'], reverse=True)
            top = results_sorted[0]
            emotion = top['label'].lower()
            confidence = round(top['score'] * 100, 2)
            all_emotions = {r['label'].lower(): round(r['score']*100, 2) for r in results_sorted}
        else:
            emotion, confidence, all_emotions = self._keyword_fallback(text)

        if self.vader:
            vader_score = self.vader.polarity_scores(text)['compound']
        else:
            vader_score = 0.0
        sentiment = 'positive' if vader_score >= 0.05 else ('negative' if vader_score <= -0.05 else 'neutral')

        return {
            'emotion': emotion,
            'confidence': confidence,
            'sentiment': sentiment,
            'vader_score': vader_score,
            'all_emotions': all_emotions,
            'category': 'positive' if sentiment == 'positive' else 'negative' if sentiment == 'negative' else 'neutral'
        }

    def get_crisis_level(self, text: str, emotion_result: dict) -> int:
        text_lower = text.lower()
        if any(kw in text_lower for kw in self.crisis_keywords):
            return 2
        if any(kw in text_lower for kw in self.risk_keywords):
            return 1
        if emotion_result['emotion'] in ['sadness', 'fear'] and emotion_result['confidence'] > 85:
            return 1
        return 0

    def _keyword_fallback(self, text: str):
        text_lower = text.lower()
        keyword_map = {
            'joy': ['happy', 'great', 'amazing', 'good', 'love', 'excited', 'wonderful'],
            'sadness': ['sad', 'down', 'depressed', 'crying', 'unhappy', 'hurt'],
            'fear': ['anxious', 'scared', 'worried', 'nervous', 'afraid', 'panic'],
            'anger': ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
        }
        for emo, words in keyword_map.items():
            if any(w in text_lower for w in words):
                return emo, 65.0, {emo: 65.0}
        return 'neutral', 50.0, {'neutral': 50.0}

    def _neutral(self):
        return {
            'emotion': 'neutral', 'confidence': 100.0, 'sentiment': 'neutral',
            'vader_score': 0.0, 'all_emotions': {}, 'category': 'neutral'
        }


_detector = None


def get_detector() -> EmotionDetector:
    global _detector
    if _detector is None:
        _detector = EmotionDetector()
    return _detector
