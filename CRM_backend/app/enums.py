from enum import StrEnum


class LeadStatus(StrEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    INTERESTED = "INTERESTED"
    FOLLOW_UP = "FOLLOW_UP"
    CLOSED = "CLOSED"
    NOT_INTERESTED = "NOT_INTERESTED"


class LeadSource(StrEnum):
    WEBSITE = "WEBSITE"
    WHATSAPP = "WHATSAPP"
    REFERRAL = "REFERRAL"
    INSTAGRAM = "INSTAGRAM"
    CALL = "CALL"
    OTHER = "OTHER"


class ContactMethod(StrEnum):
    WHATSAPP = "WHATSAPP"
    CALL = "CALL"
    EITHER = "EITHER"


class FollowUpStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


class FollowUpType(StrEnum):
    TODAY = "today"
    OVERDUE = "overdue"
    UPCOMING = "upcoming"


class ExportFormat(StrEnum):
    CSV = "csv"
    XLSX = "xlsx"
