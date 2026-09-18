from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.enums import ContactMethod, FollowUpStatus, LeadSource, LeadStatus


class Base(DeclarativeBase):
    pass


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint(
            "(status = 'CLOSED') = (closed_at IS NOT NULL)", name="customer_closed_at_consistent"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str] = mapped_column(String(32), index=True)
    requirement: Mapped[str] = mapped_column(String(500))
    source: Mapped[LeadSource] = mapped_column(Enum(LeadSource, name="lead_source"), index=True)
    location: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status"),
        default=LeadStatus.NEW,
        server_default="NEW",
        index=True,
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    follow_ups: Mapped[list["FollowUp"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan", passive_deletes=True
    )


class FollowUp(Base):
    __tablename__ = "follow_ups"
    __table_args__ = (
        Index("ix_follow_ups_status_follow_up_at", "status", "follow_up_at"),
        CheckConstraint("reschedule_count >= 0", name="follow_up_reschedule_count_nonnegative"),
        CheckConstraint(
            "(status = 'COMPLETED') = (completed_at IS NOT NULL)",
            name="follow_up_completed_at_consistent",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), index=True
    )
    follow_up_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    preferred_contact: Mapped[ContactMethod] = mapped_column(
        Enum(ContactMethod, name="contact_method")
    )
    status: Mapped[FollowUpStatus] = mapped_column(
        Enum(FollowUpStatus, name="follow_up_status"),
        default=FollowUpStatus.PENDING,
        server_default="PENDING",
        index=True,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    reschedule_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    customer: Mapped[Customer] = relationship(back_populates="follow_ups")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(
        String(50), default="Administrator", server_default="Administrator"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    logins: Mapped[list["LoginRecord"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )


class LoginRecord(Base):
    __tablename__ = "login_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(255), index=True)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS")
    ip_address: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(String(500))
    logged_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    user: Mapped[User | None] = relationship(back_populates="logins")

