"""Timezone-independent business dates. Every range is [start, end) in UTC."""

import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException

BUSINESS_ZONE = ZoneInfo("Asia/Kolkata")
MAX_RANGE_DAYS = 366


def parse_date(value: object) -> date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use a real calendar date in YYYY-MM-DD format.")
    try:
        result = date.fromisoformat(value)
    except ValueError:
        raise ValueError("Use a real calendar date in YYYY-MM-DD format.") from None
    # Leave room for exclusive day/month upper bounds.
    if not 1900 <= result.year <= 9998:
        raise ValueError("Date year must be between 1900 and 9998.")
    return result


def parse_time(value: object) -> time:
    if not isinstance(value, str) or not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("Use 24-hour time in HH:mm format.")
    return time.fromisoformat(value)


def combine_date_time(day: date, clock: time) -> datetime:
    return datetime.combine(day, clock, tzinfo=BUSINESS_ZONE).astimezone(UTC)


def business_date(value: datetime) -> date:
    return value.astimezone(BUSINESS_ZONE).date()


@dataclass(frozen=True)
class DateRange:
    start: datetime
    end: datetime

    @property
    def from_date(self) -> date:
        return business_date(self.start)

    @property
    def to_date(self) -> date:
        return business_date(self.end - timedelta(microseconds=1))

    @property
    def days(self) -> int:
        return (self.to_date - self.from_date).days + 1


def day_range(day: date) -> DateRange:
    return DateRange(
        combine_date_time(day, time.min), combine_date_time(day + timedelta(days=1), time.min)
    )


def month_range(now: datetime, offset: int = 0) -> DateRange:
    day = business_date(now)
    year, month0 = divmod(day.year * 12 + day.month - 1 + offset, 12)
    start = date(year, month0 + 1, 1)
    end_year, end_month0 = divmod(year * 12 + month0 + 1, 12)
    return DateRange(
        combine_date_time(start, time.min),
        combine_date_time(date(end_year, end_month0 + 1, 1), time.min),
    )


def date_range(first: date, last: date) -> DateRange:
    days = (last - first).days + 1
    if days < 1:
        raise HTTPException(400, "from must be on or before to.")
    if days > MAX_RANGE_DAYS:
        raise HTTPException(400, f"Date ranges may not exceed {MAX_RANGE_DAYS} days.")
    return DateRange(day_range(first).start, day_range(last).end)


def report_range(first: date | None, last: date | None, now: datetime) -> DateRange:
    if (first is None) != (last is None):
        raise HTTPException(400, "Provide both from and to.")
    return date_range(first, last) if first is not None and last is not None else month_range(now)


def previous_range(period: DateRange) -> DateRange:
    if period.from_date.day == 1 and period == month_range(period.start):
        return month_range(period.start, -1)
    return DateRange(period.start - timedelta(days=period.days), period.start)
