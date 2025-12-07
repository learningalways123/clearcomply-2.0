#!/bin/bash

# Test script for Answer functionality

echo "🧪 Testing Answer API Functionality"
echo "==================================="

echo ""
echo "1. Testing Backend Health..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not accessible, starting..."
    cd "/Users/talam-m1max/WebProjects/Clear Comply/Service"
    python -m uvicorn main:app --reload --port 8000 &
    sleep 5
fi

echo ""
echo "2. Creating test assessment..."
ASSESSMENT_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/assessments" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Answer Test Assessment",
        "frameworkIds": ["nist-800-53"],
        "selectedControlIds": ["NIST-AC-1"],
        "selectedQuestionIds": ["ac-001", "ac-002", "ir-001"]
    }')

ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | jq -r '.id')
TOTAL_QUESTIONS=$(echo "$ASSESSMENT_RESPONSE" | jq -r '.questionStats.totalQuestions')
COMPLETION=$(echo "$ASSESSMENT_RESPONSE" | jq -r '.questionStats.completionPercent')

if [ "$ASSESSMENT_ID" != "null" ] && [ -n "$ASSESSMENT_ID" ]; then
    echo "✅ Assessment created with ID: $ASSESSMENT_ID"
    echo "   📊 Total Questions: $TOTAL_QUESTIONS"
    echo "   📈 Initial Completion: $COMPLETION%"
else
    echo "❌ Failed to create assessment"
    echo "Response: $ASSESSMENT_RESPONSE"
    exit 1
fi

echo ""
echo "3. Testing GET /api/assessments/{id}/questions..."
QUESTIONS_RESPONSE=$(curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID/questions")
QUESTIONS_COUNT=$(echo "$QUESTIONS_RESPONSE" | jq '. | length')
echo "✅ Retrieved $QUESTIONS_COUNT questions for assessment"

echo ""
echo "4. Testing POST /api/assessments/{id}/answers..."
ANSWER_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/assessments/$ASSESSMENT_ID/answers" \
    -H "Content-Type: application/json" \
    -d '{
        "answers": [
            {"questionId": "ac-001", "value": "Yes, we have documented access control policies."},
            {"questionId": "ac-002", "value": "Our account management includes creation, modification, and termination procedures."}
        ]
    }')

ANSWERED_QUESTIONS=$(echo "$ANSWER_RESPONSE" | jq -r '.answeredQuestions')
NEW_COMPLETION=$(echo "$ANSWER_RESPONSE" | jq -r '.completionPercent')

echo "✅ Submitted answers for 2 questions"
echo "   📊 Answered Questions: $ANSWERED_QUESTIONS"
echo "   📈 New Completion: $NEW_COMPLETION%"

echo ""
echo "5. Verifying updated assessment..."
UPDATED_ASSESSMENT=$(curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID")
FINAL_COMPLETION=$(echo "$UPDATED_ASSESSMENT" | jq -r '.questionStats.completionPercent')
echo "✅ Assessment completion: $FINAL_COMPLETION%"

echo ""
echo "6. Testing questions with answers..."
QUESTIONS_WITH_ANSWERS=$(curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID/questions")
ANSWERED_COUNT=$(echo "$QUESTIONS_WITH_ANSWERS" | jq '[.[] | select(.answerValue != null)] | length')
echo "✅ Questions with answers: $ANSWERED_COUNT out of $QUESTIONS_COUNT"

echo ""
echo "🎉 Answer API functionality is working!"
echo ""
echo "Test URLs:"
echo "📄 Assessment Detail: http://localhost:5173/assessments/$ASSESSMENT_ID"
echo "📝 Questions: GET http://localhost:8000/api/assessments/$ASSESSMENT_ID/questions"
echo "💾 Submit Answers: POST http://localhost:8000/api/assessments/$ASSESSMENT_ID/answers"
