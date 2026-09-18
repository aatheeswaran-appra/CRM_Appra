"""Create the two core CRM tables and their PostgreSQL enum types."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

lead_status = ENUM(
    "NEW",
    "CONTACTED",
    "INTERESTED",
    "FOLLOW_UP",
    "CLOSED",
    "NOT_INTERESTED",
    name="lead_status",
    create_type=False,
)
lead_source = ENUM(
    "WEBSITE",
    "WHATSAPP",
    "REFERRAL",
    "INSTAGRAM",
    "CALL",
    "OTHER",
    name="lead_source",
    create_type=False,
)
contact_method = ENUM("WHATSAPP", "CALL", "EITHER", name="contact_method", create_type=False)
follow_up_status = ENUM("PENDING", "COMPLETED", name="follow_up_status", create_type=False)


def upgrade() -> None:
    for enum in (lead_status, lead_source, contact_method, follow_up_status):
        enum.create(op.get_bind(), checkfirst=False)
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("requirement", sa.String(500), nullable=False),
        sa.Column("source", lead_source, nullable=False),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", lead_status, nullable=False, server_default="NEW"),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "(status = 'CLOSED') = (closed_at IS NOT NULL)", name="customer_closed_at_consistent"
        ),
    )
    for column in ("name", "phone", "status", "source", "created_at", "closed_at"):
        op.create_index(f"ix_customers_{column}", "customers", [column])
    op.create_table(
        "follow_ups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "customer_id",
            sa.Integer(),
            sa.ForeignKey("customers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("preferred_contact", contact_method, nullable=False),
        sa.Column("status", follow_up_status, nullable=False, server_default="PENDING"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reschedule_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("reschedule_count >= 0", name="follow_up_reschedule_count_nonnegative"),
        sa.CheckConstraint(
            "(status = 'COMPLETED') = (completed_at IS NOT NULL)",
            name="follow_up_completed_at_consistent",
        ),
    )
    for column in ("customer_id", "follow_up_at", "status", "completed_at"):
        op.create_index(f"ix_follow_ups_{column}", "follow_ups", [column])
    op.create_index("ix_follow_ups_status_follow_up_at", "follow_ups", ["status", "follow_up_at"])


def downgrade() -> None:
    op.drop_table("follow_ups")
    op.drop_table("customers")
    for enum in (follow_up_status, contact_method, lead_source, lead_status):
        enum.drop(op.get_bind(), checkfirst=False)
