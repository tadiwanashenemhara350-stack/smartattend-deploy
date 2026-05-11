import csv
from collections import defaultdict

import os
csv_path = os.path.join(os.path.dirname(__file__), "msu_attendance_2026_cleaned_complete.csv")

student_modules = defaultdict(set)
all_modules = set()

with open(csv_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        student_id = row['Student_ID']
        module = row['Module']
        student_modules[student_id].add(module)
        all_modules.add(module)

total_students = len(student_modules)
total_modules = len(all_modules)

print(f"Total Unique Modules: {total_modules}")
print(f"Total Unique Students: {total_students}")

module_counts = [len(mods) for mods in student_modules.values()]
min_mods = min(module_counts)
max_mods = max(module_counts)
avg_mods = sum(module_counts) / total_students

print(f"\nModules per Student:")
print(f"  Average: {avg_mods:.2f}")
print(f"  Minimum: {min_mods}")
print(f"  Maximum: {max_mods}")

if min_mods == max_mods:
    print(f"\nAll students are doing exactly {min_mods} modules.")
else:
    # Check distribution
    distribution = defaultdict(int)
    for count in module_counts:
        distribution[count] += 1
    print("\nDistribution of module counts:")
    for count, num_students in sorted(distribution.items()):
        print(f"  {count} modules: {num_students} students")

print("\nList of all modules found:")
for mod in sorted(all_modules):
    print(f" - {mod}")
