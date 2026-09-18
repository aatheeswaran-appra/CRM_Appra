"""Export OpenAPI without connecting to a database."""

import json
from pathlib import Path

from pydantic import SecretStr

from app.config import Settings
from app.main import create_app

app = create_app(Settings(database_url=SecretStr("postgresql+psycopg://docs@localhost/docs")))
output = Path(__file__).resolve().parent.parent / "openapi.json"
output.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
app.state.engine.dispose()
print(f"Generated {output.name}")
