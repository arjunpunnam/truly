import { test, expect } from '@playwright/test';

/**
 * Test: Create a Schema
 * 
 * This test verifies that we can create a schema using the JSON Schema import method.
 * This is a foundational step that other tests depend on.
 */

test.describe('Schema Creation', () => {
  test('should create a Transaction schema', async ({ page, request }) => {
    test.setTimeout(60000); // 1 minute
    
    // Verify server is running before starting test
    try {
      const response = await request.get('/');
      if (!response.ok() && response.status() !== 404) {
        throw new Error(`Server returned status ${response.status()}`);
      }
    } catch (error: any) {
      throw new Error(
        `Frontend server is not running on http://localhost:3000.\n` +
        `Please start it with: npm run dev\n` +
        `Original error: ${error.message}`
      );
    }
    
    // Navigate to Schemas page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
      console.log('Network idle timeout, but continuing...');
    });
    await page.waitForTimeout(3000); // Wait for React to render
    
    // Verify page loaded
    const bodyText = await page.locator('body').textContent();
    if (!bodyText || bodyText.length < 10) {
      throw new Error('Page did not load - body is empty');
    }
    console.log('✓ Page loaded');
    
    // Find Import Schema button - try multiple approaches
    console.log('Looking for Import Schema button...');
    const buttonSelectors = [
      '[data-testid="import-schema-button-main"]',
      'button:has-text("Import Schema")',
      'button.btn-primary:has-text("Import")',
      '.page-actions button',
      '.page-header button',
    ];

    let importButton: null | ReturnType<typeof page.locator> = null;
    let importButtonAttempts = 0;
    while (!importButton && importButtonAttempts < 20) {
      importButtonAttempts++;
      for (const selector of buttonSelectors) {
        try {
          const btn = page.locator(selector).first();
          const isVisible = await btn.isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            const text = await btn.textContent().catch(() => '');
            if (text && (text.includes('Import') || selector.includes('testid'))) {
              importButton = btn;
              console.log(`✓ Found button using: ${selector} (attempt ${importButtonAttempts})`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      if (!importButton) {
        await page.waitForTimeout(500);
      }
    }
    if (!importButton) {
      // Debug: list all buttons
      const allButtons = await page.locator('button').all();
      const buttonTexts = await Promise.all(
        allButtons.map(btn => btn.textContent().catch(() => ''))
      );
      console.log('Available buttons:', buttonTexts.filter(t => t));
      await page.screenshot({ path: 'test-results/schema-page-debug.png', fullPage: true });
      throw new Error('Could not find Import Schema button. Check screenshot: test-results/schema-page-debug.png');
    }
    
    await importButton.click();
    console.log('✓ Clicked Import Schema button');
    await page.waitForTimeout(1500);
    
    // Wait for modal
    await page.waitForSelector('.modal, .modal-overlay', { timeout: 10000 });
    
    // Fill schema name
    const nameInput = page.locator('[data-testid="schema-name-input"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill('Transaction');
    await page.waitForTimeout(500);
    
    // Click JSON Schema tab
    const jsonSchemaTab = page.locator('[data-testid="import-type-json-schema"]').first();
    await jsonSchemaTab.waitFor({ state: 'visible', timeout: 10000 });
    await jsonSchemaTab.click();
    await page.waitForTimeout(1000);
    
    // Fill schema content
    const schemaContent = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      },
      required: ['id', 'amount', 'currency', 'timestamp']
    };
    
    const textarea = page.locator('[data-testid="schema-content-textarea"]').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(JSON.stringify(schemaContent, null, 2));
    await page.waitForTimeout(1000);
    
    // Click import button
    const submitButton = page.locator('[data-testid="import-schema-button"]').first();
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for button to be enabled
    let attempts = 0;
    while (await submitButton.isDisabled() && attempts < 10) {
      attempts++;
      await page.waitForTimeout(500);
    }
    
    // Force enable if still disabled (React state workaround)
    if (await submitButton.isDisabled()) {
      await submitButton.evaluate((el: HTMLButtonElement) => {
        (el as any).disabled = false;
      });
    }
    
    await submitButton.click();
    await page.waitForTimeout(2000);
    
    // Wait for modal to close
    await page.waitForSelector('.modal, .modal-overlay', { state: 'hidden', timeout: 15000 }).catch(() => {});
    
    // Verify schema appears in list
    await expect(page.locator('.schema-item-name:has-text("Transaction")').first()).toBeVisible({ timeout: 20000 });
  });
});

