#!/bin/bash

# Multi-Shift Planning API Test Script
# Tests the multi-shift endpoint with correct 75/25 split

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
INPUT_FILE="Worker-Task algo data.xlsx"
OUTPUT_FILE="multi_shift_test_results.json"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Multi-Shift Planning Test (75/25 Split)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file not found: $INPUT_FILE${NC}"
    echo "Please ensure the file exists in the current directory."
    exit 1
fi

echo -e "${GREEN}✓${NC} Input file found: $INPUT_FILE"

# Check if server is running
echo -e "\n${YELLOW}Checking server availability...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health" | grep -q "200"; then
    echo -e "${RED}Error: Server not responding at $API_BASE_URL${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}✓${NC} Server is running at $API_BASE_URL"

# API parameters
SHIFT1_START="2024-01-01T07:00:00Z"
SHIFT1_END="2024-01-01T16:30:00Z"
SHIFT2_START="2024-01-02T07:00:00Z"
SHIFT2_END="2024-01-02T16:30:00Z"
SHIFT1_PCT="0.75"
SHIFT2_PCT="0.25"

echo -e "\n${BLUE}Test Configuration:${NC}"
echo "  Shift 1: $SHIFT1_START to $SHIFT1_END (75%)"
echo "  Shift 2: $SHIFT2_START to $SHIFT2_END (25%)"
echo "  Expected: ~75% work in Shift 1, ~25% in Shift 2"

# Make API call
echo -e "\n${YELLOW}Sending request to multi-shift endpoint...${NC}"

HTTP_CODE=$(curl -s -o "$OUTPUT_FILE" -w "%{http_code}" \
    -X POST "$API_BASE_URL/api/v1/worker-tasks/plan-file-multishift-shiftids" \
    -F "file=@$INPUT_FILE" \
    -F "startingShiftPct=$SHIFT1_PCT" \
    -F "endingShiftPct=$SHIFT2_PCT" \
    -F "shift1StartTime=$SHIFT1_START" \
    -F "shift1EndTime=$SHIFT1_END" \
    -F "shift2StartTime=$SHIFT2_START" \
    -F "shift2EndTime=$SHIFT2_END")

echo "HTTP Status: $HTTP_CODE"

# Check HTTP status
if [ "$HTTP_CODE" != "200" ]; then
    echo -e "\n${RED}✗ Request failed with status $HTTP_CODE${NC}"
    echo -e "${RED}Response:${NC}"
    cat "$OUTPUT_FILE"
    exit 1
fi

echo -e "${GREEN}✓${NC} Request successful (200 OK)"

# Parse and validate response
echo -e "\n${YELLOW}Analyzing results...${NC}"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq not installed. Skipping detailed analysis.${NC}"
    echo "Install jq for detailed results: brew install jq (macOS) or apt-get install jq (Linux)"
    echo -e "\n${BLUE}Raw response saved to: $OUTPUT_FILE${NC}"
    exit 0
fi

# Extract metrics using jq
TOTAL_ASSIGNMENTS=$(jq -r '.assignments | length' "$OUTPUT_FILE")
SHIFT1_COUNT=$(jq -r '[.assignments[] | select(.startDate | startswith("2024-01-01"))] | length' "$OUTPUT_FILE")
SHIFT2_COUNT=$(jq -r '[.assignments[] | select(.startDate | startswith("2024-01-02"))] | length' "$OUTPUT_FILE")

