#!/bin/bash

# StatusWatch - Analytics Testing Script

set -e

API_URL="${API_URL:-http://localhost:5555}"

echo "📊 Testing Advanced Analytics"
echo "=============================="
echo ""
echo "API URL: $API_URL"
echo ""

# Test 1: Summary Analytics
echo "📈 Test 1: Summary Analytics"
echo "----------------------------"

SUMMARY_RESPONSE=$(curl -s "$API_URL/api/analytics/summary?days=30")

echo "$SUMMARY_RESPONSE" | jq '.'
echo ""

if echo "$SUMMARY_RESPONSE" | jq -e '.data.metrics' > /dev/null; then
    AVG_MTTR=$(echo "$SUMMARY_RESPONSE" | jq -r '.data.metrics.avgMTTR')
    AVG_MTTD=$(echo "$SUMMARY_RESPONSE" | jq -r '.data.metrics.avgMTTD')
    AVG_RELIABILITY=$(echo "$SUMMARY_RESPONSE" | jq -r '.data.metrics.avgReliabilityScore')

    echo "📊 Summary Metrics:"
    echo "   Average MTTR: $AVG_MTTR minutes"
    echo "   Average MTTD: $AVG_MTTD minutes"
    echo "   Average Reliability: $AVG_RELIABILITY%"
    echo ""
    echo "✅ Summary analytics successful"
else
    echo "❌ Summary analytics failed"
    exit 1
fi

echo ""

# Test 2: MTTR (Mean Time To Resolution)
echo "⏱️  Test 2: MTTR (Mean Time To Resolution)"
echo "-----------------------------------------"

MTTR_RESPONSE=$(curl -s "$API_URL/api/analytics/mttr?days=30")

echo "$MTTR_RESPONSE" | jq '.'

if echo "$MTTR_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ MTTR calculation successful"

    # Show top 3 services by MTTR
    echo ""
    echo "🔝 Services with highest MTTR (slowest resolution):"
    echo "$MTTR_RESPONSE" | jq -r '.data[:3] | .[] | "   - \(.serviceName): \(.mttr) minutes (\(.resolvedIncidents) incidents)"'
else
    echo "⚠️  MTTR data not available (may need incidents with resolution times)"
fi

echo ""

# Test 3: MTTD (Mean Time To Detection)
echo "🔍 Test 3: MTTD (Mean Time To Detection)"
echo "----------------------------------------"

MTTD_RESPONSE=$(curl -s "$API_URL/api/analytics/mttd?days=30")

echo "$MTTD_RESPONSE" | jq '.'

if echo "$MTTD_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ MTTD calculation successful"

    # Show top 3 services by MTTD
    echo ""
    echo "🔝 Services with highest MTTD (slowest detection):"
    echo "$MTTD_RESPONSE" | jq -r '.data[:3] | .[] | "   - \(.serviceName): \(.mttd) minutes (\(.totalIncidents) incidents)"'
else
    echo "⚠️  MTTD data not available (may need incidents)"
fi

echo ""

# Test 4: Reliability Score
echo "⭐ Test 4: Reliability Score (0-100)"
echo "------------------------------------"

RELIABILITY_RESPONSE=$(curl -s "$API_URL/api/analytics/reliability?days=30")

echo "$RELIABILITY_RESPONSE" | jq '.'

if echo "$RELIABILITY_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ Reliability calculation successful"

    # Show top performers
    echo ""
    echo "🏆 Top Performing Services:"
    echo "$RELIABILITY_RESPONSE" | jq -r '.data[:5] | .[] | "   - \(.serviceName): \(.score)/100 (Uptime: \(.uptime)%)"'

    # Show services needing attention
    echo ""
    echo "⚠️  Services Needing Attention:"
    echo "$RELIABILITY_RESPONSE" | jq -r '.data[-3:] | reverse | .[] | "   - \(.serviceName): \(.score)/100 (Uptime: \(.uptime)%)"'
else
    echo "⚠️  Reliability data not available (may need status checks)"
fi

echo ""

# Test 5: Incident Trends
echo "📉 Test 5: Incident Trends"
echo "--------------------------"

TRENDS_RESPONSE=$(curl -s "$API_URL/api/analytics/trends?days=7")

echo "$TRENDS_RESPONSE" | jq '.'

if echo "$TRENDS_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ Trend analysis successful"

    TOTAL_INCIDENTS=$(echo "$TRENDS_RESPONSE" | jq -r '.meta.summary.totalIncidents')
    AVG_PER_DAY=$(echo "$TRENDS_RESPONSE" | jq -r '.meta.summary.avgIncidentsPerDay')

    echo ""
    echo "📊 Trend Summary (7 days):"
    echo "   Total Incidents: $TOTAL_INCIDENTS"
    echo "   Average per Day: $AVG_PER_DAY"
