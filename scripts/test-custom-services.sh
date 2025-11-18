#!/bin/bash

# StatusWatch - Custom Services Testing Script

set -e

API_URL="${API_URL:-http://localhost:5555}"

echo "🎯 Testing Custom Service Monitoring"
echo "====================================="
echo ""

# Check for token
if [ -f /tmp/statuswatch_token.txt ]; then
    TOKEN=$(cat /tmp/statuswatch_token.txt)
    echo "✅ Using saved token from /tmp/statuswatch_token.txt"
else
    echo "❌ No authentication token found"
    echo "Please run ./scripts/test-auth.sh first to get a token"
    exit 1
fi

echo "API URL: $API_URL"
echo ""

# Test 1: Check service limits
echo "📊 Test 1: Check Service Limits"
echo "-------------------------------"

LIMITS_RESPONSE=$(curl -s "$API_URL/api/custom-services/limits/info" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIMITS_RESPONSE" | jq '.'
echo ""

# Test 2: Test connectivity
echo "🔌 Test 2: Test Service Connectivity"
echo "------------------------------------"

TEST_RESPONSE=$(curl -s -X POST "$API_URL/api/custom-services/test" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.google.com",
    "checkType": "https",
    "expectedStatusCode": 200,
    "timeout": 10000
  }')

echo "$TEST_RESPONSE" | jq '.'

if echo "$TEST_RESPONSE" | jq -e '.data.isReachable' > /dev/null; then
    echo "✅ Connectivity test successful"
else
    echo "❌ Connectivity test failed"
    exit 1
fi

echo ""

# Test 3: Create custom service
echo "➕ Test 3: Create Custom Service"
echo "--------------------------------"

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/custom-services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API",
    "statusUrl": "https://httpstat.us/200",
    "category": "Testing",
    "checkInterval": 5,
    "expectedStatusCode": 200,
    "responseTimeThreshold": 3000,
    "checkType": "https",
    "color": "#10B981"
  }')

echo "$CREATE_RESPONSE" | jq '.'

# Extract service ID
SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Service creation failed - no ID received"
    exit 1
fi

echo "✅ Service created successfully"
echo "Service ID: $SERVICE_ID"
echo ""

# Save service ID
echo "$SERVICE_ID" > /tmp/statuswatch_service_id.txt

# Test 4: List all custom services
echo "📋 Test 4: List All Custom Services"
echo "-----------------------------------"

LIST_RESPONSE=$(curl -s "$API_URL/api/custom-services" \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | jq '.'
echo ""

# Test 5: Get single service
echo "🔍 Test 5: Get Single Service"
echo "-----------------------------"

GET_RESPONSE=$(curl -s "$API_URL/api/custom-services/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$GET_RESPONSE" | jq '.'
echo ""

# Test 6: Update service
echo "✏️  Test 6: Update Service"
echo "-------------------------"

UPDATE_RESPONSE=$(curl -s -X PATCH "$API_URL/api/custom-services/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API (Updated)",
    "checkInterval": 10,
    "responseTimeThreshold": 5000
  }')

echo "$UPDATE_RESPONSE" | jq '.'

if echo "$UPDATE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Service updated successfully"
else
    echo "❌ Service update failed"
fi

echo ""

# Test 7: Try to exceed limit (if on free tier)
echo "🚫 Test 7: Test Service Limit Enforcement"
echo "-----------------------------------------"

# Try to create 4 services (free tier limit is 3)
for i in {2..4}; do
    LIMIT_TEST=$(curl -s -X POST "$API_URL/api/custom-services" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"Test Service $i\",
        \"statusUrl\": \"https://httpstat.us/200\",
        \"checkInterval\": 5,
        \"expectedStatusCode\": 200
      }")

    if echo "$LIMIT_TEST" | jq -e '.error' | grep -q "limit"; then
        echo "✅ Service limit correctly enforced at service $i"
        break
    elif [ $i -eq 4 ]; then
        echo "⚠️  Created 4 services - limit may not be enforced"
    fi
done

echo ""

# Test 8: Delete service
echo "🗑️  Test 8: Delete Service"
echo "-------------------------"

DELETE_RESPONSE=$(curl -s -X DELETE "$API_URL/api/custom-services/$SERVICE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$DELETE_RESPONSE" | jq '.'

if echo "$DELETE_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Service deleted successfully"
else
    echo "❌ Service deletion failed"
fi

echo ""

# Test 9: Validation test
echo "✏️  Test 9: Input Validation"
echo "---------------------------"

INVALID_SERVICE=$(curl -s -X POST "$API_URL/api/custom-services" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A",
    "statusUrl": "not-a-url",
    "checkInterval": 0,
    "expectedStatusCode": 999
  }')

echo "$INVALID_SERVICE" | jq '.'

if echo "$INVALID_SERVICE" | jq -e '.details' > /dev/null; then
    echo "✅ Validation working - invalid data rejected"
else
    echo "⚠️  Warning: Validation may not be working properly"
fi

echo ""
echo "🎉 All custom service tests completed!"
echo ""
echo "💡 Tips:"
echo "   - Custom services are monitored automatically by the cron service"
echo "   - Check intervals range from 1-60 minutes"
echo "   - Free tier: 3 services, Pro: 10, Enterprise: 50"
echo ""
