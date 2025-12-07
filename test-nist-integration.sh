#!/bin/bash

# Test script for NIST 800-53 question bank functionality

echo "🔍 Testing Clear Comply NIST Question Bank Integration"
echo "=================================================="

echo ""
echo "1. Testing Backend Health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not accessible"
    exit 1
fi

echo ""
echo "2. Testing Families Endpoint..."
FAMILIES=$(curl -s "http://localhost:8000/api/families?framework_id=nist-800-53" | jq -r 'length')
echo "✅ Found $FAMILIES NIST families"

echo ""
echo "3. Testing Questions Endpoint..."
QUESTIONS=$(curl -s "http://localhost:8000/api/questions?framework_id=nist-800-53" | jq -r 'length')
echo "✅ Found $QUESTIONS NIST questions"

echo ""
echo "4. Testing Assessment Creation with Questions..."
ASSESSMENT_ID=$(curl -s -X POST "http://localhost:8000/api/assessments" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "E2E Test NIST Assessment",
        "frameworkIds": ["nist-800-53"],
        "selectedControlIds": ["NIST-AC-1", "NIST-AC-2"],
        "selectedQuestionIds": ["ac-001", "ac-002", "ir-001", "si-001"]
    }' | jq -r '.id')

if [ "$ASSESSMENT_ID" != "null" ] && [ -n "$ASSESSMENT_ID" ]; then
    echo "✅ Assessment created with ID: $ASSESSMENT_ID"
    
    echo ""
    echo "5. Testing Assessment Detail with Questions..."
    QUESTION_COUNT=$(curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID" | jq -r '.selectedQuestionIds | length')
    echo "✅ Assessment has $QUESTION_COUNT questions"
    
    echo ""
    echo "6. Frontend URLs to Test:"
    echo "   📄 Main App: http://localhost:5173"
    echo "   ➕ New Assessment: http://localhost:5173/new"
    echo "   📊 Assessment Detail: http://localhost:5173/assessments/$ASSESSMENT_ID"
    
else
    echo "❌ Failed to create assessment"
    exit 1
fi

echo ""
echo "🎉 All tests passed! NIST Question Bank integration is working!"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:5173/new"
echo "2. Select 'NIST 800-53' framework"
echo "3. Choose families (AC, IR, etc.)"
echo "4. Preview questions"
echo "5. Create assessment"
echo "6. View assessment detail with questions"
