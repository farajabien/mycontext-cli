#!/bin/bash

# TailorYourCV Test Execution Script
# Uses Flow Testing MCP Server to test the complete CV Laundry workflow

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/farajabien/Desktop/ahh work/personal/mycontext-cli-standalone"
TAILOR_CV_ROOT="/Users/farajabien/Desktop/ahh work/personal/tailor-your-cv"
TEST_URL="http://localhost:3000"
MISSIONS_FILE="$PROJECT_ROOT/test-fixtures/tailor-cv-test-missions.json"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TailorYourCV Flow Testing Suite${NC}"
echo -e "${BLUE}  Testing the CV Laundry: Input Dirty, Output Clean${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_section "Checking Prerequisites"

    local all_good=true

    # Check if TailorYourCV is running
    echo -n "Checking if TailorYourCV is running at $TEST_URL... "
    if curl -s -f "$TEST_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}ERROR: TailorYourCV is not running at $TEST_URL${NC}"
        echo "Please start the application:"
        echo "  cd $TAILOR_CV_ROOT"
        echo "  pnpm dev"
        all_good=false
    fi

    # Check if sample CV exists
    echo -n "Checking for sample CV file... "
    if [ -f "$PROJECT_ROOT/test-fixtures/sample-cv.pdf" ] || [ -f "$PROJECT_ROOT/test-fixtures/sample-cv.docx" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠${NC}"
        echo -e "${YELLOW}WARNING: No sample CV found in test-fixtures/${NC}"
        echo "Please add a sample-cv.pdf or sample-cv.docx file"
        echo "See test-fixtures/README-CV-SETUP.md for instructions"
        all_good=false
    fi

    # Check if mycontext command exists
    echo -n "Checking if MyContext CLI is available... "
    if command -v mycontext &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
    elif [ -f "$PROJECT_ROOT/dist/cli.js" ]; then
        echo -e "${GREEN}✓ (local)${NC}"
        # Create alias for local development
        alias mycontext="node $PROJECT_ROOT/dist/cli.js"
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}ERROR: MyContext CLI not found${NC}"
        echo "Please build the project:"
        echo "  cd $PROJECT_ROOT"
        echo "  pnpm build"
        all_good=false
    fi

    # Check if test missions file exists
    echo -n "Checking for test missions file... "
    if [ -f "$MISSIONS_FILE" ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}ERROR: Test missions file not found at $MISSIONS_FILE${NC}"
        all_good=false
    fi

    if [ "$all_good" = false ]; then
        echo ""
        echo -e "${RED}❌ Prerequisites check failed. Please fix the issues above and try again.${NC}"
        exit 1
    fi

    # Check if missions are imported
    echo -n "Checking if test missions are imported... "
    if mycontext test:list 2>/dev/null | grep -q "update-cv-flow\|tailor-cv-flow\|e2e-flow"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ (importing)${NC}"
        echo ""
        echo -e "${BLUE}Importing test missions from $MISSIONS_FILE...${NC}"
        if mycontext test:import "$MISSIONS_FILE"; then
            echo -e "${GREEN}✓ Missions imported successfully${NC}"
        else
            echo -e "${RED}✗ Failed to import missions${NC}"
            exit 1
        fi
    fi

    echo ""
    echo -e "${GREEN}✓ All prerequisites met!${NC}"
}

# Function to run a single test
run_test() {
    local test_name=$1
    local test_description=$2

    print_section "Running: $test_description"

    echo "Test ID: $test_name"
    echo "URL: $TEST_URL"
    echo ""
    echo "Starting test execution..."
    echo ""

    # Run the test with mycontext CLI
    # Note: We use --no-headless so you can see the AI navigate
    if mycontext test:run "$test_name" --url "$TEST_URL" --no-headless --slow-mo 500; then
        echo ""
        echo -e "${GREEN}✓ Test passed: $test_description${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Test failed: $test_description${NC}"
        return 1
    fi
}