else
    echo "⚠️  Trend data not available (may need incident history)"
fi

echo ""

# Test 6: SLA Compliance
echo "🎯 Test 6: SLA Compliance"
echo "-------------------------"

SLA_RESPONSE=$(curl -s "$API_URL/api/analytics/sla?period=month&target=99.9")

echo "$SLA_RESPONSE" | jq '.'

if echo "$SLA_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ SLA calculation successful"

    COMPLIANCE_RATE=$(echo "$SLA_RESPONSE" | jq -r '.meta.summary.complianceRate')
    MET=$(echo "$SLA_RESPONSE" | jq -r '.meta.summary.met')
    FAILED=$(echo "$SLA_RESPONSE" | jq -r '.meta.summary.failed')

    echo ""
    echo "📊 SLA Summary (Month, 99.9% target):"
    echo "   Compliance Rate: $COMPLIANCE_RATE%"
    echo "   Services Meeting SLA: $MET"
    echo "   Services Failing SLA: $FAILED"

    # Show failing services
    if [ "$FAILED" != "0" ]; then
        echo ""
        echo "❌ Services failing SLA:"
        echo "$SLA_RESPONSE" | jq -r '.data[] | select(.met == false) | "   - \(.serviceName): \(.uptime)% (target: \(.target)%)"'
    fi
else
    echo "⚠️  SLA data not available (may need status checks)"
fi

echo ""

# Test 7: Service Comparison
echo "⚖️  Test 7: Service Comparison"
echo "------------------------------"

COMPARISON_RESPONSE=$(curl -s "$API_URL/api/analytics/comparison?days=30")

echo "$COMPARISON_RESPONSE" | jq '.'

if echo "$COMPARISON_RESPONSE" | jq -e '.data' > /dev/null; then
    echo "✅ Service comparison successful"

    echo ""
    echo "📊 Service Comparison (Top 5):"
    echo "$COMPARISON_RESPONSE" | jq -r '.data[:5] | .[] | "   \(.serviceName):"'
    echo "$COMPARISON_RESPONSE" | jq -r '.data[:5] | .[] | "      Score: \(.reliabilityScore // "N/A") | Uptime: \(.uptime // "N/A")% | MTTR: \(.mttr // "N/A")m"'
else
    echo "⚠️  Comparison data not available"
fi

echo ""

# Test 8: Different time periods
echo "📅 Test 8: Different Time Periods"
echo "---------------------------------"

for DAYS in 7 30 90; do
    PERIOD_RESPONSE=$(curl -s "$API_URL/api/analytics/summary?days=$DAYS")

    if echo "$PERIOD_RESPONSE" | jq -e '.data.metrics' > /dev/null; then
        TOTAL=$(echo "$PERIOD_RESPONSE" | jq -r '.data.metrics.totalIncidents')
        echo "✅ $DAYS days: $TOTAL incidents"
    else
        echo "❌ $DAYS days: Failed to fetch"
    fi
done

echo ""

# Test 9: Service-specific analytics
echo "🔎 Test 9: Service-Specific Analytics"
echo "-------------------------------------"

# Get first service ID from comparison
SERVICE_ID=$(echo "$COMPARISON_RESPONSE" | jq -r '.data[0].serviceId // empty')

if [ -n "$SERVICE_ID" ]; then
    echo "Testing analytics for service: $SERVICE_ID"

    SERVICE_MTTR=$(curl -s "$API_URL/api/analytics/mttr?serviceId=$SERVICE_ID&days=30")

    if echo "$SERVICE_MTTR" | jq -e '.data' > /dev/null; then
        echo "✅ Service-specific analytics working"
    else
        echo "⚠️  Service-specific analytics not available"
    fi
else
    echo "⚠️  No services available for testing"
fi

echo ""
echo "🎉 All analytics tests completed!"
echo ""
echo "📊 Analytics Metrics Available:"
echo "   - MTTR (Mean Time To Resolution)"
echo "   - MTTD (Mean Time To Detection)"
echo "   - Reliability Score (0-100)"
echo "   - SLA Compliance"
echo "   - Incident Trends"
echo "   - Service Comparison"
echo ""
echo "💡 Tips:"
echo "   - Analytics require historical data (status checks, incidents)"
echo "   - Run the monitoring service for a few hours to get meaningful data"
echo "   - Use different time periods (days parameter) for different insights"
echo ""
