import { test, expect } from '@playwright/test';

test.describe('Trafiora Platform Frontend Navigation & Workflow', () => {
  test('Dashboard loads with live metrics and operational tier indicator', async ({ page }) => {
    await page.goto('/');

    // Check brand tagline and header
    await expect(page.locator('text=Diagnose. Prove. Protect.')).toBeVisible();
    await expect(page.locator('text=System Workload & Intelligence Overview')).toBeVisible();

    // Check Safety Banner
    await expect(page.locator('text=Safety Boundary Active: Tier 2')).toBeVisible();

    // Check Key Metric Cards
    await expect(page.locator('text=Query Throughput')).toBeVisible();
    await expect(page.locator('text=Latency (p95)')).toBeVisible();
    await expect(page.locator('text=Buffer Hit Ratio')).toBeVisible();
  });

  test('Workload Catalog and AST Normalizer interactive execution', async ({ page }) => {
    await page.goto('/workload');

    await expect(page.locator('text=Database Workload & Query Catalog')).toBeVisible();
    await expect(page.locator('text=Interactive Query Normalizer')).toBeVisible();

    // Click Normalize
    await page.click('button:has-text("Normalize & Fingerprint")');
    await expect(page.locator('text=Canonical Parameterized SQL')).toBeVisible();
    await expect(page.locator('text=SHA-256 Fingerprint')).toBeVisible();
  });

  test('Architecture Canvas renders components and toggles reduced motion', async ({ page }) => {
    await page.goto('/canvas');

    await expect(page.locator('text=Interactive Workload Architecture & Flow Canvas')).toBeVisible();
    await expect(page.locator('text=Connection Pooler (PgBouncer)')).toBeVisible();
    await expect(page.locator('text=PostgreSQL 18.6 Engine')).toBeVisible();

    // Toggle reduced motion
    const motionBtn = page.locator('button:has-text("Motion")');
    await motionBtn.click();
    await expect(page.locator('text=Reduced Motion: ON')).toBeVisible();
  });

  test('A/B Comparison view displays statistically rigorous outcome verdict', async ({ page }) => {
    await page.goto('/compare');

    await expect(page.locator('text=Baseline vs Candidate A/B Performance Comparison')).toBeVisible();
    await expect(page.locator('text=Statistical Verdict: MEASURED_IMPROVEMENT')).toBeVisible();
    await expect(page.locator('text=Comparative Performance Diffs')).toBeVisible();
  });

  test('Protection engine calculates Little\'s Law pool sizing', async ({ page }) => {
    await page.goto('/protection');

    await expect(page.locator('text=Overload Protection & Pool Sizing Engine')).toBeVisible();
    await expect(page.locator('text=Little\'s Law Concurrency')).toBeVisible();
    await expect(page.locator('text=pool_mode = transaction')).toBeVisible();
  });
});
