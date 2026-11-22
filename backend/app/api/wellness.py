"""
WELLNESS API — Journal, habits, goals
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.core.database import get_db, JournalEntry, Habit, HabitLog, Goal
from ai.llm_service import get_llm

router = APIRouter(prefix="/api/wellness", tags=["wellness"])


class JournalCreate(BaseModel):
    user_id: int
    content: str
    emotion: Optional[str] = None


class HabitCreate(BaseModel):
    user_id: int
    name: str
    frequency: str = "daily"


class HabitLogCreate(BaseModel):
    user_id: int
    habit_id: int
    completed: bool


class GoalCreate(BaseModel):
    user_id: int
    title: str
    description: Optional[str] = None
    target_date: Optional[str] = None


@router.post("/journal")
def create_journal(req: JournalCreate, db: Session = Depends(get_db)):
    llm = get_llm()
    reflection_prompt = f"""The user wrote this journal entry:
"{req.content}"

Write a warm, brief (2-3 sentence) empathetic reflection on what they shared.
Ask one gentle follow-up question. Be supportive, not clinical."""
    ai_reflection = llm.generate_simple(reflection_prompt)

    entry = JournalEntry(
        user_id=req.user_id, date=str(date.today()),
        content=req.content, ai_reflection=ai_reflection, emotion=req.emotion
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "ai_reflection": ai_reflection, "date": entry.date}


@router.get("/journal/{user_id}")
def get_journals(user_id: int, db: Session = Depends(get_db)):
    entries = db.query(JournalEntry).filter(
        JournalEntry.user_id == user_id
    ).order_by(JournalEntry.created_at.desc()).limit(30).all()
    return [
        {"id": e.id, "date": e.date, "content": e.content, "ai_reflection": e.ai_reflection, "emotion": e.emotion}
        for e in entries
    ]


@router.post("/habits")
def create_habit(req: HabitCreate, db: Session = Depends(get_db)):
    habit = Habit(user_id=req.user_id, name=req.name, frequency=req.frequency)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return {"id": habit.id, "name": habit.name}


@router.get("/habits/{user_id}")
def get_habits(user_id: int, db: Session = Depends(get_db)):
    habits = db.query(Habit).filter(Habit.user_id == user_id, Habit.is_active == True).all()
    today = str(date.today())
    result = []
    for h in habits:
        log = db.query(HabitLog).filter(HabitLog.habit_id == h.id, HabitLog.date == today).first()
        result.append({
            "id": h.id, "name": h.name, "emoji": h.emoji, "streak": h.streak,
            "completed_today": log.completed if log else False
        })
    return result


@router.post("/habits/log")
def log_habit(req: HabitLogCreate, db: Session = Depends(get_db)):
    today = str(date.today())
    existing = db.query(HabitLog).filter(
        HabitLog.habit_id == req.habit_id, HabitLog.date == today
    ).first()
    if existing:
        existing.completed = req.completed
    else:
        log = HabitLog(habit_id=req.habit_id, user_id=req.user_id, date=today, completed=req.completed)
        db.add(log)

    habit = db.query(Habit).filter(Habit.id == req.habit_id).first()
    if habit and req.completed:
        habit.streak += 1
        habit.best_streak = max(habit.best_streak, habit.streak)

    db.commit()
    return {"success": True}


@router.post("/goals")
def create_goal(req: GoalCreate, db: Session = Depends(get_db)):
    goal = Goal(user_id=req.user_id, title=req.title, description=req.description, target_date=req.target_date)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"id": goal.id, "title": goal.title}


@router.get("/goals/{user_id}")
def get_goals(user_id: int, db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "active").all()
    return [{"id": g.id, "title": g.title, "description": g.description, "progress": g.progress} for g in goals]