# Function to display menu
show_menu() {
    echo ""
    echo -e "${YELLOW}Select a test to run:${NC}"
    echo ""
    echo "  1) Update CV Flow (Refresh My CV)"
    echo "  2) Tailor CV Flow (Tailor for a Job)"
    echo "  3) End-to-End Complete Flow (Both)"
    echo "  4) Run All Tests Sequentially"
    echo "  5) View Test Reports"
    echo "  6) List All Test Missions"
    echo "  7) Exit"
    echo ""
    echo -n "Enter choice [1-7]: "
}

# Function to view test reports
view_reports() {
    print_section "Test Reports"

    if command -v mycontext &> /dev/null; then
        mycontext test:list

        echo ""
        echo "To view a specific report:"
        echo "  mycontext test:report <execution-id>"
    else
        echo -e "${YELLOW}No reports available yet. Run some tests first!${NC}"
    fi
}

# Function to list test missions
list_missions() {
    print_section "Available Test Missions"

    echo "Reading from: $MISSIONS_FILE"
    echo ""

    if [ -f "$MISSIONS_FILE" ]; then
        # Parse JSON and display missions (requires jq)
        if command -v jq &> /dev/null; then
            jq -r '.missions[] | "\(.id):\n  Name: \(.name)\n  Description: \(.description)\n  Tags: \(.tags | join(", "))\n"' "$MISSIONS_FILE"
        else
            # Fallback: just cat the file
            cat "$MISSIONS_FILE"
        fi
    else
        echo -e "${RED}Test missions file not found!${NC}"
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"

    # Check prerequisites
    check_prerequisites

    # If arguments provided, run specific test
    if [ $# -gt 0 ]; then
        case $1 in
            update)
                run_test "update-cv-flow" "Update CV Flow"
                ;;
            tailor)
                run_test "tailor-cv-flow" "Tailor CV Flow"
                ;;
            e2e)
                run_test "e2e-flow" "End-to-End Complete Flow"
                ;;
            all)
                echo -e "${BLUE}Running all tests sequentially...${NC}"
                run_test "update-cv-flow" "Update CV Flow"
                echo ""
                sleep 2
                run_test "tailor-cv-flow" "Tailor CV Flow"
                echo ""
                sleep 2
                run_test "e2e-flow" "End-to-End Complete Flow"
                ;;
            list)
                list_missions
                ;;
            reports)
                view_reports
                ;;
            *)
                echo "Usage: $0 {update|tailor|e2e|all|list|reports}"
                echo ""
                echo "Examples:"
                echo "  $0 update    # Run Update CV Flow test"
                echo "  $0 tailor    # Run Tailor CV Flow test"
                echo "  $0 e2e       # Run End-to-End test"
                echo "  $0 all       # Run all tests"
                echo "  $0 list      # List all test missions"
                echo "  $0 reports   # View test reports"
                exit 1
                ;;
        esac
        exit 0
    fi

    # Interactive menu
    while true; do
        show_menu
        read -r choice

        case $choice in
            1)
                run_test "update-cv-flow" "Update CV Flow"
                ;;
            2)
                run_test "tailor-cv-flow" "Tailor CV Flow"
                ;;
            3)
                run_test "e2e-flow" "End-to-End Complete Flow"
                ;;
            4)
                echo ""
                echo -e "${BLUE}Running all tests sequentially...${NC}"
                run_test "update-cv-flow" "Update CV Flow"
                echo ""
                sleep 2
                run_test "tailor-cv-flow" "Tailor CV Flow"
                echo ""
                sleep 2
                run_test "e2e-flow" "End-to-End Complete Flow"
                ;;
            5)
                view_reports
                ;;
            6)
                list_missions
                ;;
            7)
                echo ""
                echo -e "${GREEN}Thanks for testing! Goodbye.${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please enter 1-7.${NC}"
                ;;
        esac

        echo ""
        echo -n "Press Enter to continue..."
        read -r
    done
}

# Run main function
main "$@"
