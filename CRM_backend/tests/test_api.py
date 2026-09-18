from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, event, func, select
from sqlalchemy.orm import Session

from app.database import utc_now
from app.enums import FollowUpStatus
from app.models import Customer, FollowUp
from tests.conftest import NOW

pytestmark = pytest.mark.integration


def create(client: TestClient, payload: dict[str, object]) -> dict[str, object]:
    response = client.post("/api/customers", json=payload)
    assert response.status_code == 201, response.text
    return response.json()["data"]


def test_customer_create_update_status_and_cascade(
    client: TestClient, payload: dict[str, object], engine: Engine
) -> None:
    customer = create(client, payload)
    assert customer["name"] == "Arun Kumar"
    assert customer["phone"] == "09876543210"
    assert customer["requirement"] == "Website Development"
    assert customer["status"] == "NEW"
    initial = customer["followUps"][0]
    assert initial["followUpAt"] == "2026-09-18T05:00:00Z"
    assert initial["isOverdue"] is True
    url = f"/api/customers/{customer['id']}"
    assert client.get(url).json()["data"]["followUps"][0]["customerName"] == "Arun Kumar"
    closed = client.patch(url, json={"status": "CLOSED"}).json()["data"]
    assert closed["closedAt"] == NOW.isoformat().replace("+00:00", "Z")
    client.app.dependency_overrides[utc_now] = lambda: NOW + timedelta(hours=1)
    assert (
        client.patch(url, json={"status": "CLOSED", "name": "Arun Updated"}).json()["data"][
            "closedAt"
        ]
        == closed["closedAt"]
    )
    opened = client.patch(url, json={"status": "INTERESTED", "notes": None}).json()["data"]
    assert opened["closedAt"] is None and opened["notes"] is None
    assert (
        client.get(f"/api/follow-ups/{initial['id']}").json()["data"]["customerName"]
        == "Arun Updated"
    )
    assert client.delete(url).json()["data"] == {"id": customer["id"], "deleted": True}
    assert client.get(url).status_code == 404
    assert client.get(f"/api/follow-ups/{initial['id']}").status_code == 404
    with Session(engine) as session:
        assert session.scalar(select(func.count(FollowUp.id))) == 0


def test_transaction_rolls_back_when_follow_up_insert_fails(
    client: TestClient, payload: dict[str, object], engine: Engine
) -> None:
    def fail_insert(_mapper: object, _connection: object, target: FollowUp) -> None:
        target.reschedule_count = -1  # Real PostgreSQL CHECK failure, after the customer insert.

    event.listen(FollowUp, "before_insert", fail_insert)
    try:
        response = client.post("/api/customers", json=payload)
    finally:
        event.remove(FollowUp, "before_insert", fail_insert)
    assert response.status_code == 500
    assert response.json() == {
        "statusCode": 500,
        "message": "An unexpected server error occurred.",
        "error": "Internal Server Error",
    }
    with Session(engine) as session:
        assert session.scalar(select(func.count(Customer.id))) == 0
        assert session.scalar(select(func.count(FollowUp.id))) == 0


def test_search_filters_pagination_and_literal_wildcards(
    client: TestClient, payload: dict[str, object]
) -> None:
    create(client, payload)
    create(
        client,
        {
            **payload,
            "name": "Priya",
            "phone": "+919111111111",
            "source": "WHATSAPP",
            "status": "INTERESTED",
            "requirement": "100% Marketing",
        },
    )
    create(
        client,
        {
            **payload,
            "name": "Vignesh",
            "phone": "+919222222222",
            "source": "REFERRAL",
            "requirement": "Mobile App",
        },
    )
    assert client.get("/api/customers?search=aRuN").json()["pagination"]["total"] == 1
    assert client.get("/api/customers?search=987654").json()["pagination"]["total"] == 1
    assert client.get("/api/customers?search=WEBSITE").json()["pagination"]["total"] == 1
    assert client.get("/api/customers", params={"search": "%"}).json()["pagination"]["total"] == 1
    filtered = client.get(
        "/api/customers?source=WHATSAPP&status=INTERESTED&search=marketing"
    ).json()
    assert filtered["pagination"]["total"] == 1
    page = client.get("/api/customers?page=2&limit=2").json()
    assert len(page["data"]) == 1
    assert page["pagination"] == {"page": 2, "limit": 2, "total": 3, "totalPages": 2}
    assert client.get("/api/customers?page=20").json()["data"] == []


