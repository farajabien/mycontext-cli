# Testing TailorYourCV with Flow Testing MCP Server

## Overview

This guide covers end-to-end testing of the **TailorYourCV** application ("The CV Laundry - Input Dirty, Output Clean") using the Flow Testing MCP Server integrated with MyContext CLI.

**Project**: TailorYourCV
**Test URL**: http://localhost:3000
**Test Infrastructure**: Flow Testing MCP Server (AI-powered browser automation)
**Test Location**: `/Users/farajabien/Desktop/ahh work/personal/mycontext-cli-standalone`

## Test Missions

The test suite includes 3 comprehensive test missions:

### 1. Update CV Flow (`update-cv-flow`)

**Purpose**: Test the "Refresh My CV" workflow
**Duration**: ~2-3 minutes
**Tags**: `update`, `cv-upload`, `processing`, `auth`, `download`

**Flow**:
1. Navigate to localhost:3000
2. Click "Refresh My CV" button to switch modes
3. Upload CV file by clicking the upload area
4. Enter update notes: "Promoted to Senior Engineer in December 2024. Led team of 5 developers. Reduced API latency by 40% through optimization"
5. Click "Refresh This CV" button
6. Handle authentication by choosing "Continue as Guest"
7. Wait for processing to complete (~10-30 seconds)
8. Navigate to "My CVs" page by clicking the header button
9. Find the newest CV card
10. Click to preview it
11. Download the CV file

**Expected Outcome**: CV is successfully updated, processed, appears in My CVs page, can be previewed and downloaded

**Validation Rules**:
- Mode toggle buttons are visible
- File upload area exists
- Update notes textarea is visible
- "Refresh This CV" button is visible
- URL navigates to `/my-cvs`
- CV card is visible in My CVs

### 2. Tailor CV Flow (`tailor-cv-flow`)

**Purpose**: Test the "Tailor for a Job" workflow with payment
**Duration**: ~3-4 minutes
**Tags**: `tailor`, `job-description`, `payment`, `download`, `cover-letter`

**Flow**:
1. Navigate to localhost:3000
2. Ensure "Tailor for a Job" mode is selected
3. Upload CV if not already persisted
4. Paste job description from test fixtures
5. Click "Tailor for this Job" button
6. Complete authentication as guest
7. Wait for processing (~10-30 seconds)
8. On preview page, handle payment:
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
9. Complete payment
10. Download both CV and cover letter files

**Expected Outcome**: CV is tailored for the job, payment is processed successfully, CV and cover letter are downloadable

**Validation Rules**:
- "Tailor for a Job" button is selected
- Job description textarea is visible
- "Tailor for this Job" button is clickable
- Processing page shows progress
- Payment form appears
- Download button is visible after payment

### 3. End-to-End Complete Flow (`e2e-flow`)

**Purpose**: Test both Update and Tailor flows in sequence
**Duration**: ~5-7 minutes
**Tags**: `end-to-end`, `update`, `tailor`, `complete-workflow`

**Flow**:
1. Execute complete Update CV flow (as above)
2. Return to home page
3. Switch to "Tailor for a Job" mode
4. Execute complete Tailor CV flow (as above)
5. Verify both CVs appear in My CVs with different purposes
6. Verify job description is saved and viewable

**Expected Outcome**: Both Update and Tailor flows complete successfully, two CVs exist in My CVs with different metadata, both are downloadable, job description is saved

**Validation Rules**:
- Mode toggle works for both modes
- Navigation through all pages succeeds
- Multiple CV cards exist in My CVs
- "View JD" button is visible for tailored CV
- Download buttons available for both CVs

## Setup Instructions

### Prerequisites

Before running tests, ensure you have:

1. **TailorYourCV Running**
   ```bash
   cd /Users/farajabien/Desktop/ahh\ work/personal/tailor-your-cv
   pnpm dev
   # Should be accessible at http://localhost:3000
   ```

2. **MyContext CLI Built**
   ```bash
   cd /Users/farajabien/Desktop/ahh\ work/personal/mycontext-cli-standalone
   pnpm build
   # Or if globally installed: mycontext --version
   ```

