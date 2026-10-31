import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from app.storage.db import storage

ACHIEVEMENTS_CONFIG = [
    {
        "id": "first_steps",
        "title": "First Steps",
        "description": "Complete your first diagnostic, quiz, or study session.",
        "category": "Milestone",
        "icon": "Footprints",
        "xp_reward": 20,
        "target": 1
    },
    {
        "id": "curious_mind",
        "title": "Curious Mind",
        "description": "Engage with the Socratic AI Tutor to explore a concept.",
        "category": "Tutor",
        "icon": "MessageSquare",
        "xp_reward": 15,
        "target": 1
    },
    {
        "id": "quiz_explorer",
        "title": "Quiz Explorer",
        "description": "Attempt 5 adaptive quiz questions.",
        "category": "Practice",
        "icon": "GraduationCap",
        "xp_reward": 25,
        "target": 5
    },
    {
        "id": "first_mastery",
        "title": "First Concept Mastered",
        "description": "Attain 80%+ mastery in any syllabus concept.",
        "category": "Mastery",
        "icon": "Award",
        "xp_reward": 35,
        "target": 1
    },
    {
        "id": "revision_champion",
        "title": "Revision Champion",
        "description": "Complete 3 spaced repetition review tasks.",
        "category": "Retention",
        "icon": "CalendarCheck",
        "xp_reward": 30,
        "target": 3
    },
    {
        "id": "streak_3",
        "title": "Getting Started",
        "description": "Maintain a 3-day continuous learning streak.",
        "category": "Consistency",
        "icon": "Flame",
        "xp_reward": 25,
        "target": 3
    },
    {
        "id": "streak_7",
        "title": "Consistency Champion",
        "description": "Maintain a 7-day continuous learning streak.",
        "category": "Consistency",
        "icon": "Zap",
        "xp_reward": 50,
        "target": 7
    },
    {
        "id": "concept_master",
        "title": "Concept Master",
        "description": "Attain 80%+ mastery across 5 or more syllabus concepts.",
        "category": "Mastery",
        "icon": "Crown",
        "xp_reward": 100,
        "target": 5
    }
]

XP_CONFIG = {
    "diagnostic": 30,
    "quiz": 15,
    "revision": 15,
    "tutor_chat": 10,
    "concept_mastery": 30,
    "challenge_completed": 20
}

MILESTONES_CONFIG = [
    {"days": 3, "label": "Getting Started", "icon": "Flame"},
    {"days": 7, "label": "Consistency Champion", "icon": "Zap"},
    {"days": 14, "label": "Dedicated Learner", "icon": "ShieldCheck"},
    {"days": 30, "label": "Learning Master", "icon": "Star"},
    {"days": 60, "label": "Unstoppable Learner", "icon": "Trophy"},
    {"days": 100, "label": "Legendary Learner", "icon": "Crown"}
]


