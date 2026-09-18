from datetime import datetime
from math import ceil

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.dates import combine_date_time
from app.enums import LeadStatus
from app.models import Customer, FollowUp
from app.schemas import (
    CustomerCreate,
    CustomerDetail,
    CustomerOut,
    CustomerQuery,
    CustomerUpdate,
    DeletedResult,
    ListResponse,
    Pagination,
)
from app.serializers import customer_detail, customer_out


def search_conditions(search: str) -> ColumnElement[bool]:
    return or_(
        Customer.name.icontains(search, autoescape=True),
        Customer.phone.icontains(search, autoescape=True),
        Customer.requirement.icontains(search, autoescape=True),
    )


def get_customer(session: Session, customer_id: int, *, lock: bool = False) -> Customer:
    query = select(Customer).where(Customer.id == customer_id)
    if lock:
        query = query.with_for_update()
    row = session.scalar(query)
    if row is None:
        raise HTTPException(404, "Customer not found.")
    return row


def create_customer(session: Session, payload: CustomerCreate, now: datetime) -> CustomerDetail:
    with session.begin():
        customer = Customer(**payload.model_dump(exclude={"follow_up"}))
        customer.closed_at = now if payload.status == LeadStatus.CLOSED else None
        follow_up = payload.follow_up
        customer.follow_ups.append(
            FollowUp(
                follow_up_at=combine_date_time(follow_up.date, follow_up.time),
                preferred_contact=follow_up.preferred_contact,
                notes=follow_up.notes,
            )
        )
        session.add(customer)
        session.flush()  # Both inserts succeed, or the transaction rolls back completely.
        result = customer_detail(customer, now)
    return result


def list_customers(session: Session, query: CustomerQuery) -> ListResponse[CustomerOut]:
    conditions: list[ColumnElement[bool]] = []
    if query.search:
        conditions.append(search_conditions(query.search))
    if query.status:
        conditions.append(Customer.status == query.status)
    if query.source:
        conditions.append(Customer.source == query.source)
    total = session.scalar(select(func.count(Customer.id)).where(*conditions)) or 0
    rows = session.scalars(
        select(Customer)
        .where(*conditions)
        .order_by(Customer.created_at.desc(), Customer.id.desc())
        .offset((query.page - 1) * query.limit)
        .limit(query.limit)
    ).all()
    return ListResponse(
        data=[customer_out(row) for row in rows],
        pagination=Pagination(
            page=query.page, limit=query.limit, total=total, total_pages=ceil(total / query.limit)
        ),
    )


def details(session: Session, customer_id: int, now: datetime) -> CustomerDetail:
    row = session.scalar(
        select(Customer)
        .where(Customer.id == customer_id)
        .options(selectinload(Customer.follow_ups))
    )
    if row is None:
        raise HTTPException(404, "Customer not found.")
    return customer_detail(row, now)


def update_customer(
    session: Session, customer_id: int, payload: CustomerUpdate, now: datetime
) -> CustomerOut:
    with session.begin():
        row = get_customer(session, customer_id, lock=True)
        if payload.status is not None and payload.status != row.status:
            row.closed_at = now if payload.status == LeadStatus.CLOSED else None
        for name, value in payload.model_dump(exclude_unset=True).items():
            setattr(row, name, value)
        session.flush()
        result = customer_out(row)
    return result


def delete_customer(session: Session, customer_id: int) -> DeletedResult:
    with session.begin():
        row = get_customer(session, customer_id, lock=True)
        session.delete(row)
        session.flush()
    return DeletedResult(id=customer_id)
