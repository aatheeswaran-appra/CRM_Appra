from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.dates import month_range
from app.enums import LeadStatus
from app.metrics import percent_change
from app.models import Customer, FollowUp
from app.schemas import DashboardOut, DashboardStats
from app.serializers import customer_out, follow_up_out
from app.services.follow_ups import notification_summary, pending_overdue, pending_today


def dashboard(session: Session, now: datetime) -> DashboardOut:
    current = month_range(now)
    previous = month_range(now, -1)
    counts = session.execute(
        select(
            func.count(Customer.id),
            func.count(Customer.id).filter(
                Customer.created_at >= current.start, Customer.created_at < current.end
            ),
            func.count(Customer.id).filter(
                Customer.created_at >= previous.start, Customer.created_at < previous.end
            ),
            func.count(Customer.id).filter(Customer.status == LeadStatus.CLOSED),
            func.count(Customer.id).filter(
                Customer.status == LeadStatus.CLOSED,
                Customer.closed_at >= current.start,
                Customer.closed_at < current.end,
            ),
            func.count(Customer.id).filter(
                Customer.status == LeadStatus.CLOSED,
                Customer.closed_at >= previous.start,
                Customer.closed_at < previous.end,
            ),
        )
    ).one()
    notifications = notification_summary(session, now)
    recent = session.scalars(
        select(Customer).order_by(Customer.created_at.desc(), Customer.id.desc()).limit(5)
    ).all()
    today = session.scalars(
        select(FollowUp)
        .options(joinedload(FollowUp.customer))
        .where(*pending_today(now))
        .order_by(FollowUp.follow_up_at, FollowUp.id)
        .limit(5)
    ).all()
    overdue = session.scalars(
        select(FollowUp)
        .options(joinedload(FollowUp.customer))
        .where(*pending_overdue(now))
        .order_by(FollowUp.follow_up_at, FollowUp.id)
        .limit(5)
    ).all()
    return DashboardOut(
        stats=DashboardStats(
            total_customers=counts[0],
            total_customers_change=percent_change(counts[1], counts[2]),
            follow_ups_today=notifications.today,
            overdue_follow_ups=notifications.overdue,
            closed_customers=counts[3],
            closed_customers_change=percent_change(counts[4], counts[5]),
        ),
        recent_customers=[customer_out(row) for row in recent],
        today_follow_ups=[follow_up_out(row, now) for row in today],
        overdue_follow_ups=[follow_up_out(row, now) for row in overdue],
    )
