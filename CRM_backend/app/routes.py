import re
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Request, Response
from sqlalchemy import func, select

from app.auth import create_token, hash_password, verify_password
from app.database import NowDep, SessionDep
from app.models import LoginRecord, User
from app.schemas import (
    AuthOut,
    CalendarQuery,
    CustomerCreate,
    CustomerDetail,
    CustomerOut,
    CustomerQuery,
    CustomerUpdate,
    DashboardOut,
    DataResponse,
    DeletedResult,
    ErrorResponse,
    ExportQuery,
    FollowUpCreate,
    FollowUpOut,
    FollowUpQuery,
    FollowUpUpdate,
    HealthOut,
    ListResponse,
    LoginInput,
    LogoutOut,
    NotificationSummary,
    RangeQuery,
    ReportOut,
    ScheduleInput,
    SignupInput,
    UserOut,
)
from app.serializers import follow_up_out
from app.services import customers, dashboard, follow_ups, reports
from app.services.exports import export_report

router = APIRouter(
    prefix="/api",
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Invalid request, query parameters, range, or ID.",
        },
        404: {"model": ErrorResponse, "description": "Customer or follow-up not found."},
        409: {
            "model": ErrorResponse,
            "description": "Concurrent update conflict; retry the request.",
        },
        500: {
            "model": ErrorResponse,
            "description": "Unexpected server error; no private details exposed.",
        },
    },
)
RecordId = Annotated[
    str, Path(description="Positive 32-bit integer ID.", pattern=r"^[1-9]\d*$", examples=["1"])
]


def positive_id(value: str) -> int:
    if not re.fullmatch(r"[1-9]\d*", value) or len(value) > 10 or int(value) > 2147483647:
        raise HTTPException(400, "id must be a positive 32-bit integer.")
    return int(value)


@router.get("/health", tags=["System"], response_model=HealthOut, summary="Simple service health")
def health() -> HealthOut:
    return HealthOut()


@router.post(
    "/customers",
    tags=["Customers"],
    status_code=201,
    response_model=DataResponse[CustomerDetail],
    summary="Create a customer and initial follow-up atomically",
)
def create_customer(
    payload: CustomerCreate, session: SessionDep, now: NowDep
) -> DataResponse[CustomerDetail]:
    """All strings are trimmed. source defaults to OTHER, status to NEW and preferredContact to WHATSAPP.
    If either insert fails, neither record is saved. Phone is stored as a string."""
    return DataResponse(data=customers.create_customer(session, payload, now))


@router.get(
    "/customers",
    tags=["Customers"],
    response_model=ListResponse[CustomerOut],
    summary="Search and filter customers with pagination",
)
def list_customers(
    query: Annotated[CustomerQuery, Query()], session: SessionDep
) -> ListResponse[CustomerOut]:
    """Sort: createdAt descending, then id descending. Search matches name, phone or requirement."""
    return customers.list_customers(session, query)


@router.get(
    "/customers/{id}",
    tags=["Customers"],
    response_model=DataResponse[CustomerDetail],
    summary="Get a customer with all follow-ups",
)
def get_customer(id: RecordId, session: SessionDep, now: NowDep) -> DataResponse[CustomerDetail]:
    return DataResponse(data=customers.details(session, positive_id(id), now))


@router.patch(
    "/customers/{id}",
    tags=["Customers"],
    response_model=DataResponse[CustomerOut],
    summary="Update customer details or status",
)
def update_customer(
    id: RecordId, payload: CustomerUpdate, session: SessionDep, now: NowDep
) -> DataResponse[CustomerOut]:
    """Any valid status transition is allowed. Entering CLOSED sets closedAt; leaving it clears closedAt.
    Sending CLOSED again preserves the first closure time. Only location and notes accept null."""
    return DataResponse(data=customers.update_customer(session, positive_id(id), payload, now))


@router.delete(
    "/customers/{id}",
    tags=["Customers"],
    response_model=DataResponse[DeletedResult],
    summary="Delete a customer and cascade-delete its follow-ups",
)
def delete_customer(id: RecordId, session: SessionDep) -> DataResponse[DeletedResult]:
    return DataResponse(data=customers.delete_customer(session, positive_id(id)))


@router.post(
    "/follow-ups",
    tags=["Follow-ups"],
    status_code=201,
    response_model=DataResponse[FollowUpOut],
    summary="Schedule a follow-up for an existing customer",
)
def create_follow_up(
    payload: FollowUpCreate, session: SessionDep, now: NowDep
) -> DataResponse[FollowUpOut]:
    return DataResponse(data=follow_ups.create_follow_up(session, payload, now))


