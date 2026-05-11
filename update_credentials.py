import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models
from utils import get_password_hash

db = SessionLocal()
try:
    print("Updating Super Admin...")
    admin = db.query(models.User).filter(models.User.role == 'super_admin').first()
    if admin:
        admin.email = "admin@gmail.com"
        admin.password_hash = get_password_hash("admin1234")
    else:
        admin = models.User(
            email="admin@gmail.com",
            password_hash=get_password_hash("admin1234"),
            full_name="Super Administrator",
            role="super_admin",
            is_active=True
        )
        db.add(admin)
    
    print("Updating Lecturers...")
    lecturers = db.query(models.User).filter(models.User.role == 'lecturer').all()
    lecturer_hash = get_password_hash("lecturer1234")
    for l in lecturers:
        l.password_hash = lecturer_hash
        
    print("Updating Students...")
    students = db.query(models.User).filter(models.User.role == 'student').all()
    student_hash = get_password_hash("students1234")
    for s in students:
        s.password_hash = student_hash
        
    db.commit()
    print("All credentials updated successfully!")
finally:
    db.close()
