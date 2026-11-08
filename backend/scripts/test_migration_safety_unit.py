"""
Test suite validating migration utility safety functions.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import tempfile
import shutil
from scripts.migrate_sqlite_to_postgres import (
    open_sqlite_ro,
    check_sqlite_integrity,
    verify_all_20_tables,
    normalize_value,
    compare_rows
)

def test_migration_safety():
    print("=" * 70)
    print("MIGRATION SAFETY & FIDELITY UNIT TEST")
    print("=" * 70)

    # 1. Test open_sqlite_ro on learnloop.db
    ro_conn = open_sqlite_ro('data/learnloop.db')
    try:
        ro_conn.execute('CREATE TABLE fail_test (id INT)')
        raise AssertionError('FAIL: Read-only not enforced')
    except sqlite3.OperationalError as e:
        print('[PASS] Read-only engine enforcement on source:', str(e))
    finally:
        ro_conn.close()

    # 2. Test check_sqlite_integrity
    conn = sqlite3.connect('data/learnloop.db')
    check_sqlite_integrity(conn, 'master learnloop.db')
    print('[PASS] check_sqlite_integrity passed with ok')

    # 3. Test verify_all_20_tables
    counts = verify_all_20_tables(conn)
    total_rows = sum(counts.values())
    assert len(counts) == 20, f"Expected 20 tables, got {len(counts)}"
    assert total_rows == 4859, f"Expected 4859 rows, got {total_rows}"
    print(f'[PASS] verify_all_20_tables passed (20 tables, {total_rows} rows)')
    conn.close()

    # 4. Test normalize_value & compare_rows
    cols = ['id', 'name', 'json_col', 'flag', 'timestamp']
    r1 = {'id': 1, 'name': 'alice', 'json_col': '{"a": 1}', 'flag': 1, 'timestamp': '2026-11-01 12:00:00'}
    r2 = {'id': 1, 'name': 'alice', 'json_col': '{"a": 1}', 'flag': True, 'timestamp': '2026-11-01 12:00:00'}
    diffs = compare_rows(r1, r2, cols)
    assert len(diffs) == 0, f"Expected 0 diffs, got {diffs}"
    print('[PASS] compare_rows normalized boolean & json equality verified')

    # 5. Test divergent values detection
    r3 = {'id': 1, 'name': 'alice', 'json_col': '{"a": 2}', 'flag': 1, 'timestamp': '2026-11-01 12:00:00'}
    diffs_divergent = compare_rows(r1, r3, cols)
    assert len(diffs_divergent) == 1, f"Expected 1 diff, got {diffs_divergent}"
    assert diffs_divergent[0] == 'json_col'
    print(f'[PASS] Value divergence detected accurately: {diffs_divergent}')

    # 6. Test disposable SQLite copy and backup integrity
    with tempfile.TemporaryDirectory() as tmpdir:
        disposable_db = os.path.join(tmpdir, "disposable.db")
        shutil.copyfile("data/learnloop.db", disposable_db)
        d_conn = sqlite3.connect(disposable_db)
        check_sqlite_integrity(d_conn, "disposable copy")
        d_counts = verify_all_20_tables(d_conn, "disposable copy")
        assert sum(d_counts.values()) == 4859
        d_conn.close()
        print(f'[PASS] Disposable copy verified with exact row count: {sum(d_counts.values())}')

    print("=" * 70)
    print("ALL MIGRATION SAFETY UNIT TESTS PASSED (6/6)")
    print("=" * 70)

if __name__ == "__main__":
    test_migration_safety()
