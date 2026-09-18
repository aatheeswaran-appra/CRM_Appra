"""Concrete Swagger examples for the independent frontend developer."""

from typing import Any

CUSTOMER = {
    "id": 8,
    "name": "Arun Kumar",
    "phone": "+919876543210",
    "requirement": "Website Development",
    "source": "WEBSITE",
    "location": "Coimbatore",
    "notes": "Interested in company website",
    "status": "NEW",
    "closedAt": None,
    "createdAt": "2026-09-18T04:00:00Z",
    "updatedAt": "2026-09-18T04:00:00Z",
}
FOLLOW_UP = {
    "id": 15,
    "customerId": 8,
    "customerName": "Arun Kumar",
    "phone": "+919876543210",
    "requirement": "Website Development",
    "followUpAt": "2026-09-20T05:00:00Z",
    "preferredContact": "WHATSAPP",
    "status": "PENDING",
    "notes": None,
    "rescheduleCount": 0,
    "completedAt": None,
    "createdAt": "2026-09-18T04:00:00Z",
    "updatedAt": "2026-09-18T04:00:00Z",
    "isOverdue": False,
}
CUSTOMER_DETAIL = {**CUSTOMER, "followUps": [FOLLOW_UP]}
PAGINATION = {"page": 1, "limit": 20, "total": 1, "totalPages": 1}
REPORT = {
    "period": {
        "from": "2026-09-01",
        "to": "2026-09-30",
        "timezone": "Asia/Kolkata",
        "comparisonFrom": "2026-08-01",
        "comparisonTo": "2026-08-31",
    },
    "summary": {
        "totalLeads": 4,
        "totalLeadsChange": 100,
        "interestedLeads": 2,
        "interestedLeadsChange": 100,
        "conversionRate": 25,
        "conversionRateChange": 25,
        "followUpCompletionRate": 50,
        "followUpCompletionRateChange": 25,
    },
    "leadGrowth": [
        {"label": f"Week {i + 1}", "count": count} for i, count in enumerate([1, 1, 2, 0, 0])
    ],
    "leadSources": [
        {"source": source, "count": count, "percentage": count * 25}
        for source, count in [
            ("WEBSITE", 2),
            ("WHATSAPP", 1),
            ("REFERRAL", 1),
            ("INSTAGRAM", 0),
            ("CALL", 0),
            ("OTHER", 0),
        ]
    ],
    "statusBreakdown": [
        {"status": status, "count": count}
        for status, count in [
            ("NEW", 1),
            ("CONTACTED", 0),
            ("INTERESTED", 2),
            ("FOLLOW_UP", 0),
            ("CLOSED", 1),
            ("NOT_INTERESTED", 0),
        ]
    ],
    "topRequirements": [
        {"requirement": "Website Development", "count": 2},
        {"requirement": "Digital Marketing", "count": 1},
        {"requirement": "SEO", "count": 1},
    ],
    "followUpPerformance": {
        "completedToday": 2,
        "upcoming": 1,
        "overdue": 5,
        "rescheduled": 2,
        "completionRate": 50,
    },
    "highlights": [
        {
            "metric": "conversionRate",
            "message": "Conversion rate is 25%; change +25 percentage points.",
            "current": 25,
            "previous": 0,
            "change": 25,
            "unit": "percentage_points",
        }
    ],
}
CREATE_CUSTOMER = {
    "name": "Arun Kumar",
    "phone": "+919876543210",
    "requirement": "Website Development",
    "source": "WEBSITE",
    "location": "Coimbatore",
    "notes": "Interested in company website",
    "followUp": {"date": "2026-09-20", "time": "10:30", "preferredContact": "WHATSAPP"},
}

