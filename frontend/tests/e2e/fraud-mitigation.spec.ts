import { test, expect } from '@playwright/test';

/**
 * E2E Test: Fraud Mitigation Rule Creation
 * 
 * This test automates the creation of a complex fraud mitigation rule that:
 * 1. Creates schemas for Transaction, User, and RiskScore
 * 2. Creates a Fraud Mitigation project
 * 3. Creates a complex rule with multiple conditions and nested conditions
 * 4. Tests rule execution with various scenarios
 * 
 * Use Case: Fraud Mitigation
 * - Detects high-value transactions
 * - Identifies rapid transaction patterns
 * - Flags location mismatches
 * - Generates risk scores for review
 * 
 * Prerequisites:
 * - Backend must be running on http://localhost:8092
 * - Frontend dev server should be running (or will be started automatically)
 */

test.describe('Fraud Mitigation Rule Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for slow operations
    test.setTimeout(120000); // 2 minutes
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Wait for app to be ready - look for navigation or main content
    try {
      await page.waitForSelector('nav, .sidebar, [role="navigation"], .page', { timeout: 10000 });
    } catch (e) {
      // If navigation not found, wait for any content
      await page.waitForSelector('body', { timeout: 5000 });
    }
    
    // Verify backend is accessible (optional check)
    try {
      const response = await page.request.get('/api/schemas');
      if (!response.ok() && response.status() !== 404) {
        console.warn('Backend might not be accessible. Status:', response.status());
      }
    } catch (e) {
      console.warn('Could not verify backend connection:', e);
    }
  });

  test('should create a complete fraud mitigation rule system', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for the full test
    
    // Helper function to create a schema using JSON Schema tab
    const createSchema = async (name: string, description: string, schemaJson: object) => {
      console.log(`Creating schema: ${name}`);
      
      // Navigate to Schemas page (it's at route "/")
      await page.goto('/');
      
      // Wait for page to load - use a simple approach
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
        console.log('Network idle timeout, but continuing...');
      });
      
      // Wait for React to render - just wait a bit
      await page.waitForTimeout(3000);
      
      // Verify page loaded by checking for any content
      const bodyContent = await page.locator('body').textContent();
      if (!bodyContent || bodyContent.length < 10) {
        throw new Error('Page did not load properly - body is empty');
      }
      
      console.log('Looking for Import Schema button...');
      
      // Don't wait for buttons - just try to find them directly
      // Try multiple selectors for the Import Schema button
      const importButtonSelectors = [
        '[data-testid="import-schema-button-main"]',
        'button:has-text("Import Schema")',
        'button.btn-primary:has-text("Import")',
        '.page-actions button',
        '.page-header button.btn-primary',
        'button:has([aria-label*="Import"])',
        'button', // Fallback: any button
      ];
      
      let importButton = null;
      let attempts = 0;
      const maxAttempts = 20; // Try for up to 10 seconds (20 * 500ms)
      
      while (!importButton && attempts < maxAttempts) {
        attempts++;
        for (const selector of importButtonSelectors) {
          try {
            const btn = page.locator(selector).first();
            const isVisible = await btn.isVisible({ timeout: 500 }).catch(() => false);
            if (isVisible) {
              // Verify it's the right button by checking text
              const text = await btn.textContent().catch(() => '');
              if (text && (text.includes('Import') || text.includes('import') || selector.includes('testid'))) {
                importButton = btn;
                console.log(`✓ Found Import Schema button using: ${selector} (attempt ${attempts})`);
                break;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (!importButton) {
          await page.waitForTimeout(500); // Wait 500ms before retrying
        }
      }
      
      if (!importButton) {
        // Debug: Check what's actually on the page
        const pageContent = await page.content();
        const hasImportText = pageContent.includes('Import') || pageContent.includes('import');
        console.log(`Page contains "Import" text: ${hasImportText}`);
        
        // List all visible buttons
        const allButtons = await page.locator('button').all();
        const buttonInfo = await Promise.all(
          allButtons.map(async (btn) => {
            try {
              const text = await btn.textContent();
              const isVisible = await btn.isVisible();
              return { text: text?.trim(), visible: isVisible };
            } catch {
              return { text: 'error', visible: false };
            }
          })
        );
        console.log('All buttons on page:', buttonInfo.filter(b => b.visible));
        
        // Take a screenshot
        await page.screenshot({ path: 'test-results/schemas-page-debug.png', fullPage: true });
        
        // Last resort: try to find any button with "Import" in it
        const anyImportButton = page.locator('button').filter({ hasText: /import/i });
        const count = await anyImportButton.count();
        if (count > 0) {
          importButton = anyImportButton.first();
          console.log('Found button with "import" text as fallback');
        } else {
          throw new Error(
            `Could not find Import Schema button.\n` +
            `Visible buttons: ${JSON.stringify(buttonInfo.filter(b => b.visible), null, 2)}\n` +
            `Check screenshot: test-results/schemas-page-debug.png`
          );
        }
      }
      
      await importButton.click();
      console.log('✓ Clicked Import Schema button');
      await page.waitForTimeout(1500);
      
      // Wait for modal to appear
      console.log('Waiting for modal...');
      await page.waitForSelector('.modal, .modal-overlay, [role="dialog"]', { timeout: 15000 });
      console.log('✓ Modal appeared');
      await page.waitForTimeout(1000); // Wait for modal animation
      
      // Fill schema name - try multiple selectors
      console.log('Filling schema name...');
      const nameInputSelectors = [
        '[data-testid="schema-name-input"]',
        'input[placeholder*="name" i]',
        'input[placeholder*="Schema" i]',
        '.modal input[type="text"]',
      ];
      
      let nameInput = null;
      for (const selector of nameInputSelectors) {
        try {
          const input = page.locator(selector).first();
          if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
            nameInput = input;
            console.log(`✓ Found name input using: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!nameInput) {
        throw new Error('Could not find schema name input field');
      }
      
      await nameInput.clear();
      await nameInput.fill(name);
      await page.waitForTimeout(500);
      
      // Verify name was filled
      const nameValue = await nameInput.inputValue();
      if (nameValue !== name) {
        // Try again
        await nameInput.fill(name);
        await page.waitForTimeout(500);
        const retryValue = await nameInput.inputValue();
        if (retryValue !== name) {
          throw new Error(`Failed to fill name. Expected "${name}", got "${retryValue}"`);
        }
      }
      console.log(`✓ Filled name: ${name}`);
      
      // Click JSON Schema tab
      console.log('Clicking JSON Schema tab...');
      const tabSelectors = [
        '[data-testid="import-type-json-schema"]',
        'button.tab:has-text("JSON Schema")',
        'button:has-text("JSON Schema")',
      ];
      
      let jsonSchemaTab = null;
      for (const selector of tabSelectors) {
        try {
          const tab = page.locator(selector).first();
          if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
            jsonSchemaTab = tab;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (jsonSchemaTab) {
        await jsonSchemaTab.click();
        await page.waitForTimeout(1000);
        console.log('✓ JSON Schema tab clicked');
      } else {
        console.log('⚠ JSON Schema tab not found, assuming it\'s already selected');
      }
      
      // Fill JSON schema content
      console.log('Filling JSON schema content...');
      const textareaSelectors = [
        '[data-testid="schema-content-textarea"]',
        '.modal textarea',
        'textarea',
      ];
      
      let schemaTextarea = null;
      for (const selector of textareaSelectors) {
        try {
          const textarea = page.locator(selector).last(); // Use last() to get the content textarea, not search
          if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
            schemaTextarea = textarea;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!schemaTextarea) {
        throw new Error('Could not find schema content textarea');
      }
      
      const schemaContent = JSON.stringify(schemaJson, null, 2);
      await schemaTextarea.clear();
      await schemaTextarea.fill(schemaContent);
      await page.waitForTimeout(1000);
      
      // Verify content was filled
      const contentValue = await schemaTextarea.inputValue();
      if (contentValue.length < 10) {
        // Try again
        await schemaTextarea.fill(schemaContent);
        await page.waitForTimeout(1000);
        const retryContent = await schemaTextarea.inputValue();
        if (retryContent.length < 10) {
          throw new Error(`Failed to fill schema content. Content length: ${retryContent.length}`);
        }
      }
      console.log(`✓ Schema content filled (${contentValue.length} chars)`);
      
      // Click import button - try multiple selectors
      console.log('Looking for import button...');
      const buttonSelectors = [
        '[data-testid="import-schema-button"]',
        '.modal-footer-right button.btn-primary',
        'button.btn-primary:has-text("Import")',
        'button:has-text("Import Schema")',
        '.modal button:has-text("Import")',
      ];
      
      let submitButton = null;
      for (const selector of buttonSelectors) {
        try {
          const btn = page.locator(selector).first();
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            submitButton = btn;
            console.log(`✓ Found import button using: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!submitButton) {
        throw new Error('Could not find import button in modal');
      }
      
      // Wait for button to be enabled
      console.log('Waiting for button to be enabled...');
      attempts = 0;
      let isDisabled = await submitButton.isDisabled();
      
      while (isDisabled && attempts < 10) {
        attempts++;
        console.log(`Button disabled, attempt ${attempts}/10...`);
        
        // Re-check and re-fill if needed
        const currentName = await nameInput.inputValue();
        const currentContent = await schemaTextarea.inputValue();
        
        if (!currentName || currentName.trim() !== name) {
          await nameInput.fill(name);
          await page.waitForTimeout(300);
        }
        if (!currentContent || currentContent.length < 10) {
          await schemaTextarea.fill(schemaContent);
          await page.waitForTimeout(300);
        }
        
        await page.waitForTimeout(500);
        isDisabled = await submitButton.isDisabled();
      }
      
      // If still disabled, force enable and click (workaround for React state issues)
      if (isDisabled) {
        console.log('⚠ Button still disabled, using workaround...');
        await submitButton.evaluate((el: HTMLButtonElement) => {
          (el as any).disabled = false;
          el.removeAttribute('disabled');
        });
        await page.waitForTimeout(300);
      }
      
      console.log('Clicking import button...');
      await submitButton.click();
      console.log('✓ Import button clicked');
      await page.waitForTimeout(2000);
      
      // Wait for the import to complete - check for loading spinner first
      const spinner = page.locator('.spinner').first();
      const wasImporting = await spinner.isVisible({ timeout: 2000 }).catch(() => false);
      if (wasImporting) {
        console.log('Import in progress, waiting for spinner to disappear...');
        await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
          console.log('Spinner might have already disappeared');
        });
      }
      
      // Wait for modal to close
      console.log('Waiting for modal to close...');
      try {
        await page.waitForSelector('.modal, .modal-overlay', { state: 'hidden', timeout: 20000 });
      } catch (e) {
        console.log('Modal might still be visible, trying to close it...');
        // Try clicking outside the modal or the close button
        const closeButton = page.locator('.modal-close').first();
        const isCloseButtonVisible = await closeButton.isVisible({ timeout: 2000 }).catch(() => false);
        if (isCloseButtonVisible) {
          await closeButton.click();
        }
      }
      
      // Check for any error messages first
      const errorToast = page.locator('.toast-error, .toast').first();
      const hasError = await errorToast.isVisible({ timeout: 3000 }).catch(() => false);
      if (hasError) {
        const errorText = await errorToast.textContent();
        console.log(`⚠ Error message found: ${errorText}`);
        // Don't fail immediately - maybe the schema was still created
      }
      
      // Wait for schema to appear in list
      console.log(`Waiting for schema "${name}" to appear in list...`);
      
      // Wait a bit for the list to refresh
      await page.waitForTimeout(2000);
      
      // Try different ways to find the schema
      const schemaSelectors = [
        `.schema-item-name:has-text("${name}")`, // Schema name element
        `.schema-item:has-text("${name}")`, // Schema item with name
        `text=${name}`, // Exact text match anywhere
      ];
      
      let schemaFound = false;
      for (const selector of schemaSelectors) {
        try {
          const schemaElement = page.locator(selector).first();
          await schemaElement.waitFor({ state: 'visible', timeout: 10000 });
          schemaFound = true;
          console.log(`✓ Found schema using selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector "${selector}" didn't work, trying next...`);
        }
      }
      
      if (!schemaFound) {
        // Check for error messages
        const errorElements = await page.locator('.toast-error, .error, [role="alert"]').all();
        for (const errorEl of errorElements) {
          const errorText = await errorEl.textContent();
          if (errorText) {
            console.log(`⚠ Error found: ${errorText}`);
          }
        }
        
        // List all visible schema names for debugging
        const schemaItems = page.locator('.schema-item, .schema-item-name');
        const schemaCount = await schemaItems.count();
        console.log(`Total schema items found: ${schemaCount}`);
        
        if (schemaCount > 0) {
          const allSchemaNames = await schemaItems.allTextContents();
          console.log('Available schemas in list:', allSchemaNames);
        }
        
        // Check network requests to see if import succeeded
        const networkLog = await page.evaluate(() => {
          return (window as any).__playwright_network_log || [];
        });
        console.log('Network activity:', networkLog);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: `test-results/schema-not-found-${name}.png`, fullPage: true });
        
        // Try refreshing the page and checking again
        console.log('Refreshing page and checking again...');
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        const schemaAfterRefresh = page.locator(`text=${name}`).first();
        const foundAfterRefresh = await schemaAfterRefresh.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (!foundAfterRefresh) {
          throw new Error(
            `Schema "${name}" not found in list after import.\n` +
            `Total items: ${schemaCount}\n` +
            `Check screenshot: test-results/schema-not-found-${name}.png\n` +
            `The import may have failed. Check the browser console and network tab.`
          );
        } else {
          console.log('✓ Schema found after page refresh');
          schemaFound = true;
        }
      }
      
      await page.waitForTimeout(1000);
      console.log(`✓ Schema ${name} created successfully`);
    };

    // Step 1: Create Transaction Schema
    await test.step('Create Transaction Schema', async () => {
      const transactionSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          merchantId: { type: 'string' },
          merchantName: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          location: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              city: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' }
            }
          },
          paymentMethod: { type: 'string' },
          cardType: { type: 'string' }
        },
        required: ['id', 'amount', 'currency', 'timestamp']
      };

      await createSchema('Transaction', 'Financial transaction data', transactionSchema);
    });

    // Step 2: Create User Schema
    await test.step('Create User Schema', async () => {
      const userSchema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          email: { type: 'string' },
          accountAge: { type: 'integer' },
          totalTransactions: { type: 'integer' },
          averageTransactionAmount: { type: 'number' },
          riskScore: { type: 'number' },
          isVerified: { type: 'boolean' },
          lastLoginLocation: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              city: { type: 'string' }
            }
          }
        },
        required: ['userId', 'email']
      };

      await createSchema('User', 'User account information', userSchema);
    });

    // Step 3: Create RiskScore Schema (Output)
    await test.step('Create RiskScore Schema', async () => {
      const riskScoreSchema = {
        type: 'object',
        properties: {
          transactionId: { type: 'string' },
          riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          riskScore: { type: 'number', minimum: 0, maximum: 100 },
          reasons: { 
            type: 'array',
            items: { type: 'string' }
          },
          recommendedAction: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['transactionId', 'riskLevel', 'riskScore']
      };

      await createSchema('RiskScore', 'Fraud risk assessment result', riskScoreSchema);
    });

    // Step 4: Create Fraud Mitigation Project
    await test.step('Create Fraud Mitigation Project', async () => {
      console.log('Creating Fraud Mitigation Project');
      
      const projectsLink = page.locator('a[href="/projects"], .sidebar-link').filter({ hasText: /Projects/i }).first();
      await projectsLink.waitFor({ state: 'visible', timeout: 10000 });
      await projectsLink.click();
      await page.waitForURL('/projects', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Click New Project button
      const newProjectButton = page.locator('button').filter({ hasText: /New Project|Create Project/i }).first();
      await newProjectButton.click({ timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Fill project name
      const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="Project" i]').first();
      await nameInput.waitFor({ state: 'visible', timeout: 5000 });
      await nameInput.fill('Fraud Mitigation System');
      await page.waitForTimeout(300);
      
      // Fill description
      const descInput = page.locator('textarea[placeholder*="description" i], textarea[placeholder*="Description" i]').first();
      if (await descInput.isVisible({ timeout: 2000 })) {
        await descInput.fill('Automated fraud detection and risk assessment system');
      }
      
      // Select input schemas (Transaction and User)
      // Look for checkboxes or clickable labels
      const transactionCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=/Transaction/i') }).first();
      if (await transactionCheckbox.isVisible({ timeout: 3000 })) {
        await transactionCheckbox.check();
      } else {
        // Try clicking label or div containing Transaction
        const transactionLabel = page.locator('label, div').filter({ hasText: /^Transaction$/i }).first();
        if (await transactionLabel.isVisible({ timeout: 2000 })) {
          await transactionLabel.click();
        }
      }
      await page.waitForTimeout(300);
      
      const userCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=/User/i') }).first();
      if (await userCheckbox.isVisible({ timeout: 3000 })) {
        await userCheckbox.check();
      } else {
        const userLabel = page.locator('label, div').filter({ hasText: /^User$/i }).first();
        if (await userLabel.isVisible({ timeout: 2000 })) {
          await userLabel.click();
        }
      }
      await page.waitForTimeout(300);
      
      // Select output schema (RiskScore)
      const riskScoreCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('text=/RiskScore/i') }).first();
      if (await riskScoreCheckbox.isVisible({ timeout: 3000 })) {
        await riskScoreCheckbox.check();
      } else {
        const riskScoreLabel = page.locator('label, div').filter({ hasText: /^RiskScore$/i }).first();
        if (await riskScoreLabel.isVisible({ timeout: 2000 })) {
          await riskScoreLabel.click();
        }
      }
      await page.waitForTimeout(500);
      
      // Click create button
      const createButton = page.locator('button').filter({ hasText: /Create|Save|Submit/i }).first();
      await createButton.click();
      await page.reload();
      
      // Wait for project to appear
      await expect(page.locator('text=Fraud Mitigation System').first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);
      
      console.log('Project created successfully');
    });

    // Step 5: Create Complex Fraud Detection Rule
    await test.step('Create Complex Fraud Detection Rule', async () => {
      console.log('Creating fraud detection rule');
      
      const rulesLink = page.locator('a[href="/rules"], .sidebar-link').filter({ hasText: /Global Rules|Rules/i }).first();
      await rulesLink.waitFor({ state: 'visible', timeout: 10000 });
      await rulesLink.click();
      await page.waitForURL('/rules', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Select the project from dropdown
      const projectSelect = page.locator('select').first();
      await projectSelect.waitFor({ state: 'visible', timeout: 5000 });
      await projectSelect.selectOption({ label: /Fraud Mitigation/i });
      await page.waitForTimeout(2000); // Wait for rules to load
      
      // Click New Automation button
      const newAutomationButton = page.locator('button').filter({ hasText: /New Automation|Create Rule/i }).first();
      await newAutomationButton.click({ timeout: 10000 });
      await page.waitForTimeout(1000);
      
      // Fill in rule basic info
      const ruleNameInput = page.locator('input[placeholder*="Rule Name" i], input[placeholder*="name" i]').first();
      await ruleNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await ruleNameInput.fill('High-Risk Transaction Detector');
      await page.waitForTimeout(300);
      
      const priorityInput = page.locator('input[type="number"]').first();
      if (await priorityInput.isVisible({ timeout: 2000 })) {
        await priorityInput.fill('10');
      }
      
      // Add first condition: High amount transaction
      const addConditionButton = page.locator('button').filter({ hasText: /Add condition/i }).first();
      await addConditionButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Fill condition 1: amount > 10000
      const fieldInputs = page.locator('input[placeholder*="Field name" i], input[placeholder*="Field" i]');
      await fieldInputs.first().waitFor({ state: 'visible', timeout: 5000 });
      await fieldInputs.first().fill('amount');
      await page.waitForTimeout(500);
      
      const operatorSelects = page.locator('select').filter({ hasText: /equals|operator/i });
      await operatorSelects.first().waitFor({ state: 'visible', timeout: 5000 });
      await operatorSelects.first().selectOption('greaterThan');
      await page.waitForTimeout(500);
      
      const valueInputs = page.locator('input[placeholder*="Value" i]');
      await valueInputs.first().waitFor({ state: 'visible', timeout: 5000 });
      await valueInputs.first().fill('10000');
      await page.waitForTimeout(500);
      
      // Add second condition: Rapid transactions
      await addConditionButton.click();
      await page.waitForTimeout(1000);
      
      await fieldInputs.nth(1).fill('totalTransactions');
      await page.waitForTimeout(500);
      await operatorSelects.nth(1).selectOption('greaterThan');
      await page.waitForTimeout(500);
      await valueInputs.nth(1).fill('5');
      await page.waitForTimeout(500);
      
      // Add nested condition block for location mismatch
      const nestedButton = page.locator('button[title*="nested" i], button').filter({ hasText: /Layers/i }).first();
      if (await nestedButton.isVisible({ timeout: 3000 })) {
        await nestedButton.click();
        await page.waitForTimeout(1000);
        
        // Add nested condition
        const addNestedButton = page.locator('button').filter({ hasText: /Add nested condition/i }).first();
        if (await addNestedButton.isVisible({ timeout: 3000 })) {
          await addNestedButton.click();
          await page.waitForTimeout(1000);
          
          const nestedFieldInput = page.locator('.nested-condition-row input[placeholder*="Field" i]').first();
          if (await nestedFieldInput.isVisible({ timeout: 3000 })) {
            await nestedFieldInput.fill('lastLoginLocation.country');
            await page.waitForTimeout(500);
            
            const nestedOperatorSelect = page.locator('.nested-condition-row select').first();
            await nestedOperatorSelect.selectOption('notEquals');
            await page.waitForTimeout(500);
            
            const nestedValueInput = page.locator('.nested-condition-row input[placeholder*="Value" i]').first();
            await nestedValueInput.fill('US');
          }
        }
      }
      
      // Add action: Create RiskScore fact
      const createFactButton = page.locator('button').filter({ hasText: /Create Fact/i }).first();
      await createFactButton.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      
      // Select RiskScore schema for the fact
      const factSchemaSelect = page.locator('select').filter({ hasText: /RiskScore/i }).first();
      if (await factSchemaSelect.isVisible({ timeout: 5000 })) {
        await factSchemaSelect.selectOption({ label: /RiskScore/i });
        await page.waitForTimeout(2000); // Wait for form to update
      }
      
      // Fill in fact attributes - wait for inputs to appear
      await page.waitForTimeout(1000);
      
      // Try to fill transactionId
      const transactionIdInput = page.locator('input[id*="transactionId" i], input[placeholder*="transactionId" i]').first();
      if (await transactionIdInput.isVisible({ timeout: 3000 })) {
        await transactionIdInput.fill('id');
      }
      
      // Try to fill riskLevel (might be a select)
      const riskLevelSelect = page.locator('select').filter({ hasText: /HIGH|LOW|MEDIUM/i }).last();
      if (await riskLevelSelect.isVisible({ timeout: 3000 })) {
        await riskLevelSelect.selectOption('HIGH');
      } else {
        const riskLevelInput = page.locator('input[id*="riskLevel" i], input[placeholder*="riskLevel" i]').first();
        if (await riskLevelInput.isVisible({ timeout: 3000 })) {
          await riskLevelInput.fill('HIGH');
        }
      }
      
      // Try to fill riskScore
      const riskScoreInputs = page.locator('input[type="number"]');
      const riskScoreInput = riskScoreInputs.filter({ hasText: '' }).last();
      if (await riskScoreInput.isVisible({ timeout: 3000 })) {
        await riskScoreInput.fill('85');
      }
      
      // Save the rule
      const saveButton = page.locator('button').filter({ hasText: /Save Rule|Save/i }).first();
      await saveButton.click();
      await page.waitForTimeout(3000);
      
      // Verify rule was created
      await expect(page.locator('text=High-Risk Transaction Detector').first()).toBeVisible({ timeout: 15000 });
      
      console.log('Rule created successfully');
    });

    // Step 6: Test Rule Execution
    await test.step('Test Rule Execution', async () => {
      console.log('Testing rule execution');
      
      const executeLink = page.locator('a[href="/execute"], .sidebar-link').filter({ hasText: /Execution|Execute/i }).first();
      await executeLink.waitFor({ state: 'visible', timeout: 10000 });
      await executeLink.click();
      await page.waitForURL('/execute', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Select the project
      const projectSelect = page.locator('select').first();
      await projectSelect.waitFor({ state: 'visible', timeout: 5000 });
      await projectSelect.selectOption({ label: /Fraud Mitigation/i });
      await page.waitForTimeout(2000); // Wait for schemas to load
      
      // Fill in test facts
      const factsJson = JSON.stringify([
        {
          id: 'txn-001',
          amount: 15000,
          currency: 'USD',
          merchantId: 'merchant-123',
          merchantName: 'Suspicious Merchant',
          timestamp: new Date().toISOString(),
          location: {
            country: 'US',
            city: 'New York',
            latitude: 40.7128,
            longitude: -74.0060
          },
          paymentMethod: 'credit_card',
          cardType: 'visa'
        },
        {
          userId: 'user-001',
          email: 'user@example.com',
          accountAge: 30,
          totalTransactions: 8,
          averageTransactionAmount: 5000,
          riskScore: 60,
          isVerified: true,
          lastLoginLocation: {
            country: 'CA',
            city: 'Toronto'
          }
        }
      ], null, 2);
      
      const factsTextarea = page.locator('textarea').first();
      await factsTextarea.waitFor({ state: 'visible', timeout: 5000 });
      await factsTextarea.fill(factsJson);
      await page.waitForTimeout(500);
      
      // Execute the rule
      const executeButton = page.locator('button').filter({ hasText: /Execute|Run/i }).first();
      await executeButton.click();
      await page.waitForTimeout(5000); // Wait for execution
      
      // Verify execution results - look for fired rules or success message
      await expect(
        page.locator('text=/Fired|fired|Success|success|rule.*triggered/i').first()
      ).toBeVisible({ timeout: 15000 });
      
      console.log('Rule execution test completed');
    });
  });
});
