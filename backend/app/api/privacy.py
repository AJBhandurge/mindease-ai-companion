"""
PRIVACY API — Data export and deletion (GDPR-style)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import (
    get_db, User, Message, MoodLog, JournalEntry, Habit, HabitLog, Goal, Memory
)

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


@router.get("/export/{user_id}")
def export_user_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    messages = db.query(Message).filter(Message.user_id == user_id).all()
    mood_logs = db.query(MoodLog).filter(MoodLog.user_id == user_id).all()
    journals = db.query(JournalEntry).filter(JournalEntry.user_id == user_id).all()
    habits = db.query(Habit).filter(Habit.user_id == user_id).all()
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()
    memories = db.query(Memory).filter(Memory.user_id == user_id).all()

    return {
        "export_date": datetime.utcnow().isoformat(),
        "user": {
            "username": user.username, "created_at": str(user.created_at),
            "companion": user.companion_id,
        },
        "conversations": [
            {"role": m.role, "content": m.content, "emotion": m.emotion, "timestamp": str(m.timestamp)}
            for m in messages
        ],
        "mood_history": [
            {"date": m.date, "emotion": m.emotion, "score": m.score, "note": m.note} for m in mood_logs
        ],
        "journal_entries": [
            {"date": j.date, "content": j.content, "ai_reflection": j.ai_reflection} for j in journals
        ],
        "habits": [{"name": h.name, "streak": h.streak} for h in habits],
        "goals": [{"title": g.title, "progress": g.progress, "status": g.status} for g in goals],
        "memories_about_you": [m.content for m in memories],
    }


@router.delete("/delete/{user_id}")
def delete_user_data(user_id: int, confirm: bool = False, db: Session = Depends(get_db)):
    if not confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to permanently delete all data.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(Message).filter(Message.user_id == user_id).delete()
    db.query(MoodLog).filter(MoodLog.user_id == user_id).delete()
    db.query(JournalEntry).filter(JournalEntry.user_id == user_id).delete()
    db.query(HabitLog).filter(HabitLog.user_id == user_id).delete()
    db.query(Habit).filter(Habit.user_id == user_id).delete()
    db.query(Goal).filter(Goal.user_id == user_id).delete()
    db.query(Memory).filter(Memory.user_id == user_id).delete()

    user.account_deleted = True
    user.deletion_date = datetime.utcnow()
    user.username = f"deleted_{user_id}"
    user.email = None
    user.push_token = None

    db.commit()

    return {"success": True, "message": "All personal data has been permanently deleted."}
