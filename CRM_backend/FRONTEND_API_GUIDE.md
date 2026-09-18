# Appra CRM frontend API guide

Base URL during local development: `http://127.0.0.1:4000/api`.

The backend is Python/FastAPI with PostgreSQL. No authentication headers or tokens are required. Send JSON bodies with `Content-Type: application/json`.

Interactive documentation: [Swagger](http://127.0.0.1:4000/api/docs). The exact typed contract, enum values, query parameters and request/response examples are also in [openapi.json](openapi.json).

## Screen-to-endpoint mapping

| Screen/action | Method and URL |
| --- | --- |
| Dashboard | GET /api/dashboard |
| Customer list / global search | GET /api/customers |
| Add customer and initial follow-up | POST /api/customers |
| Customer details and follow-up history | GET /api/customers/{id} |
| Edit customer / change status | PATCH /api/customers/{id} |
| Delete customer and its follow-ups | DELETE /api/customers/{id} |
| Schedule another follow-up | POST /api/follow-ups |
| Follow-up list | GET /api/follow-ups |
| Today tab | GET /api/follow-ups?type=today |
| Overdue tab | GET /api/follow-ups?type=overdue |
| Upcoming tab | GET /api/follow-ups?type=upcoming |
| Follow-up details | GET /api/follow-ups/{id} |
| Edit follow-up notes/contact/schedule | PATCH /api/follow-ups/{id} |
| Complete follow-up | PATCH /api/follow-ups/{id}/complete |
| Reschedule follow-up | PATCH /api/follow-ups/{id}/reschedule |
| Delete follow-up | DELETE /api/follow-ups/{id} |
| Calendar | GET /api/follow-ups/calendar?from=2026-09-01&to=2026-09-30 |
| Notification badge | GET /api/follow-ups/notification-summary |
| Reports / Generate Report | GET /api/reports?from=2026-09-01&to=2026-09-30 |
| Download report | GET /api/reports/export?from=2026-09-01&to=2026-09-30&format=xlsx |
| Service health | GET /api/health |

There are no Settings, Profile or Team endpoints.

## Response conventions

Single records, screen-data objects, notification summaries and calendar arrays use:

```json
{ "data": {} }
```

For the calendar, `data` is an array. Customers and follow-up lists use:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 128, "totalPages": 7 }
}
```

Defaults: page 1, limit 20. Maximum limit 100, maximum page 1,000,000. Empty results have `totalPages: 0`. A page beyond the end returns an empty array with the real totals.

Creation returns HTTP 201. Other successful JSON operations return 200. Deletion returns:

```json
{ "data": { "id": 8, "deleted": true } }
```

Health is the explicit exception to the envelope: `{ "status": "ok" }`. Downloads return binary data, not JSON.

Errors always use:

```json
{
  "statusCode": 400,
  "message": ["body.name: String should have at least 1 character"],
  "error": "Bad Request"
}
```

`message` is a string or an array of strings. Validation errors use **400**, including malformed JSON, invalid path IDs, unknown fields and invalid query parameters. A missing record uses **404**. Concurrent update conflicts use **409**; retry after refreshing if appropriate. Unexpected failures use **500** with a generic message. Raw database errors and stack traces are not returned. Repeating a delete after it succeeded returns 404.

## Enums

| Field | Values |
| --- | --- |
| Customer status | NEW, CONTACTED, INTERESTED, FOLLOW_UP, CLOSED, NOT_INTERESTED |
| Source | WEBSITE, WHATSAPP, REFERRAL, INSTAGRAM, CALL, OTHER |
| Preferred contact | WHATSAPP, CALL, EITHER |
| Follow-up status | PENDING, COMPLETED |
| Follow-up type filter | today, overdue, upcoming |
| Export format | csv, xlsx |

Enums are case-sensitive. OVERDUE is a calculated condition, never a stored status.

## Dates, timezone and input rules

- Send business dates as `YYYY-MM-DD` and times as `HH:mm` in 24-hour format.
- Date/time input is interpreted in **Asia/Kolkata**, regardless of browser/server timezone.
- For example, `2026-09-20` + `10:30` is returned as `2026-09-20T05:00:00Z`.
- Timestamps are stored as PostgreSQL `TIMESTAMPTZ` and returned in UTC. Format them in Asia/Kolkata in the frontend.
- `from` and `to` are inclusive business dates. Internally the backend uses inclusive start/exclusive next-day start, including all of the final day.
- Both range parameters must be present together, correctly ordered, with at most 366 days. Valid date years are 1900?9998.
- Required strings reject blanks after trimming. Unknown body/query fields are rejected.
- Phone is a string containing 7?15 digits, with optional leading +, spaces, parentheses and hyphens. Never convert it to a number.
- Limits: name 120 characters, requirement 500, phone 32, location 200, notes 10,000.
- Only nullable fields such as notes and location can be cleared with null. Omit other fields to leave them unchanged.
- Phone is not unique: the API permits separate leads sharing a phone number.
- Past appointments are allowed, and immediately qualify as overdue if still pending.

## Customers

### POST /customers

Creates the customer and initial follow-up in one database transaction. Neither is saved if either insert fails.

```json
{
  "name": "Arun Kumar",
  "phone": "+919876543210",
  "requirement": "Website Development",
  "source": "WEBSITE",
  "location": "Coimbatore",
  "notes": "Interested in company website",
  "followUp": {
    "date": "2026-09-20",
    "time": "10:30",
    "preferredContact": "WHATSAPP"
  }
}
```

Required: name, phone, requirement and followUp with date/time. Source defaults to OTHER, status defaults to NEW, preferredContact defaults to WHATSAPP. Customer status and follow-up notes can optionally be provided. No client-supplied IDs, closedAt, completedAt or createdAt fields are accepted.

Returns `{data: CustomerDetail}`:

```json
{
  "data": {
    "id": 8,
    "name": "Arun Kumar",
    "phone": "+919876543210",
    "requirement": "Website Development",
    "source": "WEBSITE",
    "location": "Coimbatore",
    "notes": "Interested in company website",
    "status": "NEW",
    "closedAt": null,
    "createdAt": "2026-09-18T04:00:00Z",
    "updatedAt": "2026-09-18T04:00:00Z",
    "followUps": [
      {
        "id": 15,
        "customerId": 8,
        "customerName": "Arun Kumar",
        "phone": "+919876543210",
        "requirement": "Website Development",
        "followUpAt": "2026-09-20T05:00:00Z",
        "preferredContact": "WHATSAPP",
        "status": "PENDING",
        "notes": null,
        "rescheduleCount": 0,
        "completedAt": null,
        "createdAt": "2026-09-18T04:00:00Z",
        "updatedAt": "2026-09-18T04:00:00Z",
        "isOverdue": false
      }
    ]
  }
}
```

### GET /customers

Optional query parameters: `search`, `status`, `source`, `page`, `limit`.

Search is a case-insensitive literal substring match across name, phone and requirement. It is combined with other filters using AND. Percent and underscore characters are searched literally.

Example: `GET /customers?search=website&status=INTERESTED&source=WEBSITE&page=1&limit=20`.

Returns a paginated array of Customer objects (the customer fields above, without followUps). Sort order is createdAt descending, then id descending.

### GET /customers/{id}

Returns CustomerDetail with all follow-ups sorted by followUpAt ascending, then id ascending. Use this for the detail screen; no separate request is required for follow-up contact data.

### PATCH /customers/{id}

Accepts any non-empty subset of name, phone, requirement, source, location, notes and status.

```json
{ "status": "CLOSED", "notes": "Project confirmed" }
```

Returns `{data: Customer}`. Any status transition is allowed; no automatic progression occurs. Entering CLOSED sets closedAt to now. Sending CLOSED again preserves the original timestamp. Leaving CLOSED sets closedAt to null. Re-closing sets a new timestamp. Customer status changes do not complete or cancel follow-ups.

### DELETE /customers/{id}

No body. Deletes the customer and every related follow-up. Returns the deletion envelope shown above.

## Follow-ups

Every follow-up response contains the complete follow-up shape shown in the customer creation example, including customerId, customerName, phone, requirement and calculated isOverdue.

### POST /follow-ups

```json
{
  "customerId": 8,
  "date": "2026-09-20",
  "time": "10:30",
  "preferredContact": "WHATSAPP",
  "notes": "Discuss the proposal"
}
```

Required: customerId as a positive integer, date and time. preferredContact defaults to WHATSAPP; notes are optional. Returns `{data: FollowUp}` with PENDING status. An unknown customer returns 404.

### GET /follow-ups

Optional query parameters:

| Parameter | Behavior |
| --- | --- |
| type=today | PENDING appointments anywhere in today's Asia/Kolkata business day |
| type=overdue | PENDING and followUpAt strictly before now |
| type=upcoming | PENDING and followUpAt strictly after now |
| status | PENDING or COMPLETED |
| customerId | Follow-ups for one customer |
| search | Match customer name, phone or requirement |
| date | Appointments on one business date; both statuses unless filtered |
| from + to | Inclusive business date range |
| page + limit | Standard pagination |

All results sort by followUpAt ascending, then id ascending. With no filters, both statuses are returned.

`date` cannot be combined with `from/to`. `type=today` cannot be combined with date/range filters. Other type filters can be intersected with date/range filters. Type filters cannot be combined with status=COMPLETED.

Today and overdue **overlap** for appointments earlier today. An appointment exactly at now is today if within the business day, but is neither strictly overdue nor strictly upcoming.

### GET /follow-ups/{id}

No query or body. Returns `{data: FollowUp}`, or 404.

### PATCH /follow-ups/{id}

Non-empty subset of preferredContact, notes, date and time. Date/time must be supplied together.

```json
{ "preferredContact": "CALL", "notes": "Call after lunch" }
```

Returns `{data: FollowUp}`. Supplying date/time applies the same rules as reschedule. Customer reassignment and direct status/attempt-counter editing are not accepted.

### PATCH /follow-ups/{id}/complete

No body. Sets COMPLETED and completedAt=now. Returns `{data: FollowUp}`. Repeated completion preserves completedAt, making this action idempotent. Customer status is unaffected.

### PATCH /follow-ups/{id}/reschedule

```json
{ "date": "2026-09-22", "time": "15:30" }
```

Returns `{data: FollowUp}`. Updates followUpAt, sets PENDING, clears completedAt and increments rescheduleCount atomically. Completed records can be reopened through this action. Each successful call increments the count, even when the supplied schedule matches the existing one; do not blindly retry a request whose successful result was already received.

### DELETE /follow-ups/{id}

No body. Deletes only this follow-up and returns the deletion envelope.

### GET /follow-ups/calendar

Requires `from` and `to`. Returns `{data: [FollowUp, ...]}`, ordered by followUpAt/id. Includes both statuses. No pagination; maximum 366-day range. Calendar events can use the follow-up ID directly.

### GET /follow-ups/notification-summary

```json
{ "data": { "today": 8, "overdue": 3, "total": 11 } }
```

No query/body. total is the requested sum, today + overdue; it is not a distinct count because those groups overlap. No notification records are created.

For WhatsApp and Call actions, use the returned phone value to construct the frontend's WhatsApp and tel links. The backend does not send messages or initiate calls.

## Dashboard

### GET /dashboard

No query/body. Returns one screen response:

```json
{
  "data": {
    "stats": {
      "totalCustomers": 128,
      "totalCustomersChange": 12,
      "followUpsToday": 8,
      "overdueFollowUps": 3,
      "closedCustomers": 24,
      "closedCustomersChange": 8
    },
    "recentCustomers": [],
    "todayFollowUps": [],
    "overdueFollowUps": []
  }
}
```

- totalCustomers and closedCustomers are current all-time counts.
- totalCustomersChange compares customers **created** this calendar month with the previous full calendar month.
- closedCustomersChange compares currently CLOSED customers by **closedAt** in those two months.
- The two follow-up counts use the same today/overdue definitions as their tabs.
- Recent customers are the latest five. Today/overdue previews contain up to five records each, earliest scheduled first.
- Change convention when the previous count is zero: 0 to 0 = 0%; 0 to a positive count = 100%. This is a display convention, not a defined mathematical growth rate.

## Reports

### GET /reports

Optional `from` and `to`, supplied together. Defaults to the current full calendar month in Asia/Kolkata. Returns `{data: Report}` with:

| Property | Contents |
| --- | --- |
| period | from, to, timezone, comparisonFrom, comparisonTo |
| summary | totalLeads, totalLeadsChange, interestedLeads, interestedLeadsChange, conversionRate, conversionRateChange, followUpCompletionRate, followUpCompletionRateChange |
| leadGrowth | Array of {label: "Week 1", count: 18} |
| leadSources | Array of {source, count, percentage}; includes every enum, even zero counts |
| statusBreakdown | Array of {status, count}; includes every enum |
| topRequirements | Up to six {requirement, count}, most frequent first |
| followUpPerformance | completedToday, upcoming, overdue, rescheduled, completionRate |
| highlights | Array of {metric, message, current, previous, change, unit} |

Metric definitions:

1. **Lead cohort:** customers with createdAt inside the selected business-date range. totalLeads is its size. interestedLeads counts cohort members currently INTERESTED.
2. **Conversion:** cohort members currently CLOSED with closedAt inside the selected range, divided by totalLeads ? 100. Older customers closed this month affect the dashboard's closure comparison but are outside this report's new-lead cohort. This keeps cohort conversion between 0 and 100.
3. **Completion:** COMPLETED follow-ups scheduled inside the selected range and already due at now, with completedAt <= now, divided by all due follow-ups in that range ? 100. Future appointments are excluded from both sides, even if completed early.
4. **Comparison:** a full calendar month compares with the preceding full calendar month. Other ranges compare with the immediately preceding equal number of business dates. Response period metadata identifies the exact comparison window.
5. **Changes:** lead-count changes are relative percentages. conversionRateChange and followUpCompletionRateChange are **percentage-point differences**. A change from 12% to 18% is +6 points.
6. **Rounding/empty data:** rates and changes use two decimal places, zero denominators return 0, and count changes use the same zero-baseline convention as the dashboard.
7. **Lead Growth:** consecutive seven-day buckets starting from the selected range's first date, including empty buckets. A monthly report uses days 1?7, 8?14, etc.; its final week may be shorter.
8. **Sources/statuses/requirements:** grouped within the same creation cohort. Requirement grouping uses the exact trimmed string and is case-sensitive; no requirement catalog exists. Ties sort by requirement text.
9. **Performance:** completedToday uses completedAt within today's business day. upcoming and overdue are live PENDING counts across all records. rescheduled is the number of existing records whose rescheduleCount > 0, not the sum of scheduling actions. These four counts remain live when the selected report range changes. completionRate uses the selected report period.
10. **Highlights:** deterministic comparisons only. No customer response/engagement rates are inferred. A zero-data report has no highlights.

The minimal two-table model stores current state, not historical snapshots. Changing a customer's status, reopening/rescheduling a follow-up, or deleting records can change older report results. There is no status-history or reschedule-event table.

### GET /reports/export

Same optional date range as reports, plus `format=csv` or `format=xlsx`; default csv.

Returns a file with `Content-Disposition: attachment; filename="appra-report-YYYY-MM-DD-YYYY-MM-DD.xlsx"`. CORS exposes this header so the frontend can read the filename.

CSV is UTF-8 with a BOM and section-tagged rows. XLSX has separate sheets for Period, Summary, Lead Growth, Lead Sources, Status Breakdown, Top Requirements, Follow-up Performance and Highlights. Both exports include the selected report's aggregates and calculated highlights. User-entered requirement strings are emitted as text, not executable spreadsheet formulas.

Download responses are binary; use the response body as a file/blob. Invalid parameters still return the normal JSON error envelope.

## Integration notes

Refresh dashboard/report/list data after successful mutations. Browser display labels may use ?Due Today? and ?Overdue?; persist only the documented enum values. Use empty/loading/error states based on the response, rather than sample numbers from the reference images.

The environment's CORS_ORIGIN controls allowed frontend origins. Multiple origins can be configured as a comma-separated list. No frontend URL is hardcoded.
