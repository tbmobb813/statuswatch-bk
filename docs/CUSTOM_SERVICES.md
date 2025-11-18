# Custom Service Monitoring

## Overview

StatusWatch now supports **custom service monitoring**, allowing users to monitor their own URLs and services beyond the predefined services (GitHub, AWS, Vercel, Stripe, OpenAI).

---

## Features

### ✨ Core Capabilities

1. **Add Custom Services** - Monitor any HTTP/HTTPS endpoint
2. **Configurable Check Intervals** - 1-60 minutes between checks
3. **Custom Status Codes** - Define what HTTP status code means "up" (default: 200)
4. **Response Time Thresholds** - Set maximum acceptable response time
5. **Service Limits** - Tier-based limits (Free: 3, Pro: 10, Enterprise: 50)
6. **Automatic Monitoring** - Custom services are checked alongside predefined ones
7. **Test Before Adding** - Validate connectivity before creating a service

### 🎯 Check Types

Currently supported:
- `http` - HTTP endpoint
- `https` - HTTPS endpoint (recommended)
- `tcp` - TCP port check (planned)

---

## API Endpoints

Base URL: `http://localhost:5555/api/custom-services`

All endpoints require authentication (JWT token in `Authorization: Bearer <token>` header).

### 1. **Test Service Connectivity**

Test a URL before adding it as a custom service.

```http
POST /test
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://myapp.com/health",
  "checkType": "https",
  "expectedStatusCode": 200,
  "timeout": 10000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isReachable": true,
    "isUp": true,
    "statusCode": 200,
    "responseTime": 245,
    "expectedStatusCode": 200,
    "message": "Service is reachable and returned expected status 200"
  }
}
```

### 2. **Create Custom Service**

Add a new custom service to monitor.

```http
POST /
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Application",
  "statusUrl": "https://myapp.com/health",
  "category": "Custom",
  "checkInterval": 5,
  "expectedStatusCode": 200,
  "responseTimeThreshold": 5000,
  "checkType": "https",
  "color": "#FF6B6B"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "My Application",
    "slug": "my-application-abc123",
    "statusUrl": "https://myapp.com/health",
    "category": "Custom",
    "isCustom": true,
    "userId": "user_xxx",
    "checkInterval": 5,
    "expectedStatusCode": 200,
    "responseTimeThreshold": 5000,
    "checkType": "https",
    "color": "#FF6B6B",
    "isActive": true,
    "createdAt": "2025-11-18T..."
  },
  "message": "Custom service created successfully and added to your monitored services"
}
```

**Validation Rules:**
- `name`: 2-100 characters
- `statusUrl`: Valid URL format
- `category`: 2-50 characters
- `checkInterval`: 1-60 minutes
- `expectedStatusCode`: 100-599
- `responseTimeThreshold`: 100-30000 ms
- `checkType`: "http", "https", or "tcp"
- `color`: Hex color format (#RRGGBB)

**Errors:**
- `403 Forbidden` - Service limit reached
- `400 Bad Request` - Slug already exists or validation error

### 3. **Get All Custom Services**

Retrieve all custom services for the current user with uptime data.

```http
GET /
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "name": "My Application",
      "slug": "my-application-abc123",
      "statusUrl": "https://myapp.com/health",
      "category": "Custom",
      "isCustom": true,
      "uptime": 99.87,
      "totalChecks": 288,
      "lastCheck": {
        "id": "check_xxx",
        "isUp": true,
        "responseTime": 245,
        "statusCode": 200,
        "checkedAt": "2025-11-18T..."
      },
      "incidents": []
    }
  ]
}
```

### 4. **Get Single Custom Service**

Get detailed information about a specific custom service.

```http
GET /:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "My Application",
    "slug": "my-application-abc123",
    "statusUrl": "https://myapp.com/health",
    "statusChecks": [
      {
        "id": "check_xxx",
        "isUp": true,
        "responseTime": 245,
        "statusCode": 200,
        "checkedAt": "2025-11-18T..."
      }
    ],
    "incidents": []
  }
}
```

### 5. **Update Custom Service**

Update an existing custom service.

```http
PATCH /:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Updated Application",
  "checkInterval": 10,
  "responseTimeThreshold": 3000,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "name": "My Updated Application",
    ...
  },
  "message": "Custom service updated successfully"
}
```

**Updatable Fields:**
- `name`, `statusUrl`, `category`
- `checkInterval`, `expectedStatusCode`, `responseTimeThreshold`
- `checkType`, `color`, `isActive`

### 6. **Delete Custom Service**

Remove a custom service and all its data (checks, incidents).

```http
DELETE /:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Custom service deleted successfully"
}
```

**Note:** This cascades to:
- All status checks
- All incidents
- Monitored service relationships

### 7. **Get Service Limits**

Check your custom service limits and usage.

```http
GET /limits/info
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": 2,
    "max": 3,
    "remaining": 1,
    "canAddMore": true
  }
}
```

---

## Service Limits by Tier

| Tier | Max Custom Services |
|------|---------------------|
| **Free** | 3 |
| **Pro** | 10 |
| **Enterprise** | 50 |

Limits are determined by the user's `stripePriceId` field.

---

## How It Works

### 1. **Service Creation**

When you create a custom service:
1. Slug is auto-generated from name + user ID suffix (ensures uniqueness)
2. Service is automatically added to your monitored services
3. Monitoring starts on the next cron cycle

### 2. **Health Checking**

Custom services are checked differently than predefined services:

**Predefined Services** (GitHub, AWS, etc.):
- HTML status page parsing
- Complex logic to determine status

**Custom Services**:
- Simple HTTP request
- Status based on:
  - HTTP status code matches `expectedStatusCode` ✅
  - Response time < `responseTimeThreshold` ⏱️

**Status Determination:**
- **Operational**: Status code matches AND response time OK
- **Degraded**: Status code matches BUT response time exceeds threshold
- **Major Outage**: Status code doesn't match OR connection failed

### 3. **Monitoring Integration**

Custom services are monitored alongside predefined services:
- Same cron schedule (every 2 minutes for now)
- Same incident detection logic
- Same notification system
- Same uptime tracking

---

## Database Schema

```prisma
model Service {
  // ... existing fields

  // Custom service fields
  isCustom               Boolean  @default(false)
  userId                 String?
  checkInterval          Int      @default(2)
  expectedStatusCode     Int      @default(200)
  responseTimeThreshold  Int      @default(5000)
  checkType              String   @default("http")

  // Relations
  owner User? @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Migration:** `20251118172043_add_custom_services`

---

## Usage Examples

### cURL Examples

**1. Test a service:**
```bash
curl -X POST http://localhost:5555/api/custom-services/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.myapp.com/health",
    "checkType": "https",
    "expectedStatusCode": 200,
    "timeout": 10000
  }'