@router.get(
    "/follow-ups",
    tags=["Follow-ups"],
    response_model=ListResponse[FollowUpOut],
    summary="List, search and filter follow-ups",
)
def list_follow_ups(
    query: Annotated[FollowUpQuery, Query()], session: SessionDep, now: NowDep
) -> ListResponse[FollowUpOut]:
    """Sort: followUpAt ascending, then id ascending. Type filters require PENDING status.
    today is the full Asia/Kolkata day and includes today's already-overdue records.
    overdue is strictly before now; upcoming is strictly after now. Date ranges use inclusive business dates."""
    return follow_ups.list_follow_ups(session, query, now)


# Static paths must be registered before /follow-ups/{id}.
@router.get(
    "/follow-ups/calendar",
    tags=["Calendar"],
    response_model=DataResponse[list[FollowUpOut]],
    summary="Get all calendar entries for an inclusive date range",
)
def calendar(
    query: Annotated[CalendarQuery, Query()], session: SessionDep, now: NowDep
) -> DataResponse[list[FollowUpOut]]:
    """Includes PENDING and COMPLETED follow-ups. Unpaginated, with a maximum 366-day range."""
    return DataResponse(data=follow_ups.calendar(session, query, now))


@router.get(
    "/follow-ups/notification-summary",
    tags=["Follow-ups"],
    response_model=DataResponse[NotificationSummary],
    summary="Get calculated today and overdue badge counts",
)
def notifications(session: SessionDep, now: NowDep) -> DataResponse[NotificationSummary]:
    """total is today + overdue. These sets overlap for pending appointments earlier today."""
    return DataResponse(data=follow_ups.notification_summary(session, now))


@router.get(
    "/follow-ups/{id}",
    tags=["Follow-ups"],
    response_model=DataResponse[FollowUpOut],
    summary="Get follow-up details with customer contact data",
)
def get_follow_up(id: RecordId, session: SessionDep, now: NowDep) -> DataResponse[FollowUpOut]:
    return DataResponse(data=follow_up_out(follow_ups.get_follow_up(session, positive_id(id)), now))


@router.patch(
    "/follow-ups/{id}",
    tags=["Follow-ups"],
    response_model=DataResponse[FollowUpOut],
    summary="Edit follow-up notes, contact preference or schedule",
)
def update_follow_up(
    id: RecordId, payload: FollowUpUpdate, session: SessionDep, now: NowDep
) -> DataResponse[FollowUpOut]:
    """Provide date and time together to reschedule (same rules as /reschedule).
    Omitted fields remain unchanged; notes may be null. Use /complete to complete a follow-up."""
    return DataResponse(data=follow_ups.update_follow_up(session, positive_id(id), payload, now))


@router.delete(
    "/follow-ups/{id}",
    tags=["Follow-ups"],
    response_model=DataResponse[DeletedResult],
    summary="Delete one follow-up",
)
def delete_follow_up(id: RecordId, session: SessionDep) -> DataResponse[DeletedResult]:
    return DataResponse(data=follow_ups.delete_follow_up(session, positive_id(id)))


@router.patch(
    "/follow-ups/{id}/complete",
    tags=["Follow-ups"],
    response_model=DataResponse[FollowUpOut],
    summary="Mark a follow-up complete",
)
def complete_follow_up(id: RecordId, session: SessionDep, now: NowDep) -> DataResponse[FollowUpOut]:
    """No body required. Repeated completion is idempotent and preserves completedAt."""
    return DataResponse(data=follow_ups.complete_follow_up(session, positive_id(id), now))


@router.patch(
    "/follow-ups/{id}/reschedule",
    tags=["Follow-ups"],
    response_model=DataResponse[FollowUpOut],
    summary="Reschedule and increment rescheduleCount",
)
def reschedule_follow_up(
    id: RecordId, payload: ScheduleInput, session: SessionDep, now: NowDep
) -> DataResponse[FollowUpOut]:
    """Sets PENDING, clears completedAt, and atomically increments rescheduleCount.
    Completed follow-ups may be reopened this way. Retrying a successful reschedule increments again."""
    return DataResponse(
        data=follow_ups.reschedule_follow_up(session, positive_id(id), payload, now)
    )


@router.get(
    "/dashboard",
    tags=["Dashboard"],
    response_model=DataResponse[DashboardOut],
    summary="Get all dashboard cards and preview lists",
)
def get_dashboard(session: SessionDep, now: NowDep) -> DataResponse[DashboardOut]:
    """Live totals plus five recent customers, five today's pending follow-ups and five oldest overdue follow-ups.
    Percentage changes compare this calendar month with the previous full month.
    Zero-baseline convention: 0 to 0 = 0%, 0 to a positive count = 100%."""
    return DataResponse(data=dashboard.dashboard(session, now))