class GamificationService:
    def record_activity(
        self,
        student_id: str,
        activity_type: str,
        qualifying: bool = True,
        learning_minutes: int = 5,
        details: Optional[Dict[str, Any]] = None,
        client_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a genuine learning activity, update streak, award XP,
        and evaluate unlocked achievements and challenge progress.
        """
        now = datetime.now(timezone.utc)
        today_date = client_date or now.strftime("%Y-%m-%d")

        log_id = f"act_{uuid.uuid4().hex[:12]}"
        details_str = json.dumps(details or {})

        with storage.get_connection() as conn:
            cursor = conn.cursor()

            # 1. Log activity
            cursor.execute("""
                INSERT INTO user_activity_logs (
                    id, student_id, activity_type, activity_date,
                    qualifying, learning_minutes, details_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log_id, student_id, activity_type, today_date,
                1 if qualifying else 0, learning_minutes, details_str, now.isoformat()
            ))

            # 2. Update Daily Streak if activity is qualifying
            streak_result = self._update_streak(cursor, student_id, today_date, qualifying)

            # 3. Award XP
            earned_xp = XP_CONFIG.get(activity_type, 10)
            xp_result = self._award_xp(cursor, student_id, earned_xp)

            # 4. Check & update challenges
            challenges_updated = self._update_challenges(cursor, student_id, activity_type, today_date)

            # 5. Check achievements
            unlocked_achievements = self._check_achievements(cursor, student_id, streak_result["current_streak"])

            conn.commit()

        return {
            "status": "success",
            "activity_id": log_id,
            "activity_type": activity_type,
            "xp_earned": earned_xp,
            "streak": streak_result,
            "gamification": xp_result,
            "unlocked_achievements": unlocked_achievements,
            "challenges_updated": challenges_updated
        }

    def _update_streak(self, cursor, student_id: str, today_date: str, qualifying: bool) -> Dict[str, Any]:
        """Update consecutive learning streak based on activity dates."""
        cursor.execute("SELECT * FROM user_streaks WHERE student_id = ?", (student_id,))
        streak_row = cursor.fetchone()

        now_iso = datetime.now(timezone.utc).isoformat()

        if not streak_row:
            current_streak = 1 if qualifying else 0
            longest_streak = current_streak
            total_active_days = 1 if qualifying else 0
            last_activity_date = today_date if qualifying else None

            cursor.execute("""
                INSERT INTO user_streaks (
                    student_id, current_streak, longest_streak,
                    last_activity_date, total_active_days, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (student_id, current_streak, longest_streak, last_activity_date, total_active_days, now_iso))

            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "total_active_days": total_active_days,
                "is_new_day": True
            }

        streak_dict = dict(streak_row)
        last_date_str = streak_dict.get("last_activity_date")
        current_streak = streak_dict.get("current_streak", 0)
        longest_streak = streak_dict.get("longest_streak", 0)
        total_active_days = streak_dict.get("total_active_days", 0)

        if not qualifying:
            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "total_active_days": total_active_days,
                "is_new_day": False
            }

        if last_date_str == today_date:
            # Already practiced today
            return {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "total_active_days": total_active_days,
                "is_new_day": False
            }

        # Calculate difference between today and last active day
        is_consecutive = False
        if last_date_str:
            try:
                last_dt = datetime.strptime(last_date_str, "%Y-%m-%d").date()
                today_dt = datetime.strptime(today_date, "%Y-%m-%d").date()
                diff = (today_dt - last_dt).days
                if diff == 1:
                    is_consecutive = True
                elif diff <= 0:
                    # Timezone shift or same day
                    is_consecutive = True
            except Exception:
                is_consecutive = False

        if is_consecutive:
            current_streak += 1
        else:
            current_streak = 1

        total_active_days += 1
        longest_streak = max(longest_streak, current_streak)

        cursor.execute("""
            UPDATE user_streaks
            SET current_streak = ?, longest_streak = ?, last_activity_date = ?,
                total_active_days = ?, updated_at = ?
            WHERE student_id = ?
        """, (current_streak, longest_streak, today_date, total_active_days, now_iso, student_id))

        return {
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "total_active_days": total_active_days,
            "is_new_day": True
        }

    def _award_xp(self, cursor, student_id: str, earned_xp: int) -> Dict[str, Any]:
        """Add earned XP and recalculate level."""
        cursor.execute("SELECT * FROM user_gamification WHERE student_id = ?", (student_id,))
        row = cursor.fetchone()
        now_iso = datetime.now(timezone.utc).isoformat()

        if not row:
            total_xp = earned_xp
            level = max(1, (total_xp // 100) + 1)
            cursor.execute("""
                INSERT INTO user_gamification (student_id, total_xp, level, updated_at)
                VALUES (?, ?, ?, ?)
            """, (student_id, total_xp, level, now_iso))
        else:
            total_xp = row["total_xp"] + earned_xp
            level = max(1, (total_xp // 100) + 1)
            cursor.execute("""
                UPDATE user_gamification
                SET total_xp = ?, level = ?, updated_at = ?
                WHERE student_id = ?
            """, (total_xp, level, now_iso, student_id))

        current_level_base = (level - 1) * 100
        next_level_target = level * 100
        progress_pct = min(100, int(((total_xp - current_level_base) / 100) * 100))

        return {
            "total_xp": total_xp,
            "level": level,
            "next_level_xp": next_level_target,
            "progress_percent": progress_pct
        }

    def _check_achievements(self, cursor, student_id: str, current_streak: int) -> List[Dict[str, Any]]:
        """Check and unlock achievements for the learner."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # Query stats
        cursor.execute("SELECT COUNT(*) FROM user_activity_logs WHERE student_id = ?", (student_id,))
        total_activities = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM user_activity_logs WHERE student_id = ? AND activity_type = 'quiz'", (student_id,))
        quiz_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM user_activity_logs WHERE student_id = ? AND activity_type = 'revision'", (student_id,))
        revision_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM user_activity_logs WHERE student_id = ? AND activity_type = 'tutor_chat'", (student_id,))
        tutor_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM concept_mastery WHERE student_id = ? AND mastery_percentage >= 80.0", (student_id,))
        mastered_count = cursor.fetchone()[0]

        # Fetch existing achievements
        cursor.execute("SELECT * FROM user_achievements WHERE student_id = ?", (student_id,))
        existing = {r["achievement_id"]: dict(r) for r in cursor.fetchall()}

        unlocked_now = []

        for ach in ACHIEVEMENTS_CONFIG:
            ach_id = ach["id"]
            target = ach["target"]
            curr_val = 0

            if ach_id == "first_steps":
                curr_val = total_activities
            elif ach_id == "curious_mind":
                curr_val = tutor_count
            elif ach_id == "quiz_explorer":
                curr_val = quiz_count
            elif ach_id == "first_mastery":
                curr_val = mastered_count
            elif ach_id == "revision_champion":
                curr_val = revision_count
            elif ach_id in ("streak_3", "streak_7"):
                curr_val = current_streak
            elif ach_id == "concept_master":
                curr_val = mastered_count

            is_unlocked = 1 if curr_val >= target else 0

            if ach_id not in existing:
                row_id = f"ach_{uuid.uuid4().hex[:10]}"
                unlocked_at = now_iso if is_unlocked else None
                cursor.execute("""
                    INSERT INTO user_achievements (
                        id, student_id, achievement_id, unlocked,
                        progress_current, progress_target, unlocked_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (row_id, student_id, ach_id, is_unlocked, curr_val, target, unlocked_at))

                if is_unlocked:
                    unlocked_now.append(ach)
                    self._create_notification(
                        cursor, student_id,
                        f"Achievement Unlocked: {ach['title']}!",
                        f"You earned +{ach['xp_reward']} XP: {ach['description']}",
                        "achievement", "dashboard"
                    )
            else:
                prev = existing[ach_id]
                if not prev["unlocked"] and is_unlocked:
                    cursor.execute("""
                        UPDATE user_achievements
                        SET unlocked = 1, progress_current = ?, unlocked_at = ?
                        WHERE id = ?
                    """, (curr_val, now_iso, prev["id"]))
                    unlocked_now.append(ach)
                    self._create_notification(
                        cursor, student_id,
                        f"Achievement Unlocked: {ach['title']}!",
                        f"You earned +{ach['xp_reward']} XP: {ach['description']}",
                        "achievement", "dashboard"
                    )
                else:
                    cursor.execute("""
                        UPDATE user_achievements
                        SET progress_current = ?
                        WHERE id = ?
                    """, (curr_val, prev["id"]))

        return unlocked_now

    def _update_challenges(self, cursor, student_id: str, activity_type: str, today_date: str) -> int:
        """Update daily and weekly challenge progress."""
        now = datetime.now(timezone.utc)
        week_key = f"{now.year}-W{now.strftime('%U')}"
        now_iso = now.isoformat()

        self._ensure_challenges_seeded(cursor, student_id, today_date, week_key)

        updated_count = 0

        # Map activity to challenge types
        if activity_type == "quiz":
            cursor.execute("""
                UPDATE user_challenges
                SET current_count = current_count + 1
                WHERE student_id = ? AND period_key = ? AND challenge_id = 'daily_quiz' AND completed = 0
            """, (student_id, today_date))
            updated_count += 1
        elif activity_type == "revision":
            cursor.execute("""
                UPDATE user_challenges
                SET current_count = current_count + 1
                WHERE student_id = ? AND period_key = ? AND challenge_id = 'daily_revision' AND completed = 0
            """, (student_id, today_date))
            updated_count += 1
        elif activity_type == "tutor_chat":
            cursor.execute("""
                UPDATE user_challenges
                SET current_count = current_count + 1
                WHERE student_id = ? AND period_key = ? AND challenge_id = 'daily_tutor' AND completed = 0
            """, (student_id, today_date))
            updated_count += 1

        # Check completions
        cursor.execute("""
            SELECT * FROM user_challenges
            WHERE student_id = ? AND completed = 0 AND current_count >= target_count
        """, (student_id,))
        for ch in cursor.fetchall():
            cursor.execute("""
                UPDATE user_challenges
                SET completed = 1, completed_at = ?
                WHERE id = ?
            """, (now_iso, ch["id"]))
            # Award challenge bonus XP
            self._award_xp(cursor, student_id, ch["xp_reward"])
            self._create_notification(
                cursor, student_id,
                f"Challenge Completed: {ch['title']}",
                f"Well done! You completed this challenge and earned +{ch['xp_reward']} XP.",
                "info", "dashboard"
            )

        return updated_count

    def _ensure_challenges_seeded(self, cursor, student_id: str, today_date: str, week_key: str):
        """Ensure active daily and weekly challenge rows exist for this student."""
        cursor.execute("""
            SELECT COUNT(*) FROM user_challenges
            WHERE student_id = ? AND period_key = ?
        """, (student_id, today_date))
        if cursor.fetchone()[0] == 0:
            daily_challenges = [
                ("daily_quiz", "Mastery Quiz Sprint", "Complete 2 adaptive quiz questions", 2, 20),
                ("daily_revision", "Spaced Reviewer", "Review 1 due concept revision", 1, 15),
                ("daily_tutor", "Socratic Inquirer", "Discuss a concept question with the AI Tutor", 1, 15)
            ]
            for cid, title, desc, target, xp in daily_challenges:
                cursor.execute("""
                    INSERT INTO user_challenges (
                        id, student_id, challenge_id, title, description,
                        challenge_type, current_count, target_count, xp_reward,
                        completed, completed_at, period_key
                    ) VALUES (?, ?, ?, ?, ?, 'daily', 0, ?, ?, 0, NULL, ?)
                """, (f"ch_{uuid.uuid4().hex[:10]}", student_id, cid, title, desc, target, xp, today_date))

        cursor.execute("""
            SELECT COUNT(*) FROM user_challenges
            WHERE student_id = ? AND period_key = ?
        """, (student_id, week_key))
        if cursor.fetchone()[0] == 0:
            weekly_challenges = [
                ("weekly_sessions", "Consistency Marathon", "Complete 5 distinct learning sessions this week", 5, 50),
                ("weekly_revisions", "Retention Fortress", "Clear 5 spaced revision tasks", 5, 40)
            ]
            for cid, title, desc, target, xp in weekly_challenges:
                cursor.execute("""
                    INSERT INTO user_challenges (
                        id, student_id, challenge_id, title, description,
                        challenge_type, current_count, target_count, xp_reward,
                        completed, completed_at, period_key
                    ) VALUES (?, ?, ?, ?, ?, 'weekly', 0, ?, ?, 0, NULL, ?)
                """, (f"ch_{uuid.uuid4().hex[:10]}", student_id, cid, title, desc, target, xp, week_key))

    def _create_notification(self, cursor, student_id: str, title: str, message: str, notif_type: str = "info", action_tab: str = "dashboard"):
        """Create an in-app notification."""
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO user_notifications (
                id, student_id, title, message, notification_type, action_tab, is_read, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        """, (f"notif_{uuid.uuid4().hex[:12]}", student_id, title, message, notif_type, action_tab, now_iso))

    def get_gamification_dashboard(self, student_id: str) -> Dict[str, Any]:
        """Aggregate full gamification telemetry: streaks, calendar, heatmap, XP, achievements, challenges."""
        now = datetime.now(timezone.utc)
        today_date = now.strftime("%Y-%m-%d")
        week_key = f"{now.year}-W{now.strftime('%U')}"

        with storage.get_connection() as conn:
            cursor = conn.cursor()

            # Ensure challenges exist
            self._ensure_challenges_seeded(cursor, student_id, today_date, week_key)

            # 1. Streak Info
            cursor.execute("SELECT * FROM user_streaks WHERE student_id = ?", (student_id,))
            s_row = cursor.fetchone()
            current_streak = s_row["current_streak"] if s_row else 0
            longest_streak = s_row["longest_streak"] if s_row else 0
            total_active_days = s_row["total_active_days"] if s_row else 0
            last_activity_date = s_row["last_activity_date"] if s_row else None

            # 2. XP & Level
            cursor.execute("SELECT * FROM user_gamification WHERE student_id = ?", (student_id,))
            g_row = cursor.fetchone()
            total_xp = g_row["total_xp"] if g_row else 0
            level = g_row["level"] if g_row else max(1, (total_xp // 100) + 1)
            current_level_base = (level - 1) * 100
            next_level_target = level * 100
            progress_percent = min(100, int(((total_xp - current_level_base) / 100) * 100))

            # 3. Weekly Activity Calendar (Monday to Sunday)
            today_dt = now.date()
            start_of_week = today_dt - timedelta(days=today_dt.weekday())  # Monday
            weekly_days = []
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

            cursor.execute("""
                SELECT DISTINCT activity_date FROM user_activity_logs
                WHERE student_id = ? AND qualifying = 1
            """, (student_id,))
            active_dates = {r[0] for r in cursor.fetchall()}

            for i in range(7):
                d = start_of_week + timedelta(days=i)
                d_str = d.strftime("%Y-%m-%d")
                status = "future"
                if d < today_dt:
                    status = "completed" if d_str in active_dates else "missed"
                elif d == today_dt:
                    status = "completed" if d_str in active_dates else "today"

                weekly_days.append({
                    "day": day_names[i],
                    "date": d_str,
                    "is_today": d == today_dt,
                    "status": status,
                    "completed": d_str in active_dates
                })

            # 4. Monthly Heatmap (Last 28 days)
            cursor.execute("""
                SELECT activity_date, COUNT(*) as count
                FROM user_activity_logs
                WHERE student_id = ? AND qualifying = 1
                GROUP BY activity_date
            """, (student_id,))
            date_counts = {r["activity_date"]: r["count"] for r in cursor.fetchall()}

            heatmap = []
            for i in range(27, -1, -1):
                d = today_dt - timedelta(days=i)
                d_str = d.strftime("%Y-%m-%d")
                cnt = date_counts.get(d_str, 0)
                level_intensity = 0
                if cnt >= 4:
                    level_intensity = 4
                elif cnt >= 2:
                    level_intensity = 3
                elif cnt == 1:
                    level_intensity = 2

                heatmap.append({
                    "date": d_str,
                    "count": cnt,
                    "level": level_intensity
                })

            # 5. Streak Milestones
            milestones = []
            for m in MILESTONES_CONFIG:
                achieved = current_streak >= m["days"]
                days_left = max(0, m["days"] - current_streak)
                milestones.append({
                    "days": m["days"],
                    "label": m["label"],
                    "icon": m["icon"],
                    "achieved": achieved,
                    "days_remaining": days_left
                })

            # 6. Achievements
            cursor.execute("SELECT * FROM user_achievements WHERE student_id = ?", (student_id,))
            user_ach_map = {r["achievement_id"]: dict(r) for r in cursor.fetchall()}

            achievements = []
            for ach in ACHIEVEMENTS_CONFIG:
                u_ach = user_ach_map.get(ach["id"], {})
                is_unlocked = bool(u_ach.get("unlocked", 0))
                achievements.append({
                    "id": ach["id"],
                    "title": ach["title"],
                    "description": ach["description"],
                    "category": ach["category"],
                    "icon": ach["icon"],
                    "xp_reward": ach["xp_reward"],
                    "target": ach["target"],
                    "current": u_ach.get("progress_current", 0),
                    "unlocked": is_unlocked,
                    "unlocked_at": u_ach.get("unlocked_at")
                })

            # 7. Challenges
            cursor.execute("""
                SELECT * FROM user_challenges
                WHERE student_id = ? AND (period_key = ? OR period_key = ?)
                ORDER BY challenge_type ASC, completed ASC
            """, (student_id, today_date, week_key))
            all_challenges = [dict(r) for r in cursor.fetchall()]
            daily_challenges = [c for c in all_challenges if c["challenge_type"] == "daily"]
            weekly_challenges = [c for c in all_challenges if c["challenge_type"] == "weekly"]

            # 8. Learning Statistics
            cursor.execute("SELECT COUNT(*) FROM user_activity_logs WHERE student_id = ?", (student_id,))
            total_sessions = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM attempts WHERE student_id = ?", (student_id,))
            total_questions = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM attempts WHERE student_id = ? AND is_correct = 1", (student_id,))
            correct_questions = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM concept_mastery WHERE student_id = ? AND mastery_percentage >= 80.0", (student_id,))
            concepts_mastered = cursor.fetchone()[0]

            accuracy = round((correct_questions / max(1, total_questions)) * 100, 1)

            return {
                "streak": {
                    "current_streak": current_streak,
                    "longest_streak": longest_streak,
                    "total_active_days": total_active_days,
                    "last_activity_date": last_activity_date,
                    "weekly_calendar": weekly_days,
                    "heatmap": heatmap,
                    "milestones": milestones
                },
                "gamification": {
                    "total_xp": total_xp,
                    "level": level,
                    "current_level_base": current_level_base,
                    "next_level_target": next_level_target,
                    "progress_percent": progress_percent
                },
                "achievements": achievements,
                "challenges": {
                    "daily": daily_challenges,
                    "weekly": weekly_challenges
                },
                "stats": {
                    "total_sessions": total_sessions,
                    "total_questions": total_questions,
                    "correct_questions": correct_questions,
                    "concepts_mastered": concepts_mastered,
                    "accuracy_rate": accuracy
                }
            }

    def get_user_settings(self, student_id: str) -> Dict[str, Any]:
        """Get user preferences."""
        with storage.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_settings WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row:
                return {
                    "theme": "light",
                    "timezone": "UTC",
                    "daily_goal_minutes": 30,
                    "preferred_study_days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    "reminder_notifications": True,
                    "revision_reminders": True,
                    "streak_reminders": True,
                    "sound_effects": True
                }

            r = dict(row)
            try:
                days = json.loads(r.get("preferred_study_days", "[]"))
            except Exception:
                days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

            return {
                "theme": r.get("theme", "light"),
                "timezone": r.get("timezone", "UTC"),
                "daily_goal_minutes": r.get("daily_goal_minutes", 30),
                "preferred_study_days": days,
                "reminder_notifications": bool(r.get("reminder_notifications", 1)),
                "revision_reminders": bool(r.get("revision_reminders", 1)),
                "streak_reminders": bool(r.get("streak_reminders", 1)),
                "sound_effects": bool(r.get("sound_effects", 1))
            }

    def update_user_settings(self, student_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Save user preferences."""
        now_iso = datetime.now(timezone.utc).isoformat()
        theme = settings.get("theme", "light")
        timezone_str = settings.get("timezone", "UTC")
        daily_goal = int(settings.get("daily_goal_minutes", 30))
        study_days = json.dumps(settings.get("preferred_study_days", ["Mon", "Tue", "Wed", "Thu", "Fri"]))
        reminders = 1 if settings.get("reminder_notifications", True) else 0
        revisions = 1 if settings.get("revision_reminders", True) else 0
        streaks = 1 if settings.get("streak_reminders", True) else 0
        sounds = 1 if settings.get("sound_effects", True) else 0

        with storage.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO user_settings (
                    student_id, theme, timezone, daily_goal_minutes,
                    preferred_study_days, reminder_notifications, revision_reminders,
                    streak_reminders, sound_effects, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                student_id, theme, timezone_str, daily_goal,
                study_days, reminders, revisions, streaks, sounds, now_iso
            ))
            conn.commit()

        return self.get_user_settings(student_id)

    def get_notifications(self, student_id: str) -> List[Dict[str, Any]]:
        """Retrieve recent in-app notifications and inject dynamic revision alerts."""
        with storage.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM user_notifications
                WHERE student_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            """, (student_id,))
            notifs = [dict(r) for r in cursor.fetchall()]

            # Dynamic check: Are there revisions due?
            cursor.execute("""
                SELECT COUNT(*) FROM revision_tasks
                WHERE student_id = ? AND status != 'completed' AND datetime(due_date) <= datetime('now')
            """, (student_id,))
            due_count = cursor.fetchone()[0]

            if due_count > 0:
                has_recent_rev_notif = any(n["notification_type"] == "revision" and not n["is_read"] for n in notifs)
                if not has_recent_rev_notif:
                    self._create_notification(
                        cursor, student_id,
                        f"Spaced Revision Due ({due_count} concept{'s' if due_count > 1 else ''})",
                        f"You have {due_count} scheduled revision task{'s' if due_count > 1 else ''} ready for review to reinforce memory retention.",
                        "revision", "revision"
                    )
                    conn.commit()
                    # Re-query
                    cursor.execute("""
                        SELECT * FROM user_notifications
                        WHERE student_id = ?
                        ORDER BY created_at DESC
                        LIMIT 20
                    """, (student_id,))
                    notifs = [dict(r) for r in cursor.fetchall()]

        return notifs

    def mark_notifications_read(self, student_id: str, notification_id: Optional[str] = None) -> bool:
        """Mark single or all notifications as read."""
        with storage.get_connection() as conn:
            cursor = conn.cursor()
            if notification_id:
                cursor.execute("""
                    UPDATE user_notifications
                    SET is_read = 1
                    WHERE student_id = ? AND id = ?
                """, (student_id, notification_id))
            else:
                cursor.execute("""
                    UPDATE user_notifications
                    SET is_read = 1
                    WHERE student_id = ?
                """, (student_id,))
            conn.commit()
        return True


gamification_service = GamificationService()