3. **Sample CV File**
   - Place a `sample-cv.pdf` or `sample-cv.docx` in `test-fixtures/` directory
   - See `test-fixtures/README-CV-SETUP.md` for detailed instructions
   - File must be under 5MB
   - Can be a dummy CV (doesn't need to be real)

4. **Environment Configuration**
   - TailorYourCV `.env` file properly configured
   - InstantDB credentials set
   - GitHub Models API key configured
   - Stripe sandbox mode enabled

### File Structure

After setup, your test infrastructure should look like:

```
mycontext-cli-standalone/
├── test-fixtures/
│   ├── tailor-cv-test-missions.json     # Test mission definitions
│   ├── sample-cv.pdf                    # YOUR CV FILE (required)
│   ├── sample-job-description.txt       # Job description for testing
│   └── README-CV-SETUP.md               # CV setup instructions
├── scripts/
│   └── test-tailor-cv.sh                # Test execution script
└── docs/
    └── testing-tailor-cv.md             # This file
```

## Running Tests

### Quick Start

```bash
# Interactive mode (recommended for first time)
./scripts/test-tailor-cv.sh

# Run specific test
./scripts/test-tailor-cv.sh update     # Update CV Flow
./scripts/test-tailor-cv.sh tailor     # Tailor CV Flow
./scripts/test-tailor-cv.sh e2e        # End-to-End Flow

# Run all tests sequentially
./scripts/test-tailor-cv.sh all

# List available test missions
./scripts/test-tailor-cv.sh list

# View test reports
./scripts/test-tailor-cv.sh reports
```

### Using MyContext CLI Directly

```bash
# Import missions first (if not already imported)
mycontext test:import test-fixtures/tailor-cv-test-missions.json

# Run a specific test
mycontext test:run update-cv-flow --url http://localhost:3000 --no-headless --slow-mo 500

# Run with custom options (headless mode)
mycontext test:run tailor-cv-flow \
  --url http://localhost:3000 \
  --slow-mo 300

# List all test executions
mycontext test:list

# View detailed report for a test execution
mycontext test:report <execution-id>
```

### Test Options

**Recommended settings for development**:
- `--no-headless`: Watch the AI navigate (great for debugging)
- `--slow-mo 500`: Slow down actions by 500ms (easier to follow)

**Settings for CI/CD**:
- `--headless`: Run without browser UI (default)
- `--slow-mo 0`: Full speed execution
- `--timeout 90000`: Allow up to 90 seconds for complex flows

### Importing Test Missions

Before running tests, you need to import the test missions from the JSON file:

```bash
# Import missions (only needed once, or when missions are updated)
mycontext test:import test-fixtures/tailor-cv-test-missions.json

# Verify missions were imported
mycontext test:list
```

The test script (`./scripts/test-tailor-cv.sh`) automatically imports missions if they're not already loaded.

## Expected Behavior

### Update CV Flow

**Timeline**:
- 0:00 - Load homepage
- 0:05 - Switch to "Refresh My CV" mode
- 0:10 - Upload CV file
- 0:15 - Enter update notes
- 0:20 - Click "Refresh This CV"
- 0:25 - Authenticate as guest
- 0:30 - Processing starts
- 1:00 - Processing completes
- 1:05 - Navigate to My CVs
- 1:10 - Preview CV
- 1:15 - Download CV
- 1:20 - Test complete

**Screenshots Captured**:
- Initial homepage
- Mode switch
- File uploaded
- Notes entered
- Authentication screen
- Processing screen
- My CVs page
- CV preview
- Download confirmation

### Tailor CV Flow

**Timeline**:
- 0:00 - Load homepage
- 0:05 - Verify "Tailor for a Job" mode
- 0:10 - Upload CV (or use persisted)
- 0:15 - Paste job description
- 0:20 - Click "Tailor for this Job"
- 0:25 - Authenticate as guest
- 0:30 - Processing starts
- 1:00 - Processing completes
- 1:05 - Preview page loads
- 1:10 - Enter payment details
- 1:20 - Payment processes
- 1:25 - Download CV
- 1:30 - Download cover letter
- 1:35 - Test complete

**Screenshots Captured**:
- Homepage with "Tailor" mode
- Job description pasted
- File uploaded confirmation
- Authentication screen
- Processing screen
- Preview page
- Payment form
- Payment success
- Download buttons

### End-to-End Flow

Combines both flows above sequentially, validating:
- State persistence between flows
- Multiple CVs in My CVs page
- Different metadata (purpose: "update" vs "tailor")
- Job description viewable for tailored CV
- Both downloads work independently

## Troubleshooting

### Common Issues

#### 1. "TailorYourCV is not running"

**Error**: Cannot connect to http://localhost:3000

**Solution**:
```bash
cd /Users/farajabien/Desktop/ahh\ work/personal/tailor-your-cv
pnpm dev
# Wait for "Ready on http://localhost:3000"
```

#### 2. "Sample CV file not found"

**Error**: No sample-cv.pdf or sample-cv.docx in test-fixtures/

**Solution**:
```bash
# Check if file exists
ls test-fixtures/sample-cv.pdf

# If not, follow instructions in test-fixtures/README-CV-SETUP.md
# Quick option: use any PDF CV you have
cp ~/path/to/your/cv.pdf test-fixtures/sample-cv.pdf
```

#### 3. "MyContext CLI not found"

**Error**: Command 'mycontext' not found

**Solution**:
```bash
# Build the CLI
cd /Users/farajabien/Desktop/ahh\ work/personal/mycontext-cli-standalone
pnpm build

# The script will automatically use the local build
# Alternatively, link it globally:
pnpm link --global
```

#### 4. "Test missions file not found"

**Error**: tailor-cv-test-missions.json not found

**Solution**:
```bash
# Verify file exists
ls test-fixtures/tailor-cv-test-missions.json

# If missing, it should be created in the repository
# Check git status to see if it's uncommitted
git status
```

#### 5. File upload fails during test

**Symptoms**: AI cannot find or click upload area

**Solutions**:
- Ensure CV file exists and has correct permissions: `chmod 644 test-fixtures/sample-cv.pdf`
- Check file size is under 5MB: `ls -lh test-fixtures/sample-cv.pdf`
- Verify file is valid PDF/DOCX: `file test-fixtures/sample-cv.pdf`

#### 6. Payment fails during Tailor flow

**Symptoms**: Payment processing error or card declined

**Solutions**:
- Verify Stripe is in sandbox/test mode in TailorYourCV `.env`
- Confirm test card number is correct: `4242 4242 4242 4242`
- Check Stripe API keys are properly configured
- Look for Stripe errors in TailorYourCV terminal output

#### 7. Processing takes too long / times out

**Symptoms**: Test fails during "wait for processing" step

**Solutions**:
- Check TailorYourCV terminal for API errors
- Verify GitHub Models API key is valid
- Ensure InstantDB is accessible
- Increase timeout: `--timeout=120000` (2 minutes)
- Check network connectivity

#### 8. Authentication issues

**Symptoms**: Cannot authenticate as guest

**Solutions**:
- Check TailorYourCV terminal for authentication errors
- Verify InstantDB configuration in `.env`
- Clear browser storage if persisted state is causing issues
- Ensure "Continue as Guest" button is visible in UI

### Test Execution Failures

If a test fails, check:

1. **Screenshot**: Located in `.mycontext/test-reports/<execution-id>/screenshots/`
2. **Logs**: Run `mycontext test:report <execution-id>` for detailed logs
3. **Browser Console**: Run with `--headless=false` to see browser console
4. **Network Tab**: Check for failed API requests in browser DevTools

### Getting Help

If issues persist:

1. Check test execution report:
   ```bash
   mycontext test:list
   mycontext test:report <execution-id>
   ```

2. Review screenshots in `.mycontext/test-reports/`

3. Check TailorYourCV application logs for errors

4. Verify all prerequisites are met (see Setup Instructions above)

## Video Demo Preparation

### Pre-Recording Checklist

Before filming demo videos:

- [ ] TailorYourCV is running on localhost:3000
- [ ] Application is clean (no test data in My CVs)
- [ ] Sample CV file is ready and realistic-looking
- [ ] Job description is prepared (use sample-job-description.txt)
- [ ] Browser window is sized appropriately for recording
- [ ] Terminal is visible if showing test execution
- [ ] All tests have been run successfully at least once
- [ ] Screenshots look good (check `.mycontext/test-reports/`)

### Recording the Update Flow

**Script**:
1. Show homepage
2. Explain "Refresh My CV" mode
3. Upload CV
4. Add update notes (promote to Senior Engineer, led team, reduced latency)
5. Click "Refresh This CV"
6. Authenticate as guest
7. Wait for processing (can speed up in edit)
8. Navigate to My CVs
9. Preview the updated CV
10. Download and show the file

**Tips**:
- Run with `--headless=false --slow-mo=800` for smooth recording
- Pause narration during processing
- Zoom in on key UI elements (upload, buttons, preview)
- Show before/after of CV if possible

### Recording the Tailor Flow

**Script**:
1. Start from homepage
2. Explain "Tailor for a Job" mode
3. Upload CV (or show it's persisted)
4. Paste job description
5. Click "Tailor for this Job"
6. Authenticate
7. Wait for processing
8. Preview tailored CV
9. Enter payment (use test card visibly)
10. Show payment success
11. Download CV
12. Download cover letter

**Tips**:
- Emphasize the job description matching
- Show how payment is integrated
- Highlight the cover letter generation
- Compare tailored CV to original if possible

### Recording the Complete E2E Flow

**Script**:
1. Show clean application state
2. Run Update flow (shortened)
3. Show CV in My CVs with "update" purpose
4. Return to home
5. Run Tailor flow (shortened)
6. Show both CVs in My CVs
7. Click "View JD" on tailored CV to show saved job description
8. Download both CVs to demonstrate they're different

**Tips**:
- This is the longest demo (5-7 minutes)
- Can speed up processing sections in edit
- Focus on the "before/after" comparison
- Highlight state persistence (file upload remembered)

### Post-Recording

After recording:
1. Review test reports for any anomalies
2. Check screenshots for privacy (no personal info visible)
3. Verify all flows completed successfully
4. Archive test execution data for reference

## Test Configuration

### Browser Configuration

The test suite uses these default browser settings (defined in `tailor-cv-test-missions.json`):

```json
{
  "browserConfig": {
    "headless": false,
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "slowMo": 500,
    "timeout": 60000,
    "screenshotOnFailure": true,
    "recordVideo": false
  }
}
```

**Customization**:
- Override these settings using CLI flags
- Adjust viewport for mobile testing
- Enable video recording for detailed analysis
- Increase timeout for slower networks

### Test Data

**Update Notes** (from testData):
```
Promoted to Senior Engineer in December 2024. Led team of 5 developers.
Reduced API latency by 40% through optimization. Added new skills: TypeScript,
Next.js, System Design.
```

**Job Description** (from sample-job-description.txt):
- Position: Senior Full-Stack Engineer
- Company: TechCorp Innovations
- Tech Stack: React 18+, Next.js 14+, TypeScript, Node.js, PostgreSQL
- Full job description in `test-fixtures/sample-job-description.txt`

**Payment Test Card**:
- Number: `4242 4242 4242 4242`
- Expiry: `12/25`
- CVC: `123`
- This is Stripe's standard test card for successful payments

## Test Reports

### Viewing Reports

```bash
# List all test executions
mycontext test:list

# Output example:
# ID: abc123 | Mission: update-cv-flow | Status: passed | Date: 2026-02-08
# ID: def456 | Mission: tailor-cv-flow | Status: passed | Date: 2026-02-08

# View detailed report
mycontext test:report abc123
```

### Report Contents

Each test execution generates:
- **Execution ID**: Unique identifier
- **Status**: passed, failed, or error
- **Duration**: Total time taken
- **Screenshots**: Captured at each step
- **Logs**: Detailed action logs
- **Errors**: Any errors encountered
- **Validation Results**: Which validation rules passed/failed

### Report Location

Reports are stored in:
```
.mycontext/
└── test-reports/
    ├── <execution-id-1>/
    │   ├── report.json
    │   └── screenshots/
    ├── <execution-id-2>/
    │   ├── report.json
    │   └── screenshots/
    └── ...
```

## Advanced Usage

### Creating Custom Test Missions

Add new missions to `test-fixtures/tailor-cv-test-missions.json`:

```json
{
  "id": "quick-update",
  "name": "Quick Update Test",
  "description": "Fast update flow without download",
  "mission": "Navigate to localhost:3000, switch to Update mode, upload CV, add notes 'Quick update test', click Refresh, authenticate, wait for processing, verify success",
  "expectedOutcome": "CV is processed successfully",
  "startUrl": "http://localhost:3000",
  "tags": ["quick", "update"],
  "validationRules": [
    {
      "type": "url-match",
      "expectedValue": "/preview"
    }
  ]
}
```

### Running Tests in CI/CD

Example GitHub Actions workflow:

```yaml
name: TailorYourCV E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Build MyContext CLI
        run: pnpm build

      - name: Start TailorYourCV
        run: |
          cd ../tailor-your-cv
          pnpm install
          pnpm dev &
          sleep 10

      - name: Run tests
        run: ./scripts/test-tailor-cv.sh all
        env:
          HEADLESS: true

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: .mycontext/test-reports/
```

### Debugging Tips

**Enable verbose logging**:
```bash
DEBUG=mycontext:* mycontext test:run update-cv-flow
```

**Run with browser DevTools**:
- Use `--headless=false`
- Add `--devtools=true` flag (if available)
- Inspect elements during test execution

**Pause on failure**:
- Use `--pause-on-failure=true` to pause browser when test fails
- Allows manual inspection of state

**Custom validation**:
- Add more validation rules to `tailor-cv-test-missions.json`
- Use different validation types: `element-visible`, `text-contains`, `url-match`, `element-exists`

## Notes and Considerations

### Important Testing Notes

1. **Payments are in sandbox mode**: Always use test card `4242 4242 4242 4242`
2. **Authentication uses guest mode**: No real account creation needed for tests
3. **File upload requires real CV**: Must have `sample-cv.pdf` in test-fixtures/
4. **Processing may take 10-30 seconds**: Depends on API response times
5. **Screenshots captured at each step**: Great for debugging and documentation
6. **Tests should run with --headless=false**: To observe AI navigation during development

### Performance Considerations

- First run may be slower (cold start, dependencies)
- Subsequent runs are faster (file persistence, warm browser)
- Processing time depends on:
  - GitHub Models API response time
  - CV complexity
  - Network latency
  - InstantDB write speed

### Privacy and Security

- Do NOT use real personal CVs if repository is public
- Test card is Stripe's official test card (safe to commit)
- Guest authentication doesn't create real accounts
- All test data should be fake/sample data
- Clear test data before sharing screenshots/videos

### Future Enhancements

Potential additions to test suite:
- Mobile viewport testing
- Error handling tests (invalid file, network errors)
- Performance testing (load times, processing speed)
- Accessibility testing (keyboard navigation, screen readers)
- Multi-browser testing (Chrome, Firefox, Safari)
- API integration tests (separate from UI tests)

## References

- **Flow Testing MCP Server**: `docs/roadmap/06-flow-testing-mcp-server.md`
- **MyContext CLI**: `README.md`
- **TailorYourCV**: `/Users/farajabien/Desktop/ahh work/personal/tailor-your-cv/README.md`
- **Test Fixtures Setup**: `test-fixtures/README-CV-SETUP.md`
- **Test Missions**: `test-fixtures/tailor-cv-test-missions.json`

---

**Ready to Test?**

1. ✅ Verify prerequisites
2. ✅ Add sample-cv.pdf to test-fixtures/
3. ✅ Start TailorYourCV: `cd tailor-your-cv && pnpm dev`
4. ✅ Run tests: `./scripts/test-tailor-cv.sh`
5. ✅ Watch the AI navigate your application
6. ✅ Review reports and screenshots
7. ✅ Film your demo videos

**Happy Testing!**