SUCCESS_EXAMPLES: dict[tuple[str, str], dict[str, Any]] = {
    ("/api/health", "get"): {"status": "ok"},
    ("/api/customers", "post"): {"data": CUSTOMER_DETAIL},
    ("/api/customers", "get"): {"data": [CUSTOMER], "pagination": PAGINATION},
    ("/api/customers/{id}", "get"): {"data": CUSTOMER_DETAIL},
    ("/api/customers/{id}", "patch"): {
        "data": {**CUSTOMER, "status": "CLOSED", "closedAt": "2026-09-18T06:30:00Z"}
    },
    ("/api/customers/{id}", "delete"): {"data": {"id": 8, "deleted": True}},
    ("/api/follow-ups", "post"): {"data": FOLLOW_UP},
    ("/api/follow-ups", "get"): {"data": [FOLLOW_UP], "pagination": PAGINATION},
    ("/api/follow-ups/calendar", "get"): {"data": [FOLLOW_UP]},
    ("/api/follow-ups/notification-summary", "get"): {
        "data": {"today": 8, "overdue": 3, "total": 11}
    },
    ("/api/follow-ups/{id}", "get"): {"data": FOLLOW_UP},
    ("/api/follow-ups/{id}", "patch"): {
        "data": {**FOLLOW_UP, "notes": "Send proposal", "preferredContact": "CALL"}
    },
    ("/api/follow-ups/{id}", "delete"): {"data": {"id": 15, "deleted": True}},
    ("/api/follow-ups/{id}/complete", "patch"): {
        "data": {**FOLLOW_UP, "status": "COMPLETED", "completedAt": "2026-09-18T06:30:00Z"}
    },
    ("/api/follow-ups/{id}/reschedule", "patch"): {
        "data": {**FOLLOW_UP, "followUpAt": "2026-09-22T10:00:00Z", "rescheduleCount": 1}
    },
    ("/api/dashboard", "get"): {
        "data": {
            "stats": {
                "totalCustomers": 128,
                "totalCustomersChange": 12,
                "followUpsToday": 8,
                "overdueFollowUps": 3,
                "closedCustomers": 24,
                "closedCustomersChange": 8,
            },
            "recentCustomers": [CUSTOMER],
            "todayFollowUps": [{**FOLLOW_UP, "followUpAt": "2026-09-18T12:00:00Z"}],
            "overdueFollowUps": [
                {**FOLLOW_UP, "id": 14, "followUpAt": "2026-09-17T12:00:00Z", "isOverdue": True}
            ],
        }
    },
    ("/api/reports", "get"): {"data": REPORT},
}

REQUEST_EXAMPLES: dict[tuple[str, str], dict[str, Any]] = {
    ("/api/customers", "post"): CREATE_CUSTOMER,
    ("/api/customers/{id}", "patch"): {"status": "CLOSED", "notes": "Project confirmed"},
    ("/api/follow-ups", "post"): {
        "customerId": 8,
        "date": "2026-09-20",
        "time": "10:30",
        "preferredContact": "WHATSAPP",
    },
    ("/api/follow-ups/{id}", "patch"): {"notes": "Send proposal", "preferredContact": "CALL"},
    ("/api/follow-ups/{id}/reschedule", "patch"): {"date": "2026-09-22", "time": "15:30"},
}


def add_examples(schema: dict[str, Any]) -> None:
    for path, methods in schema["paths"].items():
        for method, operation in methods.items():
            if not isinstance(operation, dict):
                continue
            example = SUCCESS_EXAMPLES.get((path, method))
            if example is not None:
                code = "201" if method == "post" else "200"
                operation["responses"][code]["content"]["application/json"]["example"] = example
            request_example = REQUEST_EXAMPLES.get((path, method))
            if request_example is not None:
                operation["requestBody"]["content"]["application/json"]["example"] = request_example
            for code, label, message in [
                (
                    "400",
                    "Bad Request",
                    "Invalid request. Check fields, enums, IDs and date ranges.",
                ),
                ("404", "Not Found", "Customer or follow-up not found."),
                ("409", "Conflict", "The record changed concurrently. Please retry the operation."),
                ("500", "Internal Server Error", "An unexpected server error occurred."),
            ]:
                if code in operation["responses"]:
                    operation["responses"][code]["content"]["application/json"]["example"] = {
                        "statusCode": int(code),
                        "message": message,
                        "error": label,
                    }
