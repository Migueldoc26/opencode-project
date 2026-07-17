import subprocess

r = subprocess.run(
    ["docker", "exec", "cmms-postgres", "psql", "-U", "cmms", "-tA",
     "-c", "select password from \"User\" where email='admin@cmms.cl'"],
    capture_output=True, text=True, timeout=10
)
print("Hash:", r.stdout.strip())

import bcrypt
pw = "Admin123"
result = bcrypt.checkpw(pw.encode(), r.stdout.strip().encode())
print(f"Password match for '{pw}':", result)
