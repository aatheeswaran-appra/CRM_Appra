from datetime import UTC, datetime

from app.models import Customer, FollowUp
from app.schemas import CustomerDetail, CustomerOut, FollowUpOut


def customer_out(row: Customer) -> CustomerOut:
    result = CustomerOut.model_validate(row)
    # PostgreSQL sessions may use any timezone; JSON always returns UTC.
    result.created_at = result.created_at.astimezone(UTC)
    result.updated_at = result.updated_at.astimezone(UTC)
    if result.closed_at:
        result.closed_at = result.closed_at.astimezone(UTC)
    return result


def follow_up_out(row: FollowUp, now: datetime) -> FollowUpOut:
    return FollowUpOut(
        id=row.id,
        customer_id=row.customer_id,
        customer_name=row.customer.name,
        phone=row.customer.phone,
        requirement=row.customer.requirement,
        follow_up_at=row.follow_up_at.astimezone(UTC),
        preferred_contact=row.preferred_contact,
        status=row.status,
        notes=row.notes,
        reschedule_count=row.reschedule_count,
        completed_at=row.completed_at.astimezone(UTC) if row.completed_at else None,
        created_at=row.created_at.astimezone(UTC),
        updated_at=row.updated_at.astimezone(UTC),
        is_overdue=row.status == "PENDING" and row.follow_up_at < now,
    )


def customer_detail(row: Customer, now: datetime) -> CustomerDetail:
    return CustomerDetail(
        **customer_out(row).model_dump(),
        follow_ups=[
            follow_up_out(follow_up, now)
            for follow_up in sorted(row.follow_ups, key=lambda item: (item.follow_up_at, item.id))
        ],
    )
