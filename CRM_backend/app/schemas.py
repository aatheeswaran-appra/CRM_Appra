"""Request validation and the complete, camelCase OpenAPI response contract."""

import re
from datetime import date as CalendarDate
from datetime import datetime, time
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StrictInt,
    field_validator,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.dates import parse_date, parse_time
from app.enums import (
    ContactMethod,
    ExportFormat,
    FollowUpStatus,
    FollowUpType,
    LeadSource,
    LeadStatus,
)

BusinessDate = Annotated[CalendarDate, BeforeValidator(parse_date)]
BusinessTime = Annotated[time, BeforeValidator(parse_time)]
PositiveBodyId = Annotated[StrictInt, Field(gt=0, le=2147483647)]


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )

    @field_validator("*", mode="before")
    @classmethod
    def no_null_characters(cls, value: object) -> object:
        if isinstance(value, str) and re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", value):
            raise ValueError("Strings may not contain invalid control characters.")
        return value


class ScheduleInput(ApiModel):
    date: BusinessDate = Field(
        examples=["2026-09-20"], description="Business date in Asia/Kolkata: YYYY-MM-DD."
    )
    time: BusinessTime = Field(
        examples=["10:30"], description="Business time in Asia/Kolkata: HH:mm, 24-hour format."
    )


class InitialFollowUp(ScheduleInput):
    preferred_contact: ContactMethod = Field(default=ContactMethod.WHATSAPP, examples=["WHATSAPP"])
    notes: str | None = Field(
        default=None, max_length=10000, examples=["Share the website proposal."]
    )


class CustomerFields(ApiModel):
    name: str = Field(min_length=1, max_length=120, examples=["Arun Kumar"])
    phone: str = Field(
        min_length=7,
        max_length=32,
        examples=["+919876543210"],
        description="String; preserves country code and leading zeroes. 7-15 digits with optional +, spaces, parentheses, hyphens.",
    )
    requirement: str = Field(min_length=1, max_length=500, examples=["Website Development"])
    source: LeadSource = Field(default=LeadSource.OTHER, examples=["WEBSITE"])
    location: str | None = Field(default=None, max_length=200, examples=["Coimbatore"])
    notes: str | None = Field(
        default=None, max_length=10000, examples=["Interested in company website"]
    )
    status: LeadStatus = LeadStatus.NEW

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, value: str) -> str:
        if (
            not re.fullmatch(r"\+?[0-9 ()-]+", value)
            or not 7 <= sum(char.isdigit() for char in value) <= 15
        ):
            raise ValueError(
                "phone must contain 7-15 digits and optional +, spaces, parentheses, or hyphens."
            )
        return value


class CustomerCreate(CustomerFields):
    follow_up: InitialFollowUp = Field(
        description="Required initial follow-up; created in the same transaction as the customer."
    )


class CustomerUpdate(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=120, examples=["Arun Kumar"])
    phone: str | None = Field(default=None, min_length=7, max_length=32, examples=["+919876543210"])
    requirement: str | None = Field(
        default=None, min_length=1, max_length=500, examples=["Website Development"]
    )
    source: LeadSource | None = None
    location: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=10000)
    status: LeadStatus | None = Field(
        default=None,
        description="Any valid status; CLOSED sets closedAt, leaving CLOSED clears it.",
    )

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        for name in self.model_fields_set - {"location", "notes"}:
            if getattr(self, name) is None:
                raise ValueError(f"{to_camel(name)} may not be null.")
        if self.phone is not None:
            CustomerFields.valid_phone(self.phone)
        return self


class FollowUpCreate(InitialFollowUp):
    customer_id: PositiveBodyId = Field(examples=[8])


