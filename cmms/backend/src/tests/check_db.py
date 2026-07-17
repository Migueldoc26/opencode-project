import subprocess, json
r = subprocess.run(
    ["docker", "exec", "cmms-postgres", "psql", "-U", "cmms", "-c",
     "select id, email, password, role from \"User\" limit 10"],
    capture_output=True, text=True, timeout=10
)
print("STDOUT:", r.stdout)
print("STDERR:", r.stderr)
