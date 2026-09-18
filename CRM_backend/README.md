# Appra CRM ? Python backend

A backend-only CRM for the supplied Appra UI references. The implementation is entirely Python: FastAPI, Pydantic, SQLAlchemy, Alembic and PostgreSQL. There is no frontend, authentication, user/team model, messaging integration or file upload.

Only two business tables are stored: `customers` and `follow_ups`. PostgreSQL also contains Alembic's migration bookkeeping table, `alembic_version`. Dashboard, calendar, notifications and reports are calculated on request.

## Requirements

- Python 3.12 or newer (validated with Python 3.12)
- PostgreSQL 14 or newer
- A database account able to create tables and PostgreSQL enum types

Run the commands below from `CRM_Appra`.

## Install

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

macOS/Linux:

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements-dev.txt
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials. Do not overwrite an existing configured `.env`. To reproduce the exact tested environment, install `requirements.lock.txt` instead. For runtime dependencies only, use `requirements.txt`.

If PowerShell activation is unavailable, replace `python` in the commands with `.\.venv\Scripts\python.exe`; no execution-policy changes are needed.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL connection URL; required | None |
| PORT | Port for `python -m app` | 4000 |
| APP_ENV | development, test or production | development |
| CORS_ORIGIN | Comma-separated frontend origins, without trailing slashes | Empty: no cross-origin access |
| APP_TIMEZONE | Required business timezone | Asia/Kolkata |
| TEST_DATABASE_URL | Optional database used for integration-test schemas | DATABASE_URL |

Example:

```dotenv
DATABASE_URL="postgresql+psycopg://postgres:password@127.0.0.1:5432/crm"
PORT=4000
APP_ENV=development
CORS_ORIGIN=http://localhost:3000
APP_TIMEZONE=Asia/Kolkata
```

Both `postgresql://` and `postgresql+psycopg://` URLs are accepted. URL-encode special characters in database credentials. Configuration is read from environment variables and the project-root `.env`. Credentials are not committed or included in API errors.

## PostgreSQL and migrations

If the database does not already exist, connect as your PostgreSQL administrator and run:

```sql
CREATE DATABASE crm;
```

Then:

```sh
python -m alembic upgrade head
python -m alembic current
python -m alembic check
```

The initial migration creates native enums, timezone-aware timestamps, indexes, consistency checks and the cascade-delete foreign key. Tables are not created implicitly at API startup.

After a deliberate model change, create and inspect a migration:

```sh
python -m alembic revision --autogenerate -m "Describe schema change"
python -m alembic upgrade head
```

## Demo data

```sh
python -m app.seed
```

Creates 32 realistic demo customers and 32 follow-ups covering current/previous months, all sources/statuses, today, overdue, upcoming, completed and rescheduled records. The seed uses the current business date. Re-running skips matching demo name/phone pairs and does not clear or overwrite existing records.

## Run

From the parent CRM folder, use these PowerShell commands. They select the project interpreter explicitly; activation is not required:

```powershell
cd .\CRM_Appra
.\.venv\Scripts\python.exe -m app --reload
```

If your terminal is already inside CRM_Appra, run only the second command. Keep the terminal open; press Ctrl+C to stop.

With the virtual environment activated, the equivalent command is:

```sh
python -m app --reload
```

### Run from VS Code

The project includes interpreter settings and an **Appra CRM API** F5 debug configuration for both the parent CRM workspace and the CRM_Appra folder.

If VS Code has already selected another interpreter, use **Ctrl+Shift+P > Python: Select Interpreter > Enter interpreter path**, then choose **CRM_Appra/.venv/Scripts/python.exe**. Reload the VS Code window if import diagnostics persist.

You can also open app/__main__.py and choose **Run Python File**. Direct-file startup now selects the local virtual environment and launches the app as a package.

### Common startup errors

- **No module named app:** start from CRM_Appra with the explicit virtual-environment command above; direct execution of app/__main__.py is also supported.
- **No module named uvicorn/fastapi/sqlalchemy:** install dependencies with .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt.
- **WinError 10048 / address already in use:** an API instance is already using the configured port. Stop that instance before starting another, or set PORT to a free port in .env.
- **Database connection errors:** ensure PostgreSQL is running, check DATABASE_URL in .env, then run .\.venv\Scripts\python.exe -m alembic upgrade head.


- API: http://127.0.0.1:4000/api
- Swagger: http://127.0.0.1:4000/api/docs
- OpenAPI JSON: http://127.0.0.1:4000/api/openapi.json
- Health: http://127.0.0.1:4000/api/health

`python -m app` runs without reload. Its port comes from `PORT` and it binds to localhost. To explicitly select a production host and port:

```sh
python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port 4000
```

## Validation and build

```sh
python -m ruff check app migrations scripts tests
python -m ruff format --check app migrations scripts tests
python -m mypy app
python -m pytest
python -m compileall -q app migrations scripts
python scripts/generate_openapi.py
python -m build
python -m pip check
```

Unit tests can run without PostgreSQL:

```sh
python -m pytest -m "not integration"
```

Integration tests run the actual Alembic migration and create a random `appra_test_<uuid>` schema. Only that generated schema is truncated and removed; public CRM records remain untouched. Use `TEST_DATABASE_URL` if you prefer a dedicated database. The test role requires CREATE permission on that database.

The suite covers customer/follow-up CRUD, actual database rollback, cascade deletion, strict validation, search, pagination, completion/rescheduling, business-day boundaries, dashboard/report math, export contents and formula handling, repeatable seed data, schema drift, CORS, and the API contract.

`python -m build` produces Python source and wheel distributions in `dist/`. Database migrations and integration documentation are included in the source distribution. Apply migrations from the source project before starting the installed application.

## Frontend handoff

- [FRONTEND_API_GUIDE.md](FRONTEND_API_GUIDE.md): endpoint-to-screen mapping, payloads, query parameters, errors and metric definitions.
- [openapi.json](openapi.json): checked-in OpenAPI contract with concrete request/response examples.
- [UI_REQUIREMENTS.md](UI_REQUIREMENTS.md): mapping from the inspected reference images to stored and calculated data.
- Live Swagger at `/api/docs` allows each endpoint to be exercised.

## Layout

```text
app/
  main.py             FastAPI factory, CORS and OpenAPI
  routes.py           All REST endpoints
  schemas.py          Pydantic validation and response contracts
  models.py           Two SQLAlchemy models
  database.py         PostgreSQL engine and session lifecycle
  dates.py            Asia/Kolkata date utilities
  errors.py           Consistent sanitized errors
  services/           Customer, follow-up, dashboard, report and export logic
  seed.py             Repeatable demo records
migrations/           Alembic environment and initial migration
tests/                Unit and PostgreSQL integration tests
scripts/              OpenAPI and dependency-lock generation
```

All write operations commit atomically. Row locks protect status and reschedule updates. Read transactions use a consistent PostgreSQL snapshot; a conflicting concurrent write can return HTTP 409 and should be retried.

Reference documentation: [FastAPI query models](https://fastapi.tiangolo.com/tutorial/query-param-models/), [SQLAlchemy transactions](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html), [Pydantic validation](https://pydantic.dev/docs/validation/latest/concepts/validators/).
