"""
ANALYTICS API — Dashboard data
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta, date
from app.core.database import get_db, MoodLog, Message

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    seven_days_ago = str(date.today() - timedelta(days=7))

    mood_data = db.query(
        MoodLog.date, MoodLog.emotion,
        func.avg(MoodLog.score).label('avg_score'),
        func.count(MoodLog.id).label('count')
    ).filter(
        MoodLog.user_id == user_id, MoodLog.date >= seven_days_ago
    ).group_by(MoodLog.date, MoodLog.emotion).all()

    dominant = db.query(
        MoodLog.emotion, func.count(MoodLog.id).label('count')
    ).filter(
        MoodLog.user_id == user_id, MoodLog.date >= seven_days_ago
    ).group_by(MoodLog.emotion).order_by(func.count(MoodLog.id).desc()).first()

    total_messages = db.query(func.count(Message.id)).filter(
        Message.user_id == user_id, Message.role == 'user'
    ).scalar() or 0

    total_moods = db.query(func.count(MoodLog.id)).filter(
        MoodLog.user_id == user_id, MoodLog.date >= seven_days_ago
    ).scalar() or 1
    positive_moods = db.query(func.count(MoodLog.id)).filter(
        MoodLog.user_id == user_id, MoodLog.date >= seven_days_ago,
        MoodLog.emotion.in_(['joy', 'surprise', 'neutral'])
    ).scalar() or 0
    wellness_score = round((positive_moods / total_moods) * 100)

    return {
        "mood_history": [
            {"date": m.date, "emotion": m.emotion, "avg_score": round(m.avg_score, 1), "count": m.count}
            for m in mood_data
        ],
        "dominant_emotion": {
            "emotion": dominant.emotion if dominant else "neutral",
            "count": dominant.count if dominant else 0
        },
        "wellness_score": wellness_score,
        "total_messages": total_messages,
    }


@router.get("/mood")
def get_mood_history(user_id: int, days: int = 7, db: Session = Depends(get_db)):
    since = str(date.today() - timedelta(days=days))
    data = db.query(MoodLog).filter(
        MoodLog.user_id == user_id, MoodLog.date >= since
    ).order_by(MoodLog.date.desc()).all()
    return [{"date": m.date, "emotion": m.emotion, "score": m.score, "note": m.note} for m in data]
