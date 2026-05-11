import requests

BASE_URL = "http://localhost:8000"

def verify():
    # 1. Login
    print("Attempting to login...")
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": "admin@gmail.com",
            "password": "admin1234"
        })
        login_res.raise_for_status()
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")

        # 2. Check Programmes
        prog_res = requests.get(f"{BASE_URL}/admin/programmes", headers=headers)
        progs = prog_res.json()
        print(f"Programmes found: {[p['name'] for p in progs]}")

        # 3. Check Courses
        course_res = requests.get(f"{BASE_URL}/admin/courses", headers=headers)
        courses = course_res.json()
        print(f"Total Courses: {len(courses)}")
        print(f"Sample Course: {courses[0]['name']} (Programme: {courses[0]['programme']['name'] if courses[0]['programme'] else 'None'})")

        # 4. Check System Overview
        stats_res = requests.get(f"{BASE_URL}/analytics/system_overview", headers=headers)
        stats = stats_res.json()
        print(f"System Stats: Students={stats['students']}, Lecturers={stats['lecturers']}, Admins={stats['admins']}")

    except Exception as e:
        print(f"Verification failed: {e}")

if __name__ == "__main__":
    verify()
