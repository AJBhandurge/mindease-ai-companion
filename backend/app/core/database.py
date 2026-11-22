"""
DATABASE SCHEMA — SQLAlchemy models
"""
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text,
    DateTime, Boolean, ForeignKey, JSON, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)

    display_name = Column(String(100), nullable=True)
    avatar = Column(String(50), default="default")
    companion_id = Column(String(20), default="maya")

    onboarding_complete = Column(Boolean, default=False)
    onboarding_data = Column(JSON, default={})

    tier = Column(String(20), default="free")
    messages_today = Column(Integer, default=0)
    messages_reset_date = Column(String(20), nullable=True)

    data_consent = Column(Boolean, default=False)
    consent_date = Column(DateTime, nullable=True)
    account_deleted = Column(Boolean, default=False)
    deletion_date = Column(DateTime, nullable=True)

    preferences = Column(JSON, default={})
    push_token = Column(String(255), nullable=True)
    notification_prefs = Column(JSON, default={
        "daily_checkin": True, "checkin_time": "09:00",
        "weekly_report": True, "milestone_alerts": True,
    })

    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    sessions = relationship("Session", back_populates="user")
    mood_logs = relationship("MoodLog", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    companion_id = Column(String(20), default="maya")
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    message_count = Column(Integer, default=0)
    dominant_emotion = Column(String(30), nullable=True)

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    emotion = Column(String(30), nullable=True)
    confidence = Column(Float, nullable=True)
    sentiment = Column(String(20), nullable=True)

    companion_mood = Column(String(30), nullable=True)
    lead_expression = Column(String(30), nullable=True)

    crisis_level = Column(Integer, default=0)
    safety_filtered = Column(Boolean, default=False)

    is_voice_input = Column(Boolean, default=False)
    is_voice_output = Column(Boolean, default=False)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    session = relationship("Session", back_populates="messages")

    __table_args__ = (
        Index("ix_messages_user_session", "user_id", "session_id"),
    )


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    emotion = Column(String(30), nullable=False)
    score = Column(Float, nullable=False)
    note = Column(Text, nullable=True)
    source = Column(String(20), default="auto")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mood_logs")

    __table_args__ = (
        Index("ix_mood_user_date", "user_id", "date"),
    )


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    ai_reflection = Column(Text, nullable=True)
    emotion = Column(String(30), nullable=True)
    mood_score = Column(Integer, nullable=True)
    tags = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.utcnow)


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    emoji = Column(String(10), default="✅")
    category = Column(String(30), default="general")
    frequency = Column(String(20), default="daily")
    streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String(10), nullable=False)
    completed = Column(Boolean, default=False)

    __table_args__ = (
        Index("ix_habitlog_user_date", "user_id", "date"),
    )


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(String(10), nullable=True)
    progress = Column(Integer, default=0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    memory_type = Column(String(30), default="general")
    importance = Column(Float, default=0.5)
    chroma_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_memory_user", "user_id"),
    )


class WellnessReport(Base):
    __tablename__ = "wellness_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(String(10), nullable=False)
    report_text = Column(Text, nullable=True)
    wellness_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CrisisEvent(Base):
    __tablename__ = "crisis_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    level = Column(Integer, nullable=False)
    helpline_shown = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class PushNotification(Base):
    __tablename__ = "push_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    opened = Column(Boolean, default=False)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
