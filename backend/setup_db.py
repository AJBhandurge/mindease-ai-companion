#!/usr/bin/env python
"""
One-time database initialization. Run: python setup_db.py
"""
from app.core.database import create_tables, SessionLocal, User, Habit
from app.core.security import hash_password
from datetime import datetime


def main():
    print("=" * 40)
    print(" MindEase Database Setup")
    print("=" * 40)

    create_tables()
    print("All tables created")

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "demo").first()
        if not existing:
            demo_user = User(
                username="demo",
                password_hash=hash_password("demo123"),
                display_name="Demo User",
                companion_id="maya",
                onboarding_complete=True,
                data_consent=True,
                consent_date=datetime.utcnow(),
                tier="premium",
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            default_habits = [
                Habit(user_id=demo_user.id, name="Morning water", emoji="water", category="health"),
                Habit(user_id=demo_user.id, name="10 min walk", emoji="walk", category="exercise"),
                Habit(user_id=demo_user.id, name="Journaling", emoji="journal", category="mindfulness"),
                Habit(user_id=demo_user.id, name="8 hrs sleep", emoji="sleep", category="sleep"),
            ]
            for habit in default_habits:
                db.add(habit)
            db.commit()

            print(f"Demo user created (username: demo, password: demo123)")
        else:
            print("Demo user already exists")
    finally:
        db.close()

    print("\nDatabase setup complete!")
    print("\nNext steps:")
    print("  1. cd rag && python ingest_all.py")
    print("  2. uvicorn app.main:app --reload")
    print("\nDemo login: username=demo, password=demo123")


if __name__ == "__main__":
    main()
