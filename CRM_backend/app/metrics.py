def rounded(value: float) -> float:
    return round(value, 2)


def rate(count: int, total: int) -> float:
    return rounded(count / total * 100) if total else 0.0


def percent_change(current: float, previous: float) -> float:
    # Display convention when there is no baseline: 0->0 = 0%, 0->positive = 100%.
    return (
        rounded((current - previous) / previous * 100) if previous else (100.0 if current else 0.0)
    )
