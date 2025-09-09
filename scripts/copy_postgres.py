#!/usr/bin/env python3
"""
copy_postgres.py

Copy a PostgreSQL database from a source server to a target server by streaming
`pg_dump` output into `psql` on the target.

Requirements:
- `pg_dump` and `psql` must be installed and available on PATH (Postgres client tools).
- Python packages in `requirements.txt` (psycopg2-binary) for connectivity checks and optional DB creation.

This script is intended to be run locally and will stream the dump; it does not
create an intermediate dump file by default.

Security note: the script can accept passwords via environment variables; if you
omit a password it will prompt interactively.

Example:
  python scripts/copy_postgres.py \
    --src-host src.example.com --src-port 5432 --src-user srcuser --src-db sourcedb \
    --tgt-host tgt.example.com --tgt-port 5432 --tgt-user tgtuser --tgt-db targetdb \
    --create-target-db --yes

"""

import argparse
import json
import os
import shlex
import subprocess
import sys
import getpass
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def parse_args():
    p = argparse.ArgumentParser(description="Copy a Postgres DB from source to target by streaming pg_dump -> psql")

    # Accept two config hashes (JSON string or @file containing JSON)
    p.add_argument('--src', required=True,
                   help='Source DB config as JSON or @file. Keys: host, port, user, db, password (optional)')
    p.add_argument('--tgt', required=True,
                   help='Target DB config as JSON or @file. Keys: host, port, user, db, password (optional)')

    p.add_argument('--create-target-db', action='store_true', help='Create the target database if it does not exist (requires sufficient privileges)')
    p.add_argument('--drop-target-db', action='store_true', help='Drop target database if it exists before creating it')
    p.add_argument('--yes', '-y', action='store_true', help='Assume yes to all prompts')
    p.add_argument('--no-owner', action='store_true', help='Pass --no-owner to pg_dump (recommended when restoring to different cluster)')
    p.add_argument('--no-privileges', action='store_true', help='Pass --no-privileges to pg_dump')
    p.add_argument('--pg-dump-path', default='pg_dump', help='Path to pg_dump executable')
    p.add_argument('--psql-path', default='psql', help='Path to psql executable')
    p.add_argument('--extra-pg-dump-opts', default='', help='Extra options to append to pg_dump (quoted)')

    return p.parse_args()


def load_config(arg):
    """Load a config from a JSON string or from a file path prefixed with @.

    Returns a dict with keys: host, port, user, db, password(optional).
    """
    raw = arg
    if isinstance(raw, str) and raw.startswith('@'):
        path = raw[1:]
        with open(path, 'r', encoding='utf-8') as fh:
            raw = fh.read()
    try:
        cfg = json.loads(raw)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON config: {e}")
    # normalize keys
    result = {
        'host': cfg.get('host') or cfg.get('hostname') or cfg.get('hostaddr'),
        'port': str(cfg.get('port', 5432)),
        'user': cfg.get('user') or cfg.get('username'),
        'db': cfg.get('db') or cfg.get('database') or cfg.get('dbname'),
        'password': cfg.get('password')
    }
    missing = [k for k, v in result.items() if k in ('host', 'user', 'db') and not v]
    if missing:
        raise ValueError(f"Missing required keys in config: {missing}")
    return result


def prompt_password_if_needed(src_cfg, tgt_cfg):
    if not src_cfg.get('password'):
        src_cfg['password'] = getpass.getpass(prompt=f"Source DB password for {src_cfg['user']}@{src_cfg['host']}: ")
    if not tgt_cfg.get('password'):
        tgt_cfg['password'] = getpass.getpass(prompt=f"Target DB password for {tgt_cfg['user']}@{tgt_cfg['host']}: ")


def test_connection(host, port, user, password, dbname, role='source'):
    try:
        conn = psycopg2.connect(host=host, port=port, user=user, password=password, dbname=dbname)
        conn.close()
        print(f"OK: can connect to {role} database {user}@{host}:{port}/{dbname}")
        return True
    except Exception as e:
        print(f"ERROR: cannot connect to {role} database {user}@{host}:{port}/{dbname}: {e}")
        return False


def create_or_replace_database(tgt_cfg, drop=False):
    # Connect to maintenance DB (postgres) to create or drop target database
    maint_db = 'postgres'
    print(f"Connecting to target server {tgt_cfg['host']}:{tgt_cfg['port']} to create/drop database {tgt_cfg['db']}...")
    conn = psycopg2.connect(host=tgt_cfg['host'], port=tgt_cfg['port'], user=tgt_cfg['user'], password=tgt_cfg.get('password'), dbname=maint_db)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    try:
        if drop:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (tgt_cfg['db'],))
            if cur.fetchone():
                print(f"Dropping database {tgt_cfg['db']}...")
                cur.execute(f"DROP DATABASE {psycopg2.sql.Identifier(tgt_cfg['db']).string}")
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (tgt_cfg['db'],))
        if cur.fetchone():
            print(f"Database {tgt_cfg['db']} already exists; skipping create.")
        else:
            print(f"Creating database {tgt_cfg['db']}...")
            # Use simple SQL to avoid heavy quoting here
            cur.execute('CREATE DATABASE ' + psycopg2.extensions.quote_ident(tgt_cfg['db'], cur))
    finally:
        cur.close()
        conn.close()


