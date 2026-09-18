from datetime import UTC, date, datetime, time

import pytest
from fastapi import HTTPException

from app.dates import (
    business_date,
    combine_date_time,
    date_range,
    day_range,
    month_range,
    parse_date,
    parse_time,
    previous_range,
)
from app.metrics import percent_change, rate


def test_kolkata_midnight_and_month_boundaries() -> None:
    result = day_range(date(2026, 9, 18))
    assert result.start.isoformat() == "2026-09-17T18:30:00+00:00"
    assert result.end.isoformat() == "2026-09-18T18:30:00+00:00"
    assert (
        combine_date_time(date(2026, 9, 18), time(10, 30)).isoformat()
        == "2026-09-18T05:00:00+00:00"
    )
    assert business_date(datetime(2026, 9, 17, 18, 30, tzinfo=UTC)) == date(2026, 9, 18)


def test_leap_year_year_rollover_and_previous_period() -> None:
    february = month_range(datetime(2024, 2, 15, tzinfo=UTC))
    assert february.days == 29
    assert previous_range(february).from_date == date(2024, 1, 1)
    january = month_range(datetime(2026, 1, 15, tzinfo=UTC))
    assert previous_range(january).from_date == date(2025, 12, 1)
    custom = date_range(date(2026, 9, 10), date(2026, 9, 18))
    assert previous_range(custom).from_date == date(2026, 9, 1)
    assert previous_range(custom).to_date == date(2026, 9, 9)


@pytest.mark.parametrize(
    "value",
    ["2026-02-29", "2026-04-31", "2026-13-01", "2026-9-1", "2026-09-01T00:00:00Z", 123, None],
)
def test_invalid_dates(value: object) -> None:
    with pytest.raises(ValueError):
        parse_date(value)


@pytest.mark.parametrize("value", ["24:00", "12:60", "1:30", "12:30:00", "09:00Z", 10, None])
def test_invalid_times(value: object) -> None:
    with pytest.raises(ValueError):
        parse_time(value)


def test_invalid_and_oversized_ranges() -> None:
    with pytest.raises(HTTPException):
        date_range(date(2026, 9, 18), date(2026, 9, 1))
    with pytest.raises(HTTPException):
        date_range(date(2025, 1, 1), date(2026, 12, 31))


def test_zero_baseline_and_percentage_math() -> None:
    assert rate(0, 0) == 0
    assert rate(1, 3) == 33.33
    assert percent_change(0, 0) == 0
    assert percent_change(12, 0) == 100
    assert percent_change(0, 12) == -100
    assert percent_change(24, 20) == 20