def test_follow_up_crud_complete_and_reschedule(
    client: TestClient, payload: dict[str, object]
) -> None:
    customer = create(client, payload)
    response = client.post(
        "/api/follow-ups",
        json={
            "customerId": customer["id"],
            "date": "2026-09-19",
            "time": "15:30",
            "preferredContact": "CALL",
            "notes": " Call after lunch ",
        },
    )
    assert response.status_code == 201, response.text
    row = response.json()["data"]
    url = f"/api/follow-ups/{row['id']}"
    assert row["phone"] == "09876543210" and row["notes"] == "Call after lunch"
    completed = client.patch(url + "/complete").json()["data"]
    assert completed["status"] == "COMPLETED" and completed["completedAt"] is not None
    client.app.dependency_overrides[utc_now] = lambda: NOW + timedelta(hours=1)
    assert client.patch(url + "/complete").json()["data"]["completedAt"] == completed["completedAt"]
    rescheduled = client.patch(
        url + "/reschedule", json={"date": "2026-09-22", "time": "15:30"}
    ).json()["data"]
    assert rescheduled["status"] == "PENDING" and rescheduled["completedAt"] is None
    assert rescheduled["rescheduleCount"] == 1
    assert rescheduled["followUpAt"] == "2026-09-22T10:00:00Z"
    updated = client.patch(
        url,
        json={"date": "2026-09-23", "time": "11:00", "preferredContact": "EITHER", "notes": None},
    ).json()["data"]
    assert (
        updated["rescheduleCount"] == 2
        and updated["preferredContact"] == "EITHER"
        and updated["notes"] is None
    )
    assert client.delete(url).status_code == 200
    assert client.get(url).status_code == 404
    assert client.get(f"/api/customers/{customer['id']}").status_code == 200


def test_today_overdue_upcoming_calendar_and_badges(
    client: TestClient, payload: dict[str, object], engine: Engine
) -> None:
    customer = create(client, payload)
    with Session(engine) as session, session.begin():
        original = session.get(FollowUp, customer["followUps"][0]["id"])
        original.follow_up_at = NOW.replace(hour=0, minute=0)  # Today, overdue.
        for when, status in [
            (
                NOW.replace(hour=0, minute=0) - timedelta(hours=5, minutes=30),
                FollowUpStatus.PENDING,
            ),  # Today's 00:00 IST.
            (
                NOW.replace(hour=0, minute=0) - timedelta(hours=5, minutes=30, microseconds=1),
                FollowUpStatus.PENDING,
            ),
            (NOW, FollowUpStatus.PENDING),
            (NOW + timedelta(hours=2), FollowUpStatus.PENDING),
            (NOW.replace(hour=18, minute=30), FollowUpStatus.PENDING),  # Next day's 00:00 IST.
            (NOW - timedelta(hours=1), FollowUpStatus.COMPLETED),
        ]:
            session.add(
                FollowUp(
                    customer_id=customer["id"],
                    follow_up_at=when,
                    preferred_contact="CALL",
                    status=status,
                    completed_at=NOW if status == FollowUpStatus.COMPLETED else None,
                )
            )
    today = client.get("/api/follow-ups?type=today").json()
    overdue = client.get("/api/follow-ups?type=overdue").json()
    upcoming = client.get("/api/follow-ups?type=upcoming").json()
    assert today["pagination"]["total"] == 4
    assert overdue["pagination"]["total"] == 3
    assert upcoming["pagination"]["total"] == 2
    assert [row["followUpAt"] for row in today["data"]] == sorted(
        row["followUpAt"] for row in today["data"]
    )
    calendar = client.get("/api/follow-ups/calendar?from=2026-09-18&to=2026-09-18")
    assert calendar.status_code == 200, calendar.text
    assert len(calendar.json()["data"]) == 5
    assert client.get("/api/follow-ups?date=2026-09-18").json()["pagination"]["total"] == 5
    assert (
        client.get("/api/follow-ups?from=2026-09-18&to=2026-09-18").json()["pagination"]["total"]
        == 5
    )
    assert client.get("/api/follow-ups/notification-summary").json()["data"] == {
        "today": 4,
        "overdue": 3,
        "total": 7,
    }


