import pandas as pd
import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend directory to sys path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal, engine
import models
from ml.seed_system import get_password_hash

def run_sync():
    csv_path = os.path.join(os.getcwd(), 'backend', 'ml', 'msu_attendance_2026_cleaned_complete.csv')
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found.")
        return

    print("Loading Dataset...")
    df = pd.read_csv(csv_path)

    db = SessionLocal()
    try:
        # 1. System Branding
        print("Setting up System Branding...")
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == 'system_name').first()
        if not setting:
            db.add(models.SystemSetting(key='system_name', value='Midlands State University'))
        else:
            setting.value = 'Midlands State University'
        db.commit()

        # 2. Super Admin
        print("Ensuring Super Admin...")
        admin = db.query(models.User).filter(models.User.role == 'super_admin').first()
        if not admin:
            admin = models.User(
                role='super_admin',
                email='admin@gmail.com',
                password_hash=get_password_hash('admin1234'),
                full_name='Tadiwa Nemhara',
                is_active=True
            )
            db.add(admin)
        else:
            admin.full_name = 'Tadiwa Nemhara'
            admin.email = 'admin@gmail.com'
            admin.password_hash = get_password_hash('admin1234')
        db.commit()

        # 3. Programmes
        print("Syncing Programmes...")
        prog_name = "DATA SCIENCE"
        programme = db.query(models.Programme).filter(models.Programme.name == prog_name).first()
        if not programme:
            programme = models.Programme(name=prog_name, levels="L2.2")
            db.add(programme)
            db.commit()
            db.refresh(programme)
        else:
            programme.levels = "L2.2"
            db.commit()

        # 4. Lecturers
        print("Syncing Lecturers...")
        lecturer_rows = df[['Lecturer_ID', 'Lecturer_Name']].drop_duplicates()
        lecturer_map = {}
        for _, row in lecturer_rows.iterrows():
            lid = row['Lecturer_ID']
            lname = row['Lecturer_Name']
            user = db.query(models.User).filter(models.User.lecturer_id == lid).first()
            if not user:
                user = models.User(
                    role='lecturer',
                    email=f"{lid.lower()}@msu.edu",
                    password_hash=get_password_hash('lecturer1234'),
                    full_name=lname,
                    lecturer_id=lid
                )
                db.add(user)
                db.flush()
            lecturer_map[lid] = user.id
        db.commit()

        # 5. Modules (Courses)
        print("Syncing Modules...")
        module_rows = df[['Module', 'Lecturer_ID', 'Day', 'Time_Slot']].drop_duplicates()
        course_map = {}
        for _, row in module_rows.iterrows():
            mname = row['Module']
            lid = row['Lecturer_ID']
            code = mname.replace(' ', '').upper()[:8]
            course = db.query(models.Course).filter(models.Course.name == mname).first()
            if not course:
                course = models.Course(
                    name=mname,
                    code=code,
                    lecturer_id=lecturer_map.get(lid),
                    programme_id=programme.id,
                    level="L2.2",
                    day_of_week=row['Day'],
                    time_slot=row['Time_Slot']
                )
                db.add(course)
                db.flush()
            course_map[mname] = course.id
        db.commit()

        # 6. Students
        print("Syncing Students...")
        student_rows = df[['Student_ID', 'Student_Name']].drop_duplicates()
        student_map = {}
        for _, row in student_rows.iterrows():
            sid = row['Student_ID']
            sname = row['Student_Name']
            user = db.query(models.User).filter(models.User.student_reg_number == sid).first()
            if not user:
                user = models.User(
                    role='student',
                    email=f"{sid.lower()}@msu.edu",
                    password_hash=get_password_hash('students1234'),
                    full_name=sname,
                    student_reg_number=sid,
                    faculty="Data Science",
                    year_of_study="Level 2.2"
                )
                db.add(user)
                db.flush()
            student_map[sid] = user.id
        db.commit()

        # 7. Enrollments
        print("Syncing Enrollments...")
        enroll_rows = df[['Student_ID', 'Module']].drop_duplicates()
        for _, row in enroll_rows.iterrows():
            sid = row['Student_ID']
            mname = row['Module']
            s_id = student_map.get(sid)
            c_id = course_map.get(mname)
            if s_id and c_id:
                existing = db.query(models.Enrollment).filter_by(student_id=s_id, course_id=c_id).first()
                if not existing:
                    db.add(models.Enrollment(student_id=s_id, course_id=c_id))
        db.commit()

        # 8. Attendance Records
        print("Syncing Attendance Records (37,000+)...")
        # Clear existing attendance to avoid duplicates if re-running
        db.query(models.AttendanceRecord).delete()
        db.commit()
        
        attendance_batch = []
        for i, row in df.iterrows():
            s_id = student_map.get(row['Student_ID'])
            c_id = course_map.get(row['Module'])
            if s_id and c_id:
                try:
                    date_obj = datetime.strptime(row['Date'], '%Y-%m-%d')
                except:
                    date_obj = datetime.now()
                
                attendance_batch.append(models.AttendanceRecord(
                    student_id=s_id,
                    course_id=c_id,
                    timestamp=date_obj,
                    status=row['Attendance'],
                    check_in_time=row['Check_In_Time'] if pd.notna(row['Check_In_Time']) else None
                ))
            
            if len(attendance_batch) >= 5000:
                db.bulk_save_objects(attendance_batch)
                db.commit()
                attendance_batch = []
                print(f"Processed {i+1} records...")
        
        if attendance_batch:
            db.bulk_save_objects(attendance_batch)
            db.commit()

        print("\nSUCCESS: All dataset information has been integrated into the system!")
        print(f"Total Students: {len(student_map)}")
        print(f"Total Modules: {len(course_map)}")
        print(f"Total Attendance Records: {len(df)}")

    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
