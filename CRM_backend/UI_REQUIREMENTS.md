# UI reference analysis

Inspected both PNGs in the parent `Assets/` directory before implementation:

- `ChatGPT Image Sep 18, 2026, 08_23_50 AM.png`: Reports screen.
- `ChatGPT Image Sep 17, 2026, 11_38_15 PM.png`: Dashboard, Add Customer, Follow-ups and Settings reference panels.

The later instruction to use only Python replaces the original NestJS/TypeScript/Prisma technology choice. The business and API requirements remain unchanged.

## Persistence

| UI field | Storage |
| --- | --- |
| Customer name, phone, requirement | Customer strings; requirement is trimmed, phone preserves leading zeroes/country code |
| Source | Customer enum |
| Location and notes | Nullable customer strings |
| Lead status | Customer enum; frontend controls transitions |
| Closure date | Customer.closed_at; set on entry to CLOSED, cleared on exit |
| Next follow-up date and time | Combined into one FollowUp.follow_up_at timestamp |
| Preferred contact | Follow-up enum |
| Follow-up notes, completion and rescheduling | Notes, status, completed_at, reschedule_count |
| Creation/update timestamps | Both tables |

One customer has many follow-ups. Customer deletion cascades to follow-ups.

## Calculated data

| Reference feature | API/data |
| --- | --- |
| Total Customers / Closed cards and monthly changes | GET /api/dashboard; counts and calendar-month comparisons |
| Today's follow-ups / overdue cards | PENDING records and business time boundaries |
| Recent customers and preview appointments | Five-item dashboard lists |
| Search customer name, phone, requirement | Customer and follow-up search filters |
| Today / Overdue tabs, date selector | GET /api/follow-ups with type/date/range filters |
| WhatsApp and Call buttons | API returns phone; frontend constructs links |
| Calendar navigation | Date-range follow-up projection |
| Notification badge | Calculated today, overdue and summed total |
| Report summary cards | Cohort lead counts, conversion, due follow-up completion and comparisons |
| Lead Growth chart | Weekly buckets of Customer.created_at |
| Lead Sources chart | Count and percentage by source |
| Status Breakdown chart | Count by current status within the selected creation cohort |
| Top Requirements | Six most frequent trimmed requirement strings |
| Follow-up Performance | Live completed-today/upcoming/overdue/rescheduled counts, selected-period completion rate |
| Report Highlights | Deterministic comparisons from actual values |
| Generate Report / date selection | GET /api/reports, no persisted report job |
| Export Report | In-memory CSV/XLSX download |

The reference's ?Response Rate? and ?WhatsApp generated the highest response rate? cannot be measured with these fields. The backend exposes the specified completion rate and mathematical highlights instead. No customer-response data is invented.

Settings, Profile and Team screens are outside scope. No dashboard, report, calendar, notification, requirement, lead, user or team tables are created. Swagger is the only provided browser interface; no product frontend was generated.