@pytest.mark.parametrize(
    "path",
    [
        "/api/customers/abc",
        "/api/customers/0",
        "/api/customers/-1",
        "/api/customers/1.0",
        "/api/customers/2147483648",
        "/api/follow-ups/0",
        "/api/customers?page=0",
        "/api/customers?limit=101",
        "/api/customers?page=1.0",
        "/api/customers?status=UNKNOWN",
        "/api/customers?source=CALLING",
        "/api/customers?unknown=true",
        "/api/follow-ups?type=overdue&status=COMPLETED",
        "/api/follow-ups?type=today&date=2026-09-18",
        "/api/follow-ups?date=2026-02-29",
        "/api/follow-ups?from=2026-09-01",
        "/api/follow-ups?from=2026-09-20&to=2026-09-01",
        "/api/follow-ups/calendar",
        "/api/follow-ups/calendar?from=2024-01-01&to=2026-01-01",
        "/api/reports?to=2026-09-30",
        "/api/reports/export?format=pdf",
    ],
)
def test_invalid_queries_and_ids_return_400(client: TestClient, path: str) -> None:
    response = client.get(path)
    assert response.status_code == 400, response.text
    assert response.json()["error"] == "Bad Request"


@pytest.mark.parametrize(
    "change",
    [
        {"name": " "},
        {"phone": 9876543210},
        {"phone": "not-a-phone"},
        {"requirement": None},
        {"source": None},
        {"followUp": None},
        {"followUp": {}},
        {"followUp": {"date": "2026-04-31", "time": "09:00"}},
        {"followUp": {"date": "2026-09-18", "time": "24:00"}},
        {"name": "bad\x00name"},
        {"role": "admin"},
    ],
)
def test_invalid_customer_bodies(
    client: TestClient, payload: dict[str, object], change: dict[str, object]
) -> None:
    response = client.post("/api/customers", json={**payload, **change})
    assert response.status_code == 400, response.text


def test_not_found_and_invalid_updates(client: TestClient, payload: dict[str, object]) -> None:
    customer = create(client, payload)
    for path in ["/api/customers/999999", "/api/follow-ups/999999"]:
        assert client.get(path).status_code == 404
        assert client.delete(path).status_code == 404
    assert (
        client.post(
            "/api/follow-ups", json={"customerId": 999999, "date": "2026-09-20", "time": "09:00"}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/follow-ups", json={"customerId": True, "date": "2026-09-20", "time": "09:00"}
        ).status_code
        == 400
    )
    assert client.patch(f"/api/customers/{customer['id']}", json={}).status_code == 400
    assert client.patch(f"/api/customers/{customer['id']}", json={"name": None}).status_code == 400
    follow_up_id = customer["followUps"][0]["id"]
    assert (
        client.patch(f"/api/follow-ups/{follow_up_id}", json={"date": "2026-09-20"}).status_code
        == 400
    )
    assert (
        client.patch(f"/api/follow-ups/{follow_up_id}", json={"status": "OVERDUE"}).status_code
        == 400
    )
    assert (
        client.patch(
            f"/api/follow-ups/{follow_up_id}/reschedule", json={"date": None, "time": "09:00"}
        ).status_code
        == 400
    )


def test_defaults_and_closed_creation(client: TestClient, payload: dict[str, object]) -> None:
    minimal = {
        "name": "Abi",
        "phone": "9000012345",
        "requirement": "Branding",
        "followUp": {"date": "2026-09-20", "time": "10:00"},
    }
    row = create(client, minimal)
    assert row["source"] == "OTHER"
    assert row["followUps"][0]["preferredContact"] == "WHATSAPP"
    closed = create(client, {**payload, "status": "CLOSED"})
    assert closed["closedAt"] == "2026-09-18T06:30:00Z"
