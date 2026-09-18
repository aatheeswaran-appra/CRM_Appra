from datetime import datetime
from math import ceil

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.sql.elements import ColumnElement

from app.dates import business_date, combine_date_time, date_range, day_range
from app.enums import FollowUpStatus, FollowUpType
from app.models import Customer, FollowUp
from app.schemas import (
    CalendarQuery,
    DeletedResult,
    FollowUpCreate,
    FollowUpOut,
    FollowUpQuery,
    FollowUpUpdate,
    ListResponse,
    NotificationSummary,
    Pagination,
    ScheduleInput,
)
from app.serializers import follow_up_out
from app.services.customers import get_customer, search_conditions


def pending_today(now: datetime) -> list[ColumnElement[bool]]:
    period = day_range(business_date(now))
    return [
        FollowUp.status == FollowUpStatus.PENDING,
        FollowUp.follow_up_at >= period.start,
        FollowUp.follow_up_at < period.end,
    ]


def pending_overdue(now: datetime) -> list[ColumnElement[bool]]:
    return [FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_at < now]


def pending_upcoming(now: datetime) -> list[ColumnElement[bool]]:
    return [FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_at > now]


def get_follow_up(session: Session, follow_up_id: int, *, lock: bool = False) -> FollowUp:
    query = (
        select(FollowUp).where(FollowUp.id == follow_up_id).options(joinedload(FollowUp.customer))
    )
    if lock:
        query = query.with_for_update(of=FollowUp)
    row = session.scalar(query)
    if row is None:
        raise HTTPException(404, "Follow-up not found.")
    return row


def create_follow_up(session: Session, payload: FollowUpCreate, now: datetime) -> FollowUpOut:
    with session.begin():
        customer = get_customer(session, payload.customer_id)
        row = FollowUp(
            customer=customer,
            follow_up_at=combine_date_time(payload.date, payload.time),
            preferred_contact=payload.preferred_contact,
            notes=payload.notes,
        )
        session.add(row)
        session.flush()
        result = follow_up_out(row, now)
    return result


def conditions_for(query: FollowUpQuery, now: datetime) -> list[ColumnElement[bool]]:
    conditions: list[ColumnElement[bool]] = []
    if query.type == FollowUpType.TODAY:
        conditions.extend(pending_today(now))
    elif query.type == FollowUpType.OVERDUE:
        conditions.extend(pending_overdue(now))
    elif query.type == FollowUpType.UPCOMING:
        conditions.extend(pending_upcoming(now))
    if query.status:
        conditions.append(FollowUp.status == query.status)
    if query.customer_id:
        conditions.append(FollowUp.customer_id == query.customer_id)
    if query.search:
        conditions.append(search_conditions(query.search))
    period = (
        day_range(query.date)
        if query.date
        else (date_range(query.from_date, query.to) if query.from_date and query.to else None)
    )
    if period:
        conditions.extend(
            [FollowUp.follow_up_at >= period.start, FollowUp.follow_up_at < period.end]
        )
    return conditions


def list_follow_ups(
    session: Session, query: FollowUpQuery, now: datetime
) -> ListResponse[FollowUpOut]:
    conditions = conditions_for(query, now)
    total = session.scalar(select(func.count(FollowUp.id)).join(Customer).where(*conditions)) or 0
    rows = session.scalars(
        select(FollowUp)
        .join(Customer)
        .options(joinedload(FollowUp.customer))
        .where(*conditions)
        .order_by(FollowUp.follow_up_at, FollowUp.id)
        .offset((query.page - 1) * query.limit)
        .limit(query.limit)
    ).all()
    return ListResponse(
        data=[follow_up_out(row, now) for row in rows],
        pagination=Pagination(
            page=query.page, limit=query.limit, total=total, total_pages=ceil(total / query.limit)
        ),
    )


def calendar(session: Session, query: CalendarQuery, now: datetime) -> list[FollowUpOut]:
    period = date_range(query.from_date, query.to)
    rows = session.scalars(
        select(FollowUp)
        .options(joinedload(FollowUp.customer))
        .where(FollowUp.follow_up_at >= period.start, FollowUp.follow_up_at < period.end)
        .order_by(FollowUp.follow_up_at, FollowUp.id)
    ).all()
    return [follow_up_out(row, now) for row in rows]


def notification_summary(session: Session, now: datetime) -> NotificationSummary:
    today = session.scalar(select(func.count(FollowUp.id)).where(*pending_today(now))) or 0
    overdue = session.scalar(select(func.count(FollowUp.id)).where(*pending_overdue(now))) or 0
    return NotificationSummary(today=today, overdue=overdue, total=today + overdue)


def complete_follow_up(session: Session, follow_up_id: int, now: datetime) -> FollowUpOut:
    with session.begin():
        row = get_follow_up(session, follow_up_id, lock=True)
        if row.status != FollowUpStatus.COMPLETED:
            row.status = FollowUpStatus.COMPLETED
            row.completed_at = now
        session.flush()
        result = follow_up_out(row, now)
    return result


def apply_schedule(row: FollowUp, schedule: ScheduleInput | FollowUpUpdate) -> None:
    assert schedule.date is not None and schedule.time is not None
    row.follow_up_at = combine_date_time(schedule.date, schedule.time)
    row.status = FollowUpStatus.PENDING
    row.completed_at = None
    row.reschedule_count += 1


def reschedule_follow_up(
    session: Session, follow_up_id: int, payload: ScheduleInput, now: datetime
) -> FollowUpOut:
    with session.begin():
        row = get_follow_up(session, follow_up_id, lock=True)
        apply_schedule(row, payload)
        session.flush()
        result = follow_up_out(row, now)
    return result


def update_follow_up(
    session: Session, follow_up_id: int, payload: FollowUpUpdate, now: datetime
) -> FollowUpOut:
    with session.begin():
        row = get_follow_up(session, follow_up_id, lock=True)
        if payload.date is not None:
            apply_schedule(row, payload)
        if payload.preferred_contact is not None:
            row.preferred_contact = payload.preferred_contact
        if "notes" in payload.model_fields_set:
            row.notes = payload.notes
        session.flush()
        result = follow_up_out(row, now)
    return result


def delete_follow_up(session: Session, follow_up_id: int) -> DeletedResult:
    with session.begin():
        row = get_follow_up(session, follow_up_id, lock=True)
        session.delete(row)
        session.flush()
    return DeletedResult(id=follow_up_id)
