import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


def test_health_swagger_and_openapi_contract(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/docs").status_code == 200
    schema = client.get("/api/openapi.json").json()
    operations = [
        operation
        for path in schema["paths"].values()
        for method, operation in path.items()
        if method in {"get", "post", "patch", "delete"}
    ]
    assert len(operations) == 18
    for operation in operations:
        assert operation["summary"]
        if operation["summary"] != "Download a report as CSV or XLSX":
            success = operation["responses"].get("201", operation["responses"].get("200"))
            assert "example" in success["content"]["application/json"]
        assert "422" not in operation["responses"]
        assert {"400", "404", "409", "500"} <= set(operation["responses"])
    customer_fields = schema["components"]["schemas"]["CustomerCreate"]["properties"]
    assert "followUp" in customer_fields and "follow_up" not in customer_fields
    calendar_parameters = schema["paths"]["/api/follow-ups/calendar"]["get"]["parameters"]
    assert {parameter["name"] for parameter in calendar_parameters} == {"from", "to"}


def test_configurable_cors(client: TestClient) -> None:
    allowed = client.options(
        "/api/customers",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    forbidden = client.options(
        "/api/customers",
        headers={"Origin": "https://unapproved.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in forbidden.headers
    download = client.get("/api/reports/export", headers={"Origin": "http://localhost:3000"})
    assert download.headers["access-control-expose-headers"] == "Content-Disposition"


def test_malformed_json_returns_documented_error(client: TestClient) -> None:
    response = client.post(
        "/api/customers", content='{"name":', headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert set(response.json()) == {"statusCode", "message", "error"}
