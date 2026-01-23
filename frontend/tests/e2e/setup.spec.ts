import { test, expect } from '@playwright/test';

/**
 * Setup test to verify environment is ready before running other tests
 */
test.describe('Environment Setup', () => {
  test('should verify frontend is accessible', async ({ page }) => {
    await page.goto('/');
    // Wait for page to load - don't check title as it might vary
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    // Just verify we got a response
    expect(page.url()).toContain('localhost:3000');
  });

  test('should verify backend API is accessible', async ({ request }) => {
    try {
      const response = await request.get('/api/schemas');
      expect(response.status()).toBeLessThan(500); // Any status < 500 means server is responding
    } catch (error: any) {
      // If connection fails, it means frontend proxy isn't working or backend is down
      throw new Error(
        'Backend API is not accessible. ' +
        'Make sure:\n' +
        '1. Frontend dev server is running on http://localhost:3000 (run: npm run dev)\n' +
        '2. Backend is running on http://localhost:8092 (run: mvn spring-boot:run in backend directory)\n' +
        '3. Frontend is configured to proxy /api requests to backend\n' +
        `Original error: ${error.message}`
      );
    }
  });
});