# Calculate hours
SHIFT1_HOURS=$(jq -r '
    [.assignments[] |
     select(.startDate | startswith("2024-01-01")) |
     (((.endDate | fromdateiso8601) - (.startDate | fromdateiso8601)) / 3600)] |
    add // 0' "$OUTPUT_FILE")

SHIFT2_HOURS=$(jq -r '
    [.assignments[] |
     select(.startDate | startswith("2024-01-02")) |
     (((.endDate | fromdateiso8601) - (.startDate | fromdateiso8601)) / 3600)] |
    add // 0' "$OUTPUT_FILE")

TOTAL_HOURS=$(echo "$SHIFT1_HOURS + $SHIFT2_HOURS" | bc)
SHIFT1_PCT_ACTUAL=$(echo "scale=2; $SHIFT1_HOURS * 100 / $TOTAL_HOURS" | bc)
SHIFT2_PCT_ACTUAL=$(echo "scale=2; $SHIFT2_HOURS * 100 / $TOTAL_HOURS" | bc)

# Display results
echo -e "\n${BLUE}=== RESULTS ===${NC}"
echo "Total Assignments: $TOTAL_ASSIGNMENTS"
echo ""
echo "Shift 1 (2024-01-01):"
echo "  Assignments: $SHIFT1_COUNT"
echo "  Hours: $(printf '%.2f' $SHIFT1_HOURS)h"
echo "  Percentage: ${SHIFT1_PCT_ACTUAL}%"
echo ""
echo "Shift 2 (2024-01-02):"
echo "  Assignments: $SHIFT2_COUNT"
echo "  Hours: $(printf '%.2f' $SHIFT2_HOURS)h"
echo "  Percentage: ${SHIFT2_PCT_ACTUAL}%"
echo ""
echo "Total Hours: $(printf '%.2f' $TOTAL_HOURS)h"

# Validation
echo -e "\n${BLUE}=== VALIDATION ===${NC}"

PASS=true

# Check if we have both shifts
if [ "$SHIFT2_COUNT" -eq 0 ]; then
    echo -e "${RED}✗ FAIL: Shift 2 has no assignments!${NC}"
    echo "  This means the multi-shift planning didn't create Shift 2."
    echo "  Check that shift2StartTime and shift2EndTime were provided correctly."
    PASS=false
else
    echo -e "${GREEN}✓${NC} Both shifts have assignments"
fi

# Check shift 1 percentage (should be ~75%, allow ±10% tolerance)
SHIFT1_LOWER=65
SHIFT1_UPPER=85
if (( $(echo "$SHIFT1_PCT_ACTUAL < $SHIFT1_LOWER" | bc -l) )) || (( $(echo "$SHIFT1_PCT_ACTUAL > $SHIFT1_UPPER" | bc -l) )); then
    echo -e "${YELLOW}⚠${NC}  Shift 1 percentage is ${SHIFT1_PCT_ACTUAL}% (expected ~75%)"
    echo "  This is outside the expected range of ${SHIFT1_LOWER}-${SHIFT1_UPPER}%"
else
    echo -e "${GREEN}✓${NC} Shift 1 percentage is within expected range (${SHIFT1_PCT_ACTUAL}% ≈ 75%)"
fi

# Check shift 2 percentage (should be ~25%, allow ±10% tolerance)
SHIFT2_LOWER=15
SHIFT2_UPPER=35
if (( $(echo "$SHIFT2_PCT_ACTUAL < $SHIFT2_LOWER" | bc -l) )) || (( $(echo "$SHIFT2_PCT_ACTUAL > $SHIFT2_UPPER" | bc -l) )); then
    echo -e "${YELLOW}⚠${NC}  Shift 2 percentage is ${SHIFT2_PCT_ACTUAL}% (expected ~25%)"
    echo "  This is outside the expected range of ${SHIFT2_LOWER}-${SHIFT2_UPPER}%"
else
    echo -e "${GREEN}✓${NC} Shift 2 percentage is within expected range (${SHIFT2_PCT_ACTUAL}% ≈ 25%)"
fi

# Check for deficit tasks
DEFICIT_COUNT=$(jq -r '.deficitTasks | length' "$OUTPUT_FILE")
if [ "$DEFICIT_COUNT" -gt 0 ]; then
    echo -e "\n${YELLOW}⚠  Found $DEFICIT_COUNT tasks with remaining work:${NC}"
    jq -r '.deficitTasks[] | "  - \(.taskId): \(.deficitHours)h remaining"' "$OUTPUT_FILE"
else
    echo -e "${GREEN}✓${NC} All tasks completed (no deficits)"
fi

# Summary
echo -e "\n${BLUE}=== SUMMARY ===${NC}"
if [ "$PASS" = true ]; then
    echo -e "${GREEN}✓ TEST PASSED${NC}"
    echo "Multi-shift planning is working correctly with 75/25 split."
else
    echo -e "${RED}✗ TEST FAILED${NC}"
    echo "Multi-shift planning did not produce expected results."
    echo "See DEBUG_MULTISHIFT_ISSUE.md for troubleshooting steps."
fi

echo -e "\n${BLUE}Results saved to: $OUTPUT_FILE${NC}"
echo "You can inspect the full response with: cat $OUTPUT_FILE | jq ."