```

**2. Create a custom service:**
```bash
curl -X POST http://localhost:5555/api/custom-services \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "statusUrl": "https://api.myapp.com/health",
    "category": "API",
    "checkInterval": 5,
    "expectedStatusCode": 200,
    "responseTimeThreshold": 3000,
    "checkType": "https",
    "color": "#10B981"
  }'
```

**3. List custom services:**
```bash
curl http://localhost:5555/api/custom-services \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Update a service:**
```bash
curl -X PATCH http://localhost:5555/api/custom-services/SERVICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "checkInterval": 10,
    "responseTimeThreshold": 5000
  }'
```

**5. Delete a service:**
```bash
curl -X DELETE http://localhost:5555/api/custom-services/SERVICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Best Practices

### ✅ Recommended

1. **Use HTTPS** - Always prefer HTTPS over HTTP for security
2. **Health Endpoints** - Monitor dedicated health check endpoints
3. **Reasonable Intervals** - Don't check too frequently (5-15 min recommended)
4. **Set Thresholds** - Configure realistic response time thresholds
5. **Test First** - Always test connectivity before adding a service
6. **Meaningful Names** - Use descriptive names for easy identification
7. **Categories** - Organize services with consistent categories

### ❌ Avoid

1. **Public Services** - Don't add public services that already exist (GitHub, AWS, etc.)
2. **Very Short Intervals** - Avoid intervals < 2 minutes (may impact performance)
3. **Invalid URLs** - Ensure URLs are accessible and return consistent responses
4. **Too Many Services** - Don't exceed your tier limit (upgrade if needed)

---

## Troubleshooting

### Service shows as "Down" but it's actually up

**Possible causes:**
1. **Wrong expected status code** - Update `expectedStatusCode` to match actual response
2. **Firewall blocking** - Ensure StatusWatch server can reach your service
3. **SSL certificate issues** - Check HTTPS certificates are valid
4. **Timeout too low** - Increase `responseTimeThreshold` if service is slow

### Service limit reached

**Solutions:**
1. Delete unused custom services
2. Upgrade to Pro ($9/mo) for 10 services
3. Upgrade to Enterprise ($99/mo) for 50 services

### Test endpoint fails

**Check:**
1. URL is accessible from StatusWatch server
2. Expected status code is correct
3. Timeout is sufficient (default: 10s)
4. No authentication required (or use query params/headers)

---

## Future Enhancements

Planned features for custom service monitoring:

- [ ] **Custom Headers** - Add authentication headers
- [ ] **Request Body** - Support POST requests with body
- [ ] **TCP/UDP Checks** - Monitor non-HTTP services
- [ ] **Certificate Expiry Monitoring** - Alert on SSL cert expiration
- [ ] **Custom Alert Rules** - Per-service notification preferences
- [ ] **Regex Validation** - Check response body for expected content
- [ ] **Multi-region Checks** - Check from multiple geographic locations
- [ ] **Keyword Monitoring** - Alert if specific text appears/disappears
- [ ] **Public Status Pages** - Share custom service status publicly

---

## Security Considerations

1. **Authentication Required** - All endpoints require valid JWT token
2. **User Isolation** - Users can only access their own custom services
3. **Slug Uniqueness** - Slugs include user ID to prevent conflicts
4. **Cascade Deletion** - Deleting a user deletes all their custom services
5. **Rate Limiting** - API endpoints are rate-limited (100 req/15min)
6. **Input Validation** - All inputs validated with Zod schemas

---

## Support

For questions or issues with custom service monitoring:
- Check the API response error messages
- Review validation rules above
- Test connectivity with `/test` endpoint first
- Ensure your subscription tier allows more services

---

**Happy Monitoring! 🚀**