class FollowUpUpdate(ApiModel):
    date: BusinessDate | None = Field(default=None, examples=["2026-09-22"])
    time: BusinessTime | None = Field(default=None, examples=["15:30"])
    preferred_contact: ContactMethod | None = None
    notes: str | None = Field(default=None, max_length=10000)

    @model_validator(mode="after")
    def validate_update(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        for name in self.model_fields_set - {"notes"}:
            if getattr(self, name) is None:
                raise ValueError(f"{to_camel(name)} may not be null.")
        if ("date" in self.model_fields_set) != ("time" in self.model_fields_set):
            raise ValueError("Supply date and time together to reschedule.")
        return self


class PaginationQuery(ApiModel):
    page: int = Field(default=1, ge=1, le=1000000)
    limit: int = Field(default=20, ge=1, le=100)

    @field_validator("page", "limit", mode="before")
    @classmethod
    def positive_integer(cls, value: object) -> object:
        if isinstance(value, str) and not re.fullmatch(r"[1-9]\d*", value):
            raise ValueError("Use a positive decimal integer.")
        return value


class CustomerQuery(PaginationQuery):
    search: str | None = Field(
        default=None,
        max_length=200,
        description="Case-insensitive literal substring search across name, phone and requirement.",
    )
    status: LeadStatus | None = None
    source: LeadSource | None = None


class RangeQuery(ApiModel):
    from_date: BusinessDate | None = Field(
        default=None,
        alias="from",
        description="Inclusive first business date; supply from and to together. Maximum 366 days.",
    )
    to: BusinessDate | None = Field(default=None, description="Inclusive last business date.")

    @model_validator(mode="after")
    def paired_range(self) -> Self:
        if (self.from_date is None) != (self.to is None):
            raise ValueError("Provide both from and to.")
        if self.from_date and self.to:
            days = (self.to - self.from_date).days + 1
            if not 1 <= days <= 366:
                raise ValueError("from must be on or before to; maximum range is 366 days.")
        return self


class FollowUpQuery(PaginationQuery, RangeQuery):
    type: FollowUpType | None = Field(
        default=None,
        description="today: pending within the business day; overdue: pending before now; upcoming: pending after now. Today and overdue may overlap.",
    )
    status: FollowUpStatus | None = None
    customer_id: int | None = Field(default=None, ge=1, le=2147483647)
    date: BusinessDate | None = Field(
        default=None, description="An inclusive business date; cannot combine with from/to."
    )
    search: str | None = Field(
        default=None, max_length=200, description="Search customer name, phone or requirement."
    )

    @field_validator("customer_id", mode="before")
    @classmethod
    def valid_customer_id(cls, value: object) -> object:
        return PaginationQuery.positive_integer(value)

    @model_validator(mode="after")
    def compatible_filters(self) -> Self:
        if self.date and self.from_date:
            raise ValueError("Use date or from/to, not both.")
        if self.type == FollowUpType.TODAY and (self.date or self.from_date):
            raise ValueError("type=today already selects a date; omit date/from/to.")
        if self.type and self.status == FollowUpStatus.COMPLETED:
            raise ValueError("type filters require PENDING status.")
        return self


class CalendarQuery(ApiModel):
    from_date: BusinessDate = Field(
        alias="from",
        examples=["2026-09-01"],
        description="Inclusive first business date. Maximum range 366 days.",
    )
    to: BusinessDate = Field(examples=["2026-09-30"])

    @model_validator(mode="after")
    def valid_range(self) -> Self:
        if not 1 <= (self.to - self.from_date).days + 1 <= 366:
            raise ValueError("from must be on or before to; maximum range is 366 days.")
        return self


class ExportQuery(RangeQuery):
    format: ExportFormat = ExportFormat.CSV


class Pagination(ApiModel):
    page: int
    limit: int
    total: int
    total_pages: int


class DataResponse[T](ApiModel):
    data: T


class ListResponse[T](ApiModel):
    data: list[T]
    pagination: Pagination


class ErrorResponse(ApiModel):
    status_code: int = Field(examples=[400])
    message: str | list[str] = Field(examples=["Invalid request."])
    error: str = Field(examples=["Bad Request"])


class CustomerOut(ApiModel):
    id: int
    name: str
    phone: str
    requirement: str
    source: LeadSource
    location: str | None
    notes: str | None
    status: LeadStatus
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class FollowUpOut(ApiModel):
    id: int
    customer_id: int
    customer_name: str
    phone: str
    requirement: str
    follow_up_at: datetime
    preferred_contact: ContactMethod
    status: FollowUpStatus
    notes: str | None
    reschedule_count: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = Field(
        description="Calculated at request time: PENDING and followUpAt < now; never stored."
    )


class CustomerDetail(CustomerOut):
    follow_ups: list[FollowUpOut]


class DeletedResult(ApiModel):
    id: int
    deleted: Literal[True] = True


class NotificationSummary(ApiModel):
    today: int
    overdue: int
    total: int = Field(
        description="today + overdue, as requested; today's past-due entries occur in both counts."
    )


class DashboardStats(ApiModel):
    total_customers: int
    total_customers_change: float = Field(
        description="Percent change in customers created this calendar month versus previous full calendar month."
    )
    follow_ups_today: int
    overdue_follow_ups: int
    closed_customers: int
    closed_customers_change: float = Field(
        description="Percent change in CLOSED customers by closedAt this month versus last month."
    )


class DashboardOut(ApiModel):
    stats: DashboardStats
    recent_customers: list[CustomerOut]
    today_follow_ups: list[FollowUpOut]
    overdue_follow_ups: list[FollowUpOut]


class ReportPeriod(ApiModel):
    from_date: CalendarDate = Field(alias="from")
    to: CalendarDate
    timezone: str = "Asia/Kolkata"
    comparison_from: CalendarDate
    comparison_to: CalendarDate


class ReportSummary(ApiModel):
    total_leads: int
    total_leads_change: float
    interested_leads: int
    interested_leads_change: float
    conversion_rate: float
    conversion_rate_change: float = Field(
        description="Percentage-point difference from the previous period."
    )
    follow_up_completion_rate: float
    follow_up_completion_rate_change: float = Field(
        description="Percentage-point difference from the previous period."
    )


class GrowthBucket(ApiModel):
    label: str
    count: int


class SourceCount(ApiModel):
    source: LeadSource
    count: int
    percentage: float


class StatusCount(ApiModel):
    status: LeadStatus
    count: int


class RequirementCount(ApiModel):
    requirement: str
    count: int


class FollowUpPerformance(ApiModel):
    completed_today: int
    upcoming: int
    overdue: int
    rescheduled: int = Field(
        description="Current number of follow-up records with rescheduleCount > 0; not a historical event count."
    )
    completion_rate: float = Field(
        description="Completion rate of due follow-ups in the selected report range; other performance counts are live across all records."
    )


class ReportHighlight(ApiModel):
    metric: str
    message: str
    current: float
    previous: float
    change: float
    unit: Literal["percent", "percentage_points"]


class ReportOut(ApiModel):
    period: ReportPeriod
    summary: ReportSummary
    lead_growth: list[GrowthBucket]
    lead_sources: list[SourceCount]
    status_breakdown: list[StatusCount]
    top_requirements: list[RequirementCount]
    follow_up_performance: FollowUpPerformance
    highlights: list[ReportHighlight]


class HealthOut(ApiModel):
    status: Literal["ok"] = "ok"


class LoginInput(ApiModel):
    email: str = Field(min_length=3, max_length=255, examples=["demo@appracrm.com"])
    password: str = Field(min_length=1, max_length=128, examples=["Demo@12345"])
    remember_me: bool = False


class SignupInput(ApiModel):
    name: str = Field(min_length=1, max_length=120, examples=["Arun Kumar"])
    email: str = Field(min_length=3, max_length=255, examples=["arun@example.com"])
    phone: str = Field(default="", max_length=32, examples=["+919876543210"])
    password: str = Field(min_length=6, max_length=128, examples=["Secure@12345"])


class UserOut(ApiModel):
    id: str = Field(examples=["1"])
    name: str
    email: str
    phone: str | None = None
    role: str = "Administrator"
    avatar_initials: str = Field(examples=["AK"])
    created_at: datetime
    last_login_at: datetime | None = None


class AuthOut(ApiModel):
    user: UserOut
    token: str
    message: str = "Success"


class LogoutOut(ApiModel):
    message: str = "Logged out successfully"