@router.get(
    "/reports",
    tags=["Reports"],
    response_model=DataResponse[ReportOut],
    summary="Generate report metrics and chart data",
)
def get_reports(
    query: Annotated[RangeQuery, Query()], session: SessionDep, now: NowDep
) -> DataResponse[ReportOut]:
    """Defaults to this calendar month. Full-month reports compare with the previous full month;
    other ranges compare with the immediately preceding equal number of days.
    Lead charts use customers created in the range. Conversion counts those same leads that are currently
    CLOSED with closedAt in the range. Completion counts completed due follow-ups divided by all due
    follow-ups in the range (future appointments excluded). Rate changes are percentage points.
    Performance counts are live except completionRate. See FRONTEND_API_GUIDE.md for all definitions."""
    return DataResponse(data=reports.reports(session, query, now))


@router.get(
    "/reports/export",
    tags=["Reports"],
    response_class=Response,
    summary="Download a report as CSV or XLSX",
    responses={
        200: {
            "description": "In-memory report download, with a Content-Disposition attachment filename.",
            "content": {
                "text/csv": {"schema": {"type": "string", "format": "binary"}},
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                    "schema": {"type": "string", "format": "binary"}
                },
            },
        },
    },
)
def download_report(
    query: Annotated[ExportQuery, Query()], session: SessionDep, now: NowDep
) -> Response:
    """Contains the selected report's period, summary, chart data, performance and highlights.
    Same range defaults as GET /reports. format defaults to csv. Nothing is persisted."""
    report = reports.reports(session, query, now)
    content, media_type, filename = export_report(report, query.format)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def user_out(user: User) -> UserOut:
    initials = "".join([part[0] for part in user.name.split()[:2]]).upper() or "U"
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        avatar_initials=initials,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.post(
    "/auth/login",
    tags=["Auth"],
    response_model=AuthOut,
    summary="Login user and record login timestamp",
)
def login(payload: LoginInput, request: Request, session: SessionDep, now: NowDep) -> AuthOut:
    email_clean = payload.email.strip().lower()
    user = session.scalar(select(User).where(func.lower(User.email) == email_clean))

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    if not user or not verify_password(user.password_hash, payload.password):
        login_log = LoginRecord(
            user_id=user.id if user else None,
            email=email_clean,
            status="FAILED",
            ip_address=ip,
            user_agent=user_agent,
            logged_in_at=now,
        )
        session.add(login_log)
        session.commit()
        raise HTTPException(400, "Invalid email or password.")

    user.last_login_at = now
    login_log = LoginRecord(
        user_id=user.id,
        email=email_clean,
        status="SUCCESS",
        ip_address=ip,
        user_agent=user_agent,
        logged_in_at=now,
    )
    session.add(login_log)
    session.commit()

    token = create_token()
    return AuthOut(user=user_out(user), token=token, message="Login successful")


@router.post(
    "/auth/signup",
    tags=["Auth"],
    status_code=201,
    response_model=AuthOut,
    summary="Register a new user and create initial login record",
)
def signup(payload: SignupInput, request: Request, session: SessionDep, now: NowDep) -> AuthOut:
    email_clean = payload.email.strip().lower()
    existing = session.scalar(select(User).where(func.lower(User.email) == email_clean))
    if existing:
        raise HTTPException(400, "An account with this email already exists.")

    new_user = User(
        name=payload.name.strip(),
        email=email_clean,
        phone=payload.phone.strip() or None,
        password_hash=hash_password(payload.password),
        role="Administrator",
        created_at=now,
        last_login_at=now,
    )
    session.add(new_user)
    session.flush()

    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    login_log = LoginRecord(
        user_id=new_user.id,
        email=email_clean,
        status="SUCCESS",
        ip_address=ip,
        user_agent=user_agent,
        logged_in_at=now,
    )
    session.add(login_log)
    session.commit()

    token = create_token()
    return AuthOut(user=user_out(new_user), token=token, message="Account created successfully")


@router.get(
    "/auth/me",
    tags=["Auth"],
    response_model=UserOut,
    summary="Get current user profile",
)
def get_me(session: SessionDep) -> UserOut:
    user = session.scalar(select(User).order_by(User.id.asc()))
    if not user:
        raise HTTPException(404, "No user profile found.")
    return user_out(user)


@router.post(
    "/auth/logout",
    tags=["Auth"],
    response_model=LogoutOut,
    summary="Logout current user",
)
def logout() -> LogoutOut:
    return LogoutOut(message="Logged out successfully")

