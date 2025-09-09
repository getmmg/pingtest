Copy Postgres database by streaming pg_dump -> psql

Prerequisites
- Python 3.8+
- Postgres client tools (pg_dump, psql) available on PATH. On Windows you can install PostgreSQL and add the `bin` folder to PATH or use the "psqlODBC" or separate client bundle.
- Network access from your local machine to both source and target Postgres servers.

Install Python reqs (PowerShell):

```powershell
cd d:/MMG/javascript/dashboard/scripts
python -m venv .venv; .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Basic usage

```powershell
python copy_postgres.py \
  --src-host src.example.com --src-port 5432 --src-user srcuser --src-db sourcedb \
  --tgt-host tgt.example.com --tgt-port 5432 --tgt-user tgtuser --tgt-db targetdb \
  --create-target-db
```

Notes
- The script streams the dump; it does not save a local file unless you redirect.
- For large databases consider running pg_dump with compression (e.g., -Fc) and then restore with pg_restore, or use a network-friendly approach.
- Passwords are requested interactively if not provided; you can set `PGPASSWORD` env var for non-interactive runs.
- Dropping or creating a database requires superuser or suitable privileges.

Security
- Avoid embedding passwords on the command line (they may be visible to other users). Prefer environment variables or interactive prompts.
