# E2E Tests with Playwright

This directory contains end-to-end tests for the Rule Engine application using Playwright.

## Prerequisites

1. **Backend must be running** on `http://localhost:8092`
   ```bash
   cd ../backend
   mvn spring-boot:run
   ```

2. **Frontend dev server must be running** on `http://localhost:3000`
   ```bash
   npm run dev
   ```
   
   **Note:** Start the dev server in a separate terminal before running tests. The webServer auto-start has been disabled to avoid timeout issues.

## Setup

1. Install dependencies:
```bash
npm install
```

2. **IMPORTANT: Install Playwright browsers** (required before running tests):
```bash
npm run test:e2e:install
# or
npx playwright install chromium
```

   This will download the Chromium browser executable needed to run tests.

3. **Check your environment** (optional but recommended):
```bash
npm run test:e2e:check
```

   This script verifies that:
   - Playwright browsers are installed
   - Frontend server is running on port 3000
   - Backend server is running on port 8092

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run a specific test file
```bash
# Run individual tests (recommended for debugging)
npx playwright test 01-create-schema
npx playwright test 02-create-project
npx playwright test 03-create-rule
npx playwright test 04-execute-rule

# Run full flow test
npx playwright test 00-full-flow

# Run original comprehensive test
npx playwright test fraud-mitigation
```

## Test Structure

- `tests/e2e/` - End-to-end test files
  - `00-full-flow.spec.ts` - Complete end-to-end test (all steps)
  - `01-create-schema.spec.ts` - Test schema creation (run this first)
  - `02-create-project.spec.ts` - Test project creation (requires schemas)
  - `03-create-rule.spec.ts` - Test rule creation (requires project)
  - `04-execute-rule.spec.ts` - Test rule execution (requires project with rules)
  - `fraud-mitigation.spec.ts` - Original comprehensive test (may be deprecated)
  - `setup.spec.ts` - Environment setup verification

## Test Scenarios

### Fraud Mitigation Test
This test automates the creation of a complete fraud mitigation system:

1. **Schema Creation**:
   - Transaction schema (input)
   - User schema (input)
   - RiskScore schema (output)

2. **Project Creation**:
   - Creates "Fraud Mitigation System" project
   - Links Transaction and User as input schemas
   - Links RiskScore as output schema

3. **Complex Rule Creation**:
   - Rule: "High-Risk Transaction Detector"
   - Conditions:
     - Transaction amount > $10,000
     - User totalTransactions > 5
     - Nested condition: Location mismatch (lastLoginLocation.country != transaction location)
   - Actions:
     - Creates RiskScore fact with HIGH risk level

4. **Rule Execution**:
   - Tests rule execution with sample transaction and user data
   - Verifies rule fires correctly

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:3000` (matches Vite dev server port)
- Dev server must be started manually before running tests
- Uses Chromium browser by default
- Generates HTML reports on failure

## Debugging

1. **Run in debug mode**:
```bash
npx playwright test --debug
```

2. **View trace**:
```bash
npx playwright show-trace trace.zip
```

3. **Screenshots**: Automatically captured on failure in `test-results/`

## Troubleshooting

### Error: "Executable doesn't exist"
**Solution:** Run `npx playwright install chromium` to download browsers.

### Error: "connect EPERM" or connection refused
**Solution:** 
1. Make sure frontend dev server is running: `npm run dev`
2. Make sure backend is running on port 8092
3. Check that Vite proxy is configured correctly in `vite.config.ts`

### Tests timeout
**Solution:** 
- Increase timeout in test file: `test.setTimeout(300000)` (5 minutes)
- Check that both servers are running and accessible

## Notes

- Tests assume the backend is running on `http://localhost:8092`
- Tests assume the frontend is running on `http://localhost:3000`
- Tests clean up after themselves (you may want to add cleanup steps)
- The test creates real data in the database