def run_streaming_copy(src_cfg, tgt_cfg, pg_dump_path='pg_dump', psql_path='psql', no_owner=False, no_privileges=False, extra_pg_dump_opts=''):
    # Build pg_dump command (plain SQL)
    pg_dump_cmd = [pg_dump_path,
                   '-h', src_cfg['host'],
                   '-p', str(src_cfg['port']),
                   '-U', src_cfg['user'],
                   '-d', src_cfg['db'],
                   '-F', 'p']  # plain SQL

    if no_owner:
        pg_dump_cmd.append('--no-owner')
    if no_privileges:
        pg_dump_cmd.append('--no-privileges')
    if extra_pg_dump_opts:
        extra = shlex.split(extra_pg_dump_opts)
        pg_dump_cmd.extend(extra)

    psql_cmd = [psql_path,
                '-h', tgt_cfg['host'],
                '-p', str(tgt_cfg['port']),
                '-U', tgt_cfg['user'],
                '-d', tgt_cfg['db']]

    print('pg_dump command:', ' '.join(shlex.quote(x) for x in pg_dump_cmd))
    print('psql command:   ', ' '.join(shlex.quote(x) for x in psql_cmd))

    # Prepare environment with passwords for child processes
    env = os.environ.copy()
    env['PGPASSWORD'] = src_cfg.get('password')
    # Start pg_dump
    print('Starting pg_dump (source) ...')
    pg_dump_proc = subprocess.Popen(pg_dump_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)

    # For psql we need the target password in env when starting the process
    env_target = os.environ.copy()
    env_target['PGPASSWORD'] = tgt_cfg.get('password')

    print('Starting psql (target) ...')
    psql_proc = subprocess.Popen(psql_cmd, stdin=pg_dump_proc.stdout, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env_target)

    # Close pg_dump stdout in parent so pg_dump sees a SIGPIPE if psql exits
    pg_dump_proc.stdout.close()

    # Read stderr outputs in parallel and report
    _, pg_dump_err = pg_dump_proc.communicate()
    psql_out, psql_err = psql_proc.communicate()

    if pg_dump_proc.returncode != 0:
        print('pg_dump failed with return code', pg_dump_proc.returncode)
        print(pg_dump_err.decode(errors='ignore'))
        return False
    if psql_proc.returncode != 0:
        print('psql restore failed with return code', psql_proc.returncode)
        print(psql_err.decode(errors='ignore'))
        return False

    print('Copy completed successfully.')
    return True


def main():
    args = parse_args()

    # Prompt for passwords if omitted
    prompt_password_if_needed(args)

    # Quick connectivity tests
    ok_src = test_connection(args.src_host, args.src_port, args.src_user, args.src_password, args.src_db, role='source')
    ok_tgt = test_connection(args.tgt_host, args.tgt_port, args.tgt_user, args.tgt_password, args.tgt_db, role='target')

    if not ok_src:
        print('Cannot proceed: source unreachable.')
        sys.exit(2)

    # If create-target-db or drop-target-db, attempt using maintenance DB
    if args.create_target_db or args.drop_target_db:
        # Warning/confirm
        if not args.yes:
            print('\nAbout to modify target server:')
            if args.drop_target_db:
                print(' - Drop target database if exists: %s' % args.tgt_db)
            if args.create_target_db:
                print(' - Create target database if not present: %s' % args.tgt_db)
            ans = input('Proceed? [y/N]: ').strip().lower()
            if ans not in ('y', 'yes'):
                print('Aborted by user.')
                sys.exit(0)
        try:
            create_or_replace_database(args.tgt_host, args.tgt_port, args.tgt_user, args.tgt_password, args.tgt_db, drop=args.drop_target_db)
        except Exception as e:
            print('Failed to create/drop target DB:', e)
            sys.exit(3)

    # Re-check target connectivity (the target DB may be created now)
    ok_tgt = test_connection(args.tgt_host, args.tgt_port, args.tgt_user, args.tgt_password, args.tgt_db, role='target')
    if not ok_tgt:
        print('Cannot proceed: target unreachable.')
        sys.exit(4)

    # Confirm final action
    if not args.yes:
        print('\nAbout to copy database:')
        print(f"  {args.src_user}@{args.src_host}:{args.src_port}/{args.src_db} -> {args.tgt_user}@{args.tgt_host}:{args.tgt_port}/{args.tgt_db}")
        ans = input('Start copy? [y/N]: ').strip().lower()
        if ans not in ('y', 'yes'):
            print('Aborted by user.')
            sys.exit(0)

    start = time.time()
    ok = run_streaming_copy(args)
    elapsed = time.time() - start
    if ok:
        print(f'Completed in {elapsed:.1f}s')
        sys.exit(0)
    else:
        print('Copy failed.')
        sys.exit(5)


if __name__ == '__main__':
    main()
