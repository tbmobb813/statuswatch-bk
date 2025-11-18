# Advanced Analytics Dashboard

## Overview

StatusWatch provides comprehensive analytics to help you understand service reliability, incident patterns, and operational performance. The analytics system calculates industry-standard metrics like MTTR, MTTD, reliability scores, and SLA compliance.

---

## Metrics Explained

### 1. **MTTR (Mean Time To Resolution)**

**Definition:** Average time from incident start to resolution

**Formula:** `Total Resolution Time / Number of Resolved Incidents`

**Measured in:** Minutes

**What it tells you:**
- How quickly your team resolves incidents
- Efficiency of incident response processes
- Impact on user experience

**Good Targets:**
- **Critical incidents:** < 15 minutes
- **Major incidents:** < 1 hour
- **Minor incidents:** < 4 hours

### 2. **MTTD (Mean Time To Detection)**

**Definition:** Average time from actual incident occurrence to detection/creation in system

**Formula:** `Total Detection Time / Number of Incidents`

**Measured in:** Minutes

**What it tells you:**
- How quickly you detect problems
- Effectiveness of monitoring systems
- Gap between incident occurrence and awareness

**Good Targets:**
- **Automated monitoring:** < 5 minutes
- **Manual detection:** < 15 minutes
- **User-reported:** < 30 minutes

### 3. **Reliability Score (0-100)**

**Definition:** Composite score indicating overall service reliability

**Components:**
- **Uptime (40% weight):** Percentage of successful health checks
- **Incident Frequency (30% weight):** Number of incidents per period
- **Avg Resolution Time (30% weight):** How fast incidents are resolved

**Score Ranges:**
- **90-100:** Excellent - Production-ready
- **75-89:** Good - Acceptable for most use cases
- **50-74:** Fair - Needs improvement
- **< 50:** Poor - Immediate action required

### 4. **SLA Compliance**

**Definition:** Whether uptime meets Service Level Agreement targets

**Common Targets:**
- **99.99% ("four nines"):** 52.6 minutes downtime/year
- **99.9% ("three nines"):** 8.76 hours downtime/year
- **99% ("two nines"):** 3.65 days downtime/year

**Periods:**
- Day
- Week
- Month
- Quarter

---

## API Endpoints

Base URL: `http://localhost:5555/api/analytics`

All endpoints support optional authentication and work with both predefined and custom services.

### 1. **Summary Analytics**

Get high-level overview of all metrics.

```http
GET /summary?days=30
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2025-10-19T...",
      "endDate": "2025-11-18T..."
    },
    "metrics": {
      "totalIncidents": 15,
      "activeIncidents": 2,
      "resolvedIncidents": 13,
      "totalServices": 8,
      "avgMTTR": 45.23,
      "avgMTTD": 8.15,
      "avgReliabilityScore": 94.67
    },
    "topPerformers": [
      {
        "serviceId": "...",
        "serviceName": "GitHub",
        "slug": "github",
        "score": 98.5,
        "uptime": 99.95,
        "incidentFrequency": 0.5,
        "avgResolutionTime": 25
      }
    ],
    "needsAttention": [
      {
        "serviceId": "...",
        "serviceName": "My API",
        "slug": "my-api-abc123",
        "score": 72.3,
        "uptime": 95.2,
        "incidentFrequency": 5.2,
        "avgResolutionTime": 180
      }
    ]
  }
}
```

### 2. **Mean Time To Resolution (MTTR)**

```http
GET /mttr?serviceId=SERVICE_ID&days=30
```

**Query Parameters:**
- `serviceId` (optional): Filter by specific service
- `days` (optional): Period to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "clxxx...",
      "serviceName": "GitHub",
      "slug": "github",
      "mttr": 35.5,
      "totalIncidents": 10,
      "resolvedIncidents": 10
    }
  ],
  "meta": {
    "period": "30 days",
    "serviceId": "all"
  }
}
```

### 3. **Mean Time To Detection (MTTD)**

```http
GET /mttd?serviceId=SERVICE_ID&days=30
```

**Query Parameters:**
- `serviceId` (optional): Filter by specific service
- `days` (optional): Period to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "clxxx...",
      "serviceName": "AWS",
      "slug": "aws",
      "mttd": 5.2,
      "totalIncidents": 8
    }
  ],
  "meta": {
    "period": "30 days",
    "serviceId": "all"
  }
}
```

### 4. **Reliability Score**

```http
GET /reliability?serviceId=SERVICE_ID&days=30
```

