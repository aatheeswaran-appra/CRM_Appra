from dataclasses import dataclass
from datetime import date, datetime
from math import ceil

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dates import (
    BUSINESS_ZONE,
    DateRange,
    business_date,
    day_range,
    previous_range,
    report_range,
)
from app.enums import FollowUpStatus, LeadSource, LeadStatus
from app.metrics import percent_change, rate, rounded
from app.models import Customer, FollowUp
from app.schemas import (
    FollowUpPerformance,
    GrowthBucket,
    RangeQuery,
    ReportHighlight,
    ReportOut,
    ReportPeriod,
    ReportSummary,
    RequirementCount,
    SourceCount,
    StatusCount,
)


@dataclass
class PeriodMetrics:
    total: int
    interested: int
    closed: int
    due: int
    completed: int

    @property
    def conversion(self) -> float:
        return rate(self.closed, self.total)

    @property
    def completion(self) -> float:
        return rate(self.completed, self.due)


def period_metrics(session: Session, period: DateRange, now: datetime) -> PeriodMetrics:
    leads = session.execute(
        select(
            func.count(Customer.id),
            func.count(Customer.id).filter(Customer.status == LeadStatus.INTERESTED),
            func.count(Customer.id).filter(
                Customer.status == LeadStatus.CLOSED,
                Customer.closed_at >= period.start,
                Customer.closed_at < period.end,
            ),
        ).where(Customer.created_at >= period.start, Customer.created_at < period.end)
    ).one()
    # Future scheduled follow-ups are excluded from both numerator and denominator.
    follow_ups = session.execute(
        select(
            func.count(FollowUp.id),
            func.count(FollowUp.id).filter(
                FollowUp.status == FollowUpStatus.COMPLETED, FollowUp.completed_at <= now
            ),
        ).where(
            FollowUp.follow_up_at >= period.start,
            FollowUp.follow_up_at < period.end,
            FollowUp.follow_up_at <= now,
        )
    ).one()
    return PeriodMetrics(leads[0], leads[1], leads[2], follow_ups[0], follow_ups[1])


def requirement_counts(
    session: Session, period: DateRange, limit: int | None = None
) -> list[RequirementCount]:
    query = (
        select(Customer.requirement, func.count(Customer.id).label("count"))
        .where(
            Customer.created_at >= period.start,
            Customer.created_at < period.end,
        )
        .group_by(Customer.requirement)
        .order_by(func.count(Customer.id).desc(), Customer.requirement)
    )
    if limit is not None:
        query = query.limit(limit)
    return [
        RequirementCount(requirement=name, count=count) for name, count in session.execute(query)
    ]


def performance(session: Session, now: datetime, completion: float) -> FollowUpPerformance:
    today = day_range(business_date(now))
    counts = session.execute(
        select(
            func.count(FollowUp.id).filter(
                FollowUp.status == FollowUpStatus.COMPLETED,
                FollowUp.completed_at >= today.start,
                FollowUp.completed_at < today.end,
            ),
            func.count(FollowUp.id).filter(
                FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_at > now
            ),
            func.count(FollowUp.id).filter(
                FollowUp.status == FollowUpStatus.PENDING, FollowUp.follow_up_at < now
            ),
            func.count(FollowUp.id).filter(FollowUp.reschedule_count > 0),
        )
    ).one()
    return FollowUpPerformance(
        completed_today=counts[0],
        upcoming=counts[1],
        overdue=counts[2],
        rescheduled=counts[3],
        completion_rate=completion,
    )


def highlights(
    current: PeriodMetrics,
    previous: PeriodMetrics,
    top: list[RequirementCount],
    previous_top: dict[str, int],
) -> list[ReportHighlight]:
    result: list[ReportHighlight] = []
    if top:
        item = top[0]
        old = previous_top.get(item.requirement, 0)
        change = percent_change(item.count, old)
        description = (
            f"{item.requirement}: {item.count} leads versus {old} in the comparison period."
        )
        if old:
            description += f" Change: {change:+g}%."
        else:
            description += " No previous-period leads; the display change convention is 100%."
        result.append(
            ReportHighlight(
                metric="topRequirement",
                message=description,
                current=item.count,
                previous=old,
                change=change,
                unit="percent",
            )
        )
    if current.total or previous.total:
        delta = rounded(current.conversion - previous.conversion)
        result.append(
            ReportHighlight(
                metric="conversionRate",
                message=f"Conversion rate is {current.conversion:g}%; change {delta:+g} percentage points.",
                current=current.conversion,
                previous=previous.conversion,
                change=delta,
                unit="percentage_points",
            )
        )
    if current.due or previous.due:
        delta = rounded(current.completion - previous.completion)
        result.append(
            ReportHighlight(
                metric="followUpCompletionRate",
                message=f"Due follow-up completion is {current.completion:g}%; change {delta:+g} percentage points.",
                current=current.completion,
                previous=previous.completion,
                change=delta,
                unit="percentage_points",
            )
        )
    return result


def reports(session: Session, query: RangeQuery, now: datetime) -> ReportOut:
    period = report_range(query.from_date, query.to, now)
    comparison = previous_range(period)
    current = period_metrics(session, period, now)
    previous = period_metrics(session, comparison, now)
    created_in_range = [Customer.created_at >= period.start, Customer.created_at < period.end]
    sources = {
        key: count
        for key, count in session.execute(
            select(Customer.source, func.count(Customer.id))
            .where(*created_in_range)
            .group_by(Customer.source)
        ).all()
    }
    statuses = {
        key: count
        for key, count in session.execute(
            select(Customer.status, func.count(Customer.id))
            .where(*created_in_range)
            .group_by(Customer.status)
        ).all()
    }

    # Aggregate in PostgreSQL by business date, then place at most 366 daily counts into weekly buckets.
    business_day = func.date(func.timezone(BUSINESS_ZONE.key, Customer.created_at))
    growth = [
        GrowthBucket(label=f"Week {index + 1}", count=0) for index in range(ceil(period.days / 7))
    ]
    for day_value, count in session.execute(
        select(business_day, func.count(Customer.id))
        .where(*created_in_range)
        .group_by(business_day)
    ):
        day: date = day_value
        growth[(day - period.from_date).days // 7].count += count

    top = requirement_counts(session, period, 6)
    previous_top = {
        item.requirement: item.count for item in requirement_counts(session, comparison)
    }
    return ReportOut(
        period=ReportPeriod(
            from_date=period.from_date,
            to=period.to_date,
            comparison_from=comparison.from_date,
            comparison_to=comparison.to_date,
        ),
        summary=ReportSummary(
            total_leads=current.total,
            total_leads_change=percent_change(current.total, previous.total),
            interested_leads=current.interested,
            interested_leads_change=percent_change(current.interested, previous.interested),
            conversion_rate=current.conversion,
            conversion_rate_change=rounded(current.conversion - previous.conversion),
            follow_up_completion_rate=current.completion,
            follow_up_completion_rate_change=rounded(current.completion - previous.completion),
        ),
        lead_growth=growth,
        lead_sources=[
            SourceCount(
                source=source,
                count=sources.get(source, 0),
                percentage=rate(sources.get(source, 0), current.total),
            )
            for source in LeadSource
        ],
        status_breakdown=[
            StatusCount(status=status, count=statuses.get(status, 0)) for status in LeadStatus
        ],
        top_requirements=top,
        follow_up_performance=performance(session, now, current.completion),
        highlights=highlights(current, previous, top, previous_top),
    )
