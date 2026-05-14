import os
import sys
import csv
import random
from datetime import datetime

# Adjust path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import engine, Base, SessionLocal
from models import User, Course, ModuleSession, AttendanceRecord, Enrollment, Programme, SystemSetting
from utils import get_password_hash

DATA_CSV_PATH = os.path.join(os.path.dirname(__file__), "msu_attendance_2026_cleaned_complete.csv")

# Global seeding status so the API can report it
seeding_status = {"running": False, "complete": False, "message": "Not started"}

def run_seed():
    global seeding_status
    seeding_status = {"running": True, "complete": False, "message": "Starting up..."}

    print("=== SmartAttend Seeding Engine ===")

    # 1. Ensure tables exist (idempotent - safe to call anytime)
    print("Ensuring database schema is up to date...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Schema ready.")
    except Exception as e:
        print(f"Schema error: {e}")
        seeding_status = {"running": False, "complete": False, "message": f"Schema error: {e}"}
        return

    # 2. Check if seeding is needed
    db = SessionLocal()
    try:
        student_count = db.query(User).filter(User.role == 'student').count()
        force = os.getenv("FORCE_RESEED") == "true"
        
        if student_count > 100 and not force:
            print(f"Database already has {student_count} students. Seeding skipped.")
            seeding_status = {"running": False, "complete": True, "message": f"Already seeded ({student_count} students)"}
            db.close()
            return
        
        print(f"Found {student_count} students. Proceeding with seeding...")
        seeding_status["message"] = "Clearing old data..."

        # 3. Clear data tables (NOT dropping — just deleting rows) in correct FK order
        if force or student_count > 0:
            print("Clearing old records...")
            db.query(AttendanceRecord).delete(synchronize_session=False)
            db.query(Enrollment).delete(synchronize_session=False)
            db.query(ModuleSession).delete(synchronize_session=False)
            db.query(Course).delete(synchronize_session=False)
            db.query(Programme).delete(synchronize_session=False)
            # Remove non-admin users
            db.query(User).filter(User.role.in_(["student", "lecturer"])).delete(synchronize_session=False)
            db.commit()
            print("Old data cleared.")

        # 4. Ensure admin user exists
        admin = db.query(User).filter(User.role == 'super_admin').first()
        if not admin:
            print("Creating default admin...")
            db.add(User(
                role="super_admin",
                email="admin@gmail.com",
                password_hash=get_password_hash("admin1234"),
                full_name="Tadiwa Nemhara",
                is_active=True
            ))
            db.commit()
            print("Default admin created.")

        # 5. Setup Programme
        print("Setting up MSU Data Science Programme...")
        msu_prog = db.query(Programme).filter(Programme.name == "MSU Data Science").first()
        if not msu_prog:
            msu_prog = Programme(name="MSU Data Science", levels="Level 1.1, Level 1.2, Level 2.1, Level 2.2")
            db.add(msu_prog)
            db.commit()
            db.refresh(msu_prog)
        print(f"Programme ready: {msu_prog.name} (id={msu_prog.id})")

    except Exception as e:
        print(f"CRITICAL ERROR during setup: {e}")
        db.rollback()
        db.close()
        seeding_status = {"running": False, "complete": False, "message": f"Setup error: {e}"}
        return

    # 6. Read CSV and seed
    if not os.path.exists(DATA_CSV_PATH):
        print(f"ERROR: CSV not found at {DATA_CSV_PATH}")
        db.close()
        seeding_status = {"running": False, "complete": False, "message": "CSV file not found"}
        return

    print(f"Reading dataset from: {DATA_CSV_PATH}")
    seeding_status["message"] = "Reading CSV dataset..."

    students = {}    # reg_number -> User
    lecturers = {}   # lecturer_id -> User
    courses = {}     # module_name -> Course
    sessions = {}    # (course_id, date, time_slot) -> ModuleSession
    used_codes = set()

    try:
        with open(DATA_CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Total rows to process: {len(rows)}")
        seeding_status["message"] = f"Processing {len(rows)} rows..."

        BATCH_SIZE = 500
        batch_count = 0

        for row_count, row in enumerate(rows, 1):
            stud_id      = row.get("Student_ID", "").strip()
            stud_name    = row.get("Student_Name", "Unknown").strip()
            lect_id      = row.get("Lecturer_ID", "").strip()
            lect_name    = row.get("Lecturer_Name", "Unknown").strip()
            module       = row.get("Module", "").strip()
            date_val     = row.get("Date", "").strip()
            day_val      = row.get("Day", "").strip()
            time_slot    = row.get("Time_Slot", "").strip()
            attendance   = row.get("Attendance", "Present").strip()
            check_in_time = row.get("Check_In_Time", "").strip()

            if not stud_id or not module:
                continue

            # --- Lecturer ---
            if lect_id and lect_id not in lecturers:
                lect = User(
                    role="lecturer",
                    email=f"{lect_id.lower()}@msu.edu",
                    password_hash=get_password_hash("lecturer1234"),
                    full_name=lect_name,
                    lecturer_id=lect_id
                )
                db.add(lect)
                db.flush()
                lecturers[lect_id] = lect

            # --- Student ---
            if stud_id not in students:
                stud = User(
                    role="student",
                    email=f"{stud_id.lower()}@msu.edu",
                    password_hash=get_password_hash("student1234"),
                    full_name=stud_name,
                    student_reg_number=stud_id,
                    faculty="Data Science",
                    year_of_study="Level 2.2"
                )
                db.add(stud)
                db.flush()
                students[stud_id] = stud

            # --- Course ---
            if module not in courses:
                words = module.split()
                base_code = "".join(w[0] for w in words).upper()
                c = 101
                code = f"{base_code}{c}"
                while code in used_codes:
                    c += 1
                    code = f"{base_code}{c}"
                used_codes.add(code)

                lecturer_obj = lecturers.get(lect_id)
                course = Course(
                    name=module,
                    code=code,
                    lecturer_id=lecturer_obj.id if lecturer_obj else None,
                    programme_id=msu_prog.id,
                    level="Level 2.2",
                    day_of_week=day_val,
                    time_slot=time_slot
                )
                db.add(course)
                db.flush()
                courses[module] = course

            course_obj = courses[module]

            # --- Session ---
            session_key = (course_obj.id, date_val, time_slot)
            if session_key not in sessions:
                sess = ModuleSession(
                    course_id=course_obj.id,
                    date=date_val,
                    day_of_week=day_val,
                    time_slot=time_slot
                )
                db.add(sess)
                db.flush()
                sessions[session_key] = sess

            session_obj = sessions[session_key]
            student_obj = students[stud_id]

            # --- Enrollment (track per student) ---
            if not hasattr(student_obj, '_enrolled'):
                student_obj._enrolled = set()
            if course_obj.id not in student_obj._enrolled:
                db.add(Enrollment(student_id=student_obj.id, course_id=course_obj.id))
                student_obj._enrolled.add(course_obj.id)

            # --- Attendance Record ---
            if not hasattr(student_obj, '_sessions'):
                student_obj._sessions = set()
            if session_key not in student_obj._sessions:
                try:
                    dt_str = f"{date_val} {check_in_time if check_in_time else '08:00'}"
                    ts = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                except Exception:
                    ts = datetime.utcnow()

                db.add(AttendanceRecord(
                    student_id=student_obj.id,
                    course_id=course_obj.id,
                    session_id=session_obj.id,
                    check_in_time=check_in_time or None,
                    status=attendance,
                    timestamp=ts
                ))
                student_obj._sessions.add(session_key)

            # Batch commit
            if row_count % BATCH_SIZE == 0:
                db.commit()
                batch_count += 1
                pct = int((row_count / len(rows)) * 100)
                msg = f"Processed {row_count}/{len(rows)} rows ({pct}%)..."
                print(msg)
                seeding_status["message"] = msg

        # 7. Fill in any missing attendance for completeness
        print("Generating synthetic records for missed sessions...")
        seeding_status["message"] = "Generating synthetic attendance data..."
        all_sessions = list(sessions.values())
        all_course_ids = [c.id for c in courses.values()]
        synthetic = 0

        for stud_reg, stud_obj in students.items():
            if not hasattr(stud_obj, '_enrolled'):
                stud_obj._enrolled = set()
            if not hasattr(stud_obj, '_sessions'):
                stud_obj._sessions = set()

            # Enroll in all courses
            for cid in all_course_ids:
                if cid not in stud_obj._enrolled:
                    db.add(Enrollment(student_id=stud_obj.id, course_id=cid))
                    stud_obj._enrolled.add(cid)

            # Fill missing session records
            for sess_obj in all_sessions:
                sk = (sess_obj.course_id, sess_obj.date, sess_obj.time_slot)
                if sk not in stud_obj._sessions:
                    status = random.choices(["Present", "Absent", "Late"], weights=[80, 10, 10])[0]
                    ci = "08:15" if status in ["Present", "Late"] else None
                    try:
                        ts = datetime.strptime(f"{sess_obj.date} {ci or '08:00'}", "%Y-%m-%d %H:%M")
                    except Exception:
                        ts = datetime.utcnow()
                    db.add(AttendanceRecord(
                        student_id=stud_obj.id,
                        course_id=sess_obj.course_id,
                        session_id=sess_obj.id,
                        check_in_time=ci,
                        status=status,
                        timestamp=ts
                    ))
                    stud_obj._sessions.add(sk)
                    synthetic += 1

            if synthetic % 5000 == 0 and synthetic > 0:
                db.commit()

        print(f"Generated {synthetic} synthetic records.")
        db.commit()
        print("=== Seeding COMPLETE ===")
        total_students = len(students)
        total_lecturers = len(lecturers)
        total_courses = len(courses)
        total_sessions = len(sessions)
        print(f"Summary: {total_students} students | {total_lecturers} lecturers | {total_courses} modules | {total_sessions} sessions")
        seeding_status = {
            "running": False,
            "complete": True,
            "message": f"Done! {total_students} students, {total_courses} modules, {total_sessions} sessions seeded."
        }

    except Exception as e:
        import traceback
        print(f"CRITICAL SEEDING ERROR: {e}")
        traceback.print_exc()
        db.rollback()
        seeding_status = {"running": False, "complete": False, "message": f"Error: {e}"}
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