**Query Parameters:**
- `serviceId` (optional): Filter by specific service
- `days` (optional): Period to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "clxxx...",
      "serviceName": "Vercel",
      "slug": "vercel",
      "score": 96.5,
      "uptime": 99.8,
      "incidentFrequency": 1.2,
      "avgResolutionTime": 42
    }
  ],
  "meta": {
    "period": "30 days",
    "serviceId": "all",
    "scoring": {
      "uptime": "40%",
      "incidentFrequency": "30%",
      "avgResolutionTime": "30%"
    }
  }
}
```

### 5. **Incident Trends**

Get daily incident counts over time.

```http
GET /trends?serviceId=SERVICE_ID&days=30
```

**Query Parameters:**
- `serviceId` (optional): Filter by specific service
- `days` (optional): Period to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-10-19",
      "incidents": 2,
      "criticalIncidents": 0,
      "majorIncidents": 1,
      "minorIncidents": 1
    },
    {
      "date": "2025-10-20",
      "incidents": 0,
      "criticalIncidents": 0,
      "majorIncidents": 0,
      "minorIncidents": 0
    }
  ],
  "meta": {
    "period": "30 days",
    "serviceId": "all",
    "summary": {
      "totalIncidents": 15,
      "criticalIncidents": 2,
      "majorIncidents": 6,
      "minorIncidents": 7,
      "avgIncidentsPerDay": 0.5
    }
  }
}
```

### 6. **SLA Compliance**

```http
GET /sla?serviceId=SERVICE_ID&period=month&target=99.9
```

**Query Parameters:**
- `serviceId` (optional): Filter by specific service
- `period` (optional): day, week, month, quarter (default: month)
- `target` (optional): Target uptime percentage (0-100, default: 99.9)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "clxxx...",
      "serviceName": "GitHub",
      "slug": "github",
      "period": "month",
      "uptime": 99.95,
      "target": 99.9,
      "met": true,
      "downtime": 21.6
    }
  ],
  "meta": {
    "period": "month",
    "target": "99.9%",
    "serviceId": "all",
    "summary": {
      "total": 8,
      "met": 7,
      "failed": 1,
      "complianceRate": 87.5
    }
  }
}
```

### 7. **Service Comparison**

Compare all metrics for all services side-by-side.

```http
GET /comparison?days=30
```

**Query Parameters:**
- `days` (optional): Period to analyze (1-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "serviceId": "clxxx...",
      "serviceName": "GitHub",
      "slug": "github",
      "mttr": 35.5,
      "mttd": 4.2,
      "reliabilityScore": 98.5,
      "uptime": 99.95,
      "incidentFrequency": 0.5
    },
    {
      "serviceId": "clxxx...",
      "serviceName": "AWS",
      "slug": "aws",
      "mttr": 52.3,
      "mttd": 6.1,
      "reliabilityScore": 95.2,
      "uptime": 99.8,
      "incidentFrequency": 1.2
    }
  ],
  "meta": {
    "period": "30 days",
    "metrics": ["mttr", "mttd", "reliabilityScore", "uptime", "incidentFrequency"]
  }
}
```

---

## Usage Examples

### cURL Examples

**1. Get summary analytics:**
```bash
curl http://localhost:5555/api/analytics/summary?days=30
```

**2. Get MTTR for specific service:**
```bash
curl http://localhost:5555/api/analytics/mttr?serviceId=clxxx&days=7
```

**3. Check SLA compliance for quarter:**
```bash
curl http://localhost:5555/api/analytics/sla?period=quarter&target=99
```

**4. Get incident trends:**
```bash
curl http://localhost:5555/api/analytics/trends?days=90
```

**5. Compare all services:**
```bash
curl http://localhost:5555/api/analytics/comparison?days=30
```

### JavaScript/TypeScript Example

```typescript
// Fetch analytics summary
async function getAnalyticsSummary(days = 30) {
  const response = await fetch(
    `http://localhost:5555/api/analytics/summary?days=${days}`
  );
  const data = await response.json();
  return data;
}

// Get reliability scores
async function getReliabilityScores(days = 30) {
  const response = await fetch(
    `http://localhost:5555/api/analytics/reliability?days=${days}`
  );
  const data = await response.json();
  return data;
}

// Check SLA compliance
async function checkSLA(period = 'month', target = 99.9) {
  const response = await fetch(
    `http://localhost:5555/api/analytics/sla?period=${period}&target=${target}`
  );
  const data = await response.json();
  return data;
}

