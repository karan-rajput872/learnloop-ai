import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "../data/learnloop.db")
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(0)

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
tables = [r[0] for r in c.fetchall()]
print("Found tables:", tables)
for t in tables:
    c.execute(f"SELECT count(*) FROM {t}")
    count = c.fetchone()[0]
    c.execute(f"PRAGMA table_info({t})")
    cols = [col[1] for col in c.fetchall()]
    print(f"  [{t}] - {count} rows. Columns: {cols}")
conn.close()
