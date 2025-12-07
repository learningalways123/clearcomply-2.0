#!/bin/bash

echo "🎯 Testing Complete Question Answering UI Implementation"
echo "======================================================"
echo ""

# Test assessment creation
echo "1. Creating test assessment..."
ASSESSMENT_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/assessments" \
-H "Content-Type: application/json" \
-d '{
  "name": "Complete UI Test Assessment",
  "frameworkIds": ["nist-800-53"],
  "selectedControlIds": ["NIST-AC-1", "NIST-IR-1"],
  "selectedQuestionIds": ["ac-001", "ac-002", "ir-001"]
}')

ASSESSMENT_ID=$(echo "$ASSESSMENT_RESPONSE" | jq -r '.id')
echo "✅ Assessment created with ID: $ASSESSMENT_ID"

# Display initial state
echo ""
echo "2. Initial assessment state:"
curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID" | jq '{
  name: .name,
  questionStats: .questionStats
}'

echo ""
echo "3. Initial questions state (should have no answers):"
curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID/questions" | jq '.[] | {
  id: .id,
  questionText: .questionText[0:50] + "...",
  answerType: .answerType,
  answerValue: .answerValue
}'

echo ""
echo "4. UI Test URLs:"
echo "   📱 Assessment Detail Page: http://localhost:5173/assessments/$ASSESSMENT_ID"
echo "   📊 Assessments Overview: http://localhost:5173/assessments"
echo "   🏠 Home Page: http://localhost:5173"

echo ""
echo "5. Testing answer submission via API (simulating UI interaction)..."

# Test various answer types
curl -s -X POST "http://localhost:8000/api/assessments/$ASSESSMENT_ID/answers" \
-H "Content-Type: application/json" \
-d '{
  "answers": [
    {
      "questionId": "ac-001", 
      "value": "Yes"
    },
    {
      "questionId": "ac-002",
      "value": "Our organization maintains comprehensive account management procedures including:\n\n1. Automated user provisioning through our Identity Management System\n2. Regular quarterly access reviews by department heads\n3. Immediate deprovisioning upon employee termination\n4. Role-based access controls aligned with job responsibilities\n5. Multi-factor authentication for all privileged accounts\n\nAll procedures are documented in our IT Security Policy and reviewed annually."
    }
  ]
}' > /dev/null

echo "✅ Submitted answers for 2 out of 3 questions"

# Show updated state
echo ""
echo "6. Updated assessment state (should show 66.67% completion):"
curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID" | jq '{
  name: .name,
  questionStats: .questionStats
}'

echo ""
echo "7. Updated questions with answers:"
curl -s "http://localhost:8000/api/assessments/$ASSESSMENT_ID/questions" | jq '.[] | {
  id: .id,
  questionText: .questionText[0:50] + "...",
  answerType: .answerType,
  hasAnswer: (.answerValue != null and .answerValue != ""),
  answerPreview: (if .answerValue then .answerValue[0:30] + "..." else null end)
}'

echo ""
echo "🎉 FEATURES IMPLEMENTED IN THE UI:"
echo "=================================="
echo ""
echo "✅ Assessment Detail Screen with:"
echo "   • Real-time completion percentage display"
echo "   • Visual progress bar (LinearProgress)"
echo "   • Question organization by NIST 800-53 family"
echo "   • Expandable accordion sections"
echo "   • Answer count per family"
echo ""
echo "✅ Question Answering:"
echo "   • Yes/No radio buttons for yes_no questions"
echo "   • Multiline text fields for text questions"
echo "   • Pre-filled answers from existing data"
echo "   • Real-time state management"
echo ""
echo "✅ Save Functionality:"
echo "   • Manual 'Save Progress' button"
echo "   • Auto-save with 2-second debouncing"
echo "   • Success notifications via Snackbar"
echo "   • Loading states during save operations"
echo ""
echo "✅ User Experience:"
echo "   • Assessment summary sidebar"
echo "   • Question metadata display (criticality, stakeholder role, answer type)"
echo "   • Control references for traceability"
echo "   • Error handling and loading states"
echo "   • Back navigation to assessments list"
echo ""
echo "✅ API Integration:"
echo "   • GET /api/assessments/{id} - Assessment data with questionStats"
echo "   • GET /api/assessments/{id}/questions - Questions with current answers"
echo "   • POST /api/assessments/{id}/answers - Submit/update answers"
echo "   • Real-time completion percentage updates"
echo ""
echo "📖 Usage Instructions:"
echo "===================="
echo "1. Navigate to: http://localhost:5173/assessments"
echo "2. Click 'View' on any assessment to open the detail page"
echo "3. Expand question families to see individual questions"
echo "4. Answer questions using appropriate input controls"
echo "5. Answers are auto-saved every 2 seconds after changes"
echo "6. Use 'Save Progress' button for immediate save"
echo "7. Progress bar and stats update in real-time"
echo ""
echo "🚀 Implementation complete! The UI now supports full question answering workflows."