// Usage
const summary = await getAnalyticsSummary(30);
console.log(`Average MTTR: ${summary.data.metrics.avgMTTR} minutes`);
console.log(`Average Reliability: ${summary.data.metrics.avgReliabilityScore}%`);
```

---

## Interpreting the Data

### When MTTR is High

**Possible Causes:**
- Complex incidents requiring deep investigation
- Lack of runbooks or documentation
- Insufficient team resources
- Manual processes instead of automation

**Actions:**
- Create incident runbooks
- Automate common fixes
- Improve monitoring and alerting
- Conduct post-mortems

### When MTTD is High

**Possible Causes:**
- Inadequate monitoring coverage
- Missing critical alerts
- Alert fatigue (too many false positives)
- No automated detection

**Actions:**
- Add more health checks
- Improve alert rules
- Reduce alert noise
- Implement synthetic monitoring

### When Reliability Score is Low

**Check:**
1. **Uptime component:** Are health checks failing?
2. **Incident frequency:** Too many incidents?
3. **Resolution time:** Taking too long to fix?

**Actions:**
- Focus on the weakest component
- Investigate root causes of incidents
- Implement preventive measures
- Review and improve processes

### When SLA is Missed

**Immediate Actions:**
1. Identify what caused the downtime
2. Calculate impact on users
3. Communicate with stakeholders
4. Create action plan to prevent recurrence

**Long-term:**
- Review SLA targets (too aggressive?)
- Invest in reliability improvements
- Consider redundancy and failover
- Implement chaos engineering

---

## Dashboard Visualization Ideas

### 1. **Executive Dashboard**
```
┌─────────────────────────────────────────┐
│ Overall Reliability: 94.5% ⭐          │
│ Active Incidents: 2 🔴                  │
│ Avg MTTR: 45 min ⏱️                    │
└─────────────────────────────────────────┘

┌─ Top Performers ────────────────────────┐
│ 1. GitHub - 98.5%                       │
│ 2. Vercel - 96.2%                       │
│ 3. AWS - 95.1%                          │
└─────────────────────────────────────────┘

┌─ Needs Attention ───────────────────────┐
│ 1. My API - 72.3% ⚠️                   │
│ 2. Legacy Service - 68.9% ⚠️           │
└─────────────────────────────────────────┘
```

### 2. **Incident Trends Graph**
```
📊 Incidents Over Time (30 Days)

5│    ●
4│  ●   ●
3│      ●     ●
2│●         ●     ●
1│  ●   ●       ●   ●
0└────────────────────────►
  Week 1  Week 2  Week 3  Week 4
```

### 3. **Service Comparison Table**
```
Service      | Uptime | MTTR | MTTD | Score
─────────────┼────────┼──────┼──────┼──────
GitHub       | 99.95% | 35m  | 4m   | 98.5
AWS          | 99.80% | 52m  | 6m   | 95.2
Vercel       | 99.87% | 42m  | 5m   | 96.2
My API       | 95.20% | 180m | 15m  | 72.3
```

---

## Best Practices

### ✅ Do

1. **Track trends over time** - Look at week-over-week or month-over-month changes
2. **Set realistic targets** - Base on your actual capabilities and resources
3. **Focus on improvement** - Prioritize services with lowest scores
4. **Review regularly** - Weekly or monthly analytics reviews
5. **Share with team** - Make metrics visible to everyone
6. **Celebrate wins** - Recognize improvements in metrics

### ❌ Don't

1. **Obsess over perfect scores** - 100% uptime is unrealistic
2. **Ignore context** - A single metric doesn't tell the whole story
3. **Blame individuals** - Focus on process improvements
4. **Set impossible targets** - Creates stress and gaming of metrics
5. **Only look at averages** - Check outliers and distributions
6. **Forget the user impact** - Metrics serve user experience

---

## Integration with Monitoring

### Alerting on Analytics

**Example:** Alert when reliability score drops below threshold

```typescript
// Pseudo-code for alerting
const scores = await analyticsService.calculateReliabilityScore();

for (const service of scores) {
  if (service.score < 80) {
    // Send alert
    await sendAlert({
      title: `Low Reliability: ${service.serviceName}`,
      message: `Reliability score dropped to ${service.score}%`,
      severity: 'warning'
    });
  }
}
```

### Automated Reports

**Example:** Weekly email with analytics summary

```typescript
// Pseudo-code for weekly report
cron.schedule('0 9 * * MON', async () => {
  const summary = await analyticsService.getSummaryAnalytics(7);

  await sendEmail({
    to: 'team@company.com',
    subject: 'Weekly StatusWatch Report',
    html: generateReportHTML(summary)
  });
});
```

---

## Future Enhancements

Planned analytics features:

- [ ] **Anomaly Detection** - ML-based anomaly detection in metrics
- [ ] **Forecasting** - Predict future incidents and downtime
- [ ] **Cost Analysis** - Calculate cost of downtime
- [ ] **Team Performance** - Track resolution times by team/person
- [ ] **Custom Metrics** - Define your own KPIs
- [ ] **Correlation Analysis** - Find patterns between incidents
- [ ] **Capacity Planning** - Predict when scaling is needed
- [ ] **Benchmarking** - Compare against industry standards

---

## Troubleshooting

### No data showing

**Check:**
1. Ensure services have been monitored for sufficient time
2. Verify incident data exists in database
3. Check date range isn't too narrow
4. Confirm serviceId (if specified) is correct

### Unexpected metric values

**Check:**
1. **MTTR very high:** Check if incidents are being resolved
2. **MTTD very low:** System may be auto-detecting quickly
3. **Reliability score 0:** No status checks may exist yet
4. **SLA always met:** Target may be too low

---

**Analytics powered by data-driven insights! 📊**
