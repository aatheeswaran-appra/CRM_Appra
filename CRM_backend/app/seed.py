"""Non-destructive, repeatable demo data. Run explicitly with python -m app.seed."""

from datetime import UTC, datetime, time, timedelta

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import make_engine
from app.dates import business_date, combine_date_time, month_range
from app.enums import ContactMethod, FollowUpStatus, LeadSource, LeadStatus
from app.models import Customer, FollowUp

NAMES = ["Arun Kumar", "Priya S", "Rajesh Kumar", "Vignesh", "Abi", "Naveen", "Suresh", "Divya"]
REQUIREMENTS = [
    "Website Development",
    "Digital Marketing",
    "E-commerce Website",
    "SEO",
    "Branding",
    "Mobile App",
    "Logo Design",
    "Social Media",
]


def seed(session: Session, now: datetime) -> int:
    today = business_date(now)
    current = month_range(now)
    previous = month_range(now, -1)
    sources = list(LeadSource)
    statuses = list(LeadStatus)
    created = 0
    with session.begin():
        session.execute(text("SELECT pg_advisory_xact_lock(684731520)"))
        for index in range(32):
            phone = f"+91900000{index:04d}"
            name = NAMES[index % len(NAMES)] + (f" {index // 8 + 1}" if index >= 8 else "")
            if session.scalar(
                select(Customer.id).where(Customer.phone == phone, Customer.name == name)
            ):
                continue
            period = current if index < 20 else previous
            max_days = max(0, min(period.days - 1, (today - period.from_date).days))
            created_at = period.start + timedelta(days=index % (max_days + 1))
            status = statuses[index % len(statuses)]
            closed_at = (
                min(created_at + timedelta(hours=2), now) if status == LeadStatus.CLOSED else None
            )
            customer = Customer(
                name=name,
                phone=phone,
                requirement=REQUIREMENTS[index % 8],
                source=sources[index % 6],
                location=["Coimbatore", "Chennai", "Madurai", "Bengaluru"][index % 4],
                notes="Demo customer for Appra CRM integration.",
                status=status,
                closed_at=closed_at,
                created_at=created_at,
                updated_at=created_at,
            )
            if index < 8:
                follow_up_at = combine_date_time(today, time(9 + index, 30))
                completed = False
            elif index < 16:
                follow_up_at = now - timedelta(days=1 + index % 3)
                completed = index % 2 == 0
            elif index < 24:
                follow_up_at = now + timedelta(days=1 + index % 5)
                completed = False
            else:
                follow_up_at = previous.start + timedelta(days=index - 24, hours=6)
                completed = index % 2 == 0
            customer.follow_ups.append(
                FollowUp(
                    follow_up_at=follow_up_at,
                    preferred_contact=list(ContactMethod)[index % 3],
                    status=FollowUpStatus.COMPLETED if completed else FollowUpStatus.PENDING,
                    completed_at=now - timedelta(minutes=index)
                    if completed and index < 16
                    else (follow_up_at + timedelta(hours=1) if completed else None),
                    notes="Discuss requirements and next steps.",
                    reschedule_count=1 if index % 5 == 0 else 0,
                    created_at=created_at,
                    updated_at=now,
                )
            )
            session.add(customer)
            created += 1
    return created


def main() -> None:
    engine = make_engine(get_settings().database_url.get_secret_value())
    try:
        with Session(engine) as session:
            created = seed(session, datetime.now(UTC))
        print(f"Seed complete: {created} demo customers created with initial follow-ups.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
