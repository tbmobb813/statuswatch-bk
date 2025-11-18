#!/bin/bash

# StatusWatch - Authentication Testing Script

set -e

API_URL="${API_URL:-http://localhost:5555}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Test User"

echo "🔐 Testing Authentication Flow"
echo "=============================="
echo ""
echo "API URL: $API_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Test 1: Register
echo "📝 Test 1: User Registration"
echo "----------------------------"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"$TEST_NAME\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ Registration failed - no token received"
    exit 1
fi

echo "✅ Registration successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Save token for other scripts
echo "$TOKEN" > /tmp/statuswatch_token.txt

# Test 2: Get current user
echo "👤 Test 2: Get Current User (GET /api/auth/me)"
echo "-----------------------------------------------"

ME_RESPONSE=$(curl -s "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "$ME_RESPONSE" | jq '.'

if echo "$ME_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Get current user successful"
else
    echo "❌ Get current user failed"
    exit 1
fi

echo ""

# Test 3: Login with correct password
echo "🔑 Test 3: Login with Correct Password"
echo "--------------------------------------"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null; then
    echo "✅ Login successful"
else
    echo "❌ Login failed"
    exit 1
fi

echo ""

# Test 4: Login with wrong password (should fail)
echo "❌ Test 4: Login with Wrong Password (Should Fail)"
echo "--------------------------------------------------"

WRONG_LOGIN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"WrongPassword123!\"
  }")

echo "$WRONG_LOGIN" | jq '.'

if echo "$WRONG_LOGIN" | jq -e '.success' > /dev/null; then
    echo "❌ SECURITY ISSUE: Login succeeded with wrong password!"
    exit 1
else
    echo "✅ Login correctly rejected wrong password"
fi

echo ""

# Test 5: Input validation
echo "✏️  Test 5: Input Validation"
echo "---------------------------"

INVALID_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"not-an-email\",
    \"password\": \"short\"
  }")

echo "$INVALID_RESPONSE" | jq '.'

if echo "$INVALID_RESPONSE" | jq -e '.details' > /dev/null; then
    echo "✅ Validation working - invalid data rejected"
else
    echo "⚠️  Warning: Validation may not be working properly"
fi

echo ""
echo "🎉 All authentication tests completed!"
echo ""
echo "💡 Token saved to: /tmp/statuswatch_token.txt"
echo "   Use this token for testing other endpoints:"
echo "   export TOKEN=\$(cat /tmp/statuswatch_token.txt)"
echo ""
echo "📝 To create an admin user, run:"
echo "   npx prisma studio"
echo "   Or run SQL: UPDATE users SET role = 'ADMIN' WHERE email = '$TEST_EMAIL';"
echo ""
