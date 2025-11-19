# API Documentation

StatusWatch provides a comprehensive REST API for monitoring services, managing incidents, and viewing analytics.

## API Documentation (Swagger/OpenAPI)

Interactive API documentation is available via Swagger UI when the backend server is running.

### Access Swagger UI

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:5555/api-docs`
- **OpenAPI JSON**: `http://localhost:5555/api-docs.json`

### Features

The Swagger documentation includes:
- **Complete endpoint reference** for all API routes
- **Interactive testing** - Try API endpoints directly from the browser
- **Request/response schemas** with examples
- **Authentication** - JWT bearer token support
- **Parameter documentation** - Query params, path params, request bodies

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Services
- `GET /api/status` - Get status of all services
- `GET /api/status/:slug` - Get status of a specific service

### Custom Services
- `POST /api/custom-services/test` - Test service connectivity
- `POST /api/custom-services` - Create custom service
- `GET /api/custom-services` - List user's custom services
- `GET /api/custom-services/:id` - Get custom service details
- `PATCH /api/custom-services/:id` - Update custom service
- `DELETE /api/custom-services/:id` - Delete custom service
- `GET /api/custom-services/limits/info` - Get tier limits

### Incidents
- `GET /api/incidents` - List all incidents
- `GET /api/incidents/:id` - Get incident details
- `POST /api/incidents` - Create incident (Admin only)
- `PATCH /api/incidents/:id` - Update incident (Admin only)
- `POST /api/incidents/:id/updates` - Add incident update (Admin only)

### Analytics
- `GET /api/analytics/summary` - Get analytics summary
- `GET /api/analytics/mttr` - Mean Time To Resolution
- `GET /api/analytics/mttd` - Mean Time To Detection
- `GET /api/analytics/reliability` - Reliability scores
- `GET /api/analytics/trends` - Incident trends
- `GET /api/analytics/sla` - SLA compliance
- `GET /api/analytics/comparison` - Service comparison

### Uptime
- `GET /api/uptime` - Get uptime statistics
- `GET /api/uptime/:slug` - Get uptime for specific service

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/alerts` - Get alert preferences
- `PUT /api/user/alerts` - Update alert preferences
- `GET /api/user/monitored-services` - Get monitored services
- `POST /api/user/monitored-services` - Add monitored service
- `DELETE /api/user/monitored-services/:serviceId` - Remove monitored service

## Authentication

Most endpoints require authentication via JWT bearer token.

### Getting a Token

1. **Register** a new account:
   ```bash
   curl -X POST http://localhost:5555/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "name": "John Doe", "password": "password123"}'
   ```

2. **Login** to get your token:
   ```bash
   curl -X POST http://localhost:5555/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password123"}'
   ```

3. **Use the token** in subsequent requests:
   ```bash
   curl -X GET http://localhost:5555/api/user/profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Using Authentication in Swagger UI

1. Click the **Authorize** button (lock icon) at the top right
2. Enter your JWT token in the format: `Bearer YOUR_TOKEN_HERE`
3. Click **Authorize**
4. Now all requests will include your authentication token

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `RateLimit-Limit` - Request limit
- `RateLimit-Remaining` - Remaining requests
- `RateLimit-Reset` - Reset time

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "path": "field.name",
      "message": "Validation error message"
    }
  ]
}
```

## Custom Service Tier Limits

Custom service monitoring is limited by user tier:
- **FREE**: 3 custom services
- **PRO**: 10 custom services
- **ENTERPRISE**: 50 custom services

## Example Workflows

### 1. Create a Custom Service

```bash
# 1. Test connectivity first
curl -X POST http://localhost:5555/api/custom-services/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/health",
    "expectedStatusCode": 200,
    "timeout": 5000
  }'

# 2. Create the service
curl -X POST http://localhost:5555/api/custom-services \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API",
    "url": "https://api.example.com/health",
    "checkInterval": 5,
    "expectedStatusCode": 200,
    "responseTimeThreshold": 2000
  }'
```

### 2. Get Analytics

```bash
# Get MTTR for last 30 days
curl -X GET "http://localhost:5555/api/analytics/mttr?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get reliability scores
curl -X GET "http://localhost:5555/api/analytics/reliability?days=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Monitor Services

```bash
# Add a service to your monitored list
curl -X POST http://localhost:5555/api/user/monitored-services \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceSlug": "github"}'

# Get your monitored services
curl -X GET http://localhost:5555/api/user/monitored-services \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Support

For issues or questions:
- View full interactive documentation at `/api-docs`
- Check the source code in `/src/routes/*.ts`
- Review schemas in `/src/schemas/*.ts`
