import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models
from utils import get_password_hash

db = SessionLocal()
try:
    admin = db.query(models.User).filter(models.User.role == 'super_admin').first()
    if not admin:
        print("Creating default super admin...")
        admin = models.User(
            email="admin@msu.ac.zw",
            password_hash=get_password_hash("tadiwa0627"),
            full_name="Super Administrator",
            role="super_admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Super admin created: admin@msu.ac.zw / tadiwa0627")
    else:
        print(f"Super admin already exists: {admin.email}")
finally:
    db.close()
