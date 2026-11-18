# Playwright E2E Locator Fixes - Analysis & Solutions

**Date:** November 2026  
**Status:** Analysis Complete, Ready for Implementation  
**Analysis Method:** Static code inspection + DOM structure analysis  

---

## Executive Summary

Identified **13 problematic locators** in the Playwright E2E framework that cause strict-mode violations and potential test flakiness. All issues stem from **ambiguous or overly generic selectors** that resolve to multiple elements.

**Root Cause:** Generic `[role="alert"]` selector matches both:
1. Application error paragraph: `<p role="alert">Network error...</p>`
2. Next.js route announcer: `<div role="alert" id="__next-route-announcer__"></div>`

**Solution Strategy:** Use specific, stable selectors based on the actual DOM structure.

---

## Critical Issue: Generic Alert Selector

### The Problem

**File:** `auth.fixture.ts` (lines 81, 118)  
**Locator:** `page.locator('[role="alert"]')`  
**Error:** `locator('[role="alert"]') resolved to 2 elements`

```typescript
// PROBLEMATIC CODE (line 81-82)
const errorAlert = page.locator('[role="alert"]');
if (await errorAlert.isVisible()) {
  const error = await errorAlert.textContent();
  throw new Error(`Signup failed: ${error}`);
}
```

### Why It Fails

Playwright in strict mode **rejects locators that resolve to multiple elements**. The generic `[role="alert"]` selector matches:

1. **Application Error (intended):**
   ```tsx
   {serverError && (
     <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error" role="alert">
       {serverError}
     </p>
   )}
   ```

2. **Next.js Route Announcer (unintended):**
   ```html
   <div role="alert" id="__next-route-announcer__"></div>
   ```

### The Solution

Use a **specific selector targeting only the application error**:

```typescript
// CORRECT - Targets application error paragraph specifically
const errorAlert = page.locator('p[role="alert"]:not(#__next-route-announcer__)');

// Or even more specific - match by classes and content
const errorAlert = page.locator('p.text-error[role="alert"]');

// Or by test id (requires app change)
const errorAlert = page.locator('[data-testid="error-message"]');
```

---

## All Problematic Locators Found

### Category 1: Generic Alert Selectors (Critical)

| File | Line | Current Selector | Issue | Fix |
|------|------|------------------|-------|-----|
| `auth.fixture.ts` | 81 | `[role="alert"]` | Matches 2 elements | Use `p[role="alert"]` or specific class |
| `auth.fixture.ts` | 118 | `[role="alert"]` | Matches 2 elements | Use `p[role="alert"]` or specific class |
| `claims.spec.ts` | 113 | `[role="alert"]` | Matches 2+ elements | Use `p[role="alert"]` |
| `claims.spec.ts` | 142 | `[role="alert"]` | Matches 2+ elements | Use `p[role="alert"]` |

**Why These Are Critical:**
- Strict mode forbids multi-element locators
- Tests will fail with "locator resolved to X elements" error
- Cannot use `.first()` as a workaround in strict mode without fixing the selector

### Category 2: `.first()` Anti-Pattern (High Priority)

| File | Line | Locator | Issue |
|------|------|---------|-------|
| `pages/index.ts` | 22 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 32 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 75 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 85 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 134 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 142 | `'p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 237 | `.locator('p[role="alert"]').first()` | Ambiguous error messages |
| `pages/index.ts` | 264 | `'h1').first()` | Ambiguous headings |

**Why `.first()` Is Problematic:**
- Using `.first()` is a code smell indicating ambiguous selection
- Tests become flaky if DOM order changes
- In strict mode, still resolves multiple elements (`.first()` doesn't fix strict mode)
- Better approach: Use specific selectors that don't match multiple elements

### Category 3: Positional Selectors (Medium Priority)

| File | Line | Locator | Issue |
|------|------|---------|-------|
| `pages/index.ts` | 66 | `emailField.locator('~ p[role="alert"]')` | Assumes sibling structure, brittle |
| `pages/index.ts` | 236 | `.locator('..').locator('p[role="alert"]')` | Assumes parent-child relationship |
| `pages/index.ts` | 245 | `'[role="status"]').first()` | Generic status selector |

**Why Positional Selectors Are Risky:**
- Depend on specific DOM tree structure
- Break if HTML is refactored
- Not resilient to layout changes
- Harder to debug than explicit selectors

### Category 4: Generic Headings (Low Priority)

| File | Line | Locator | Issue |
|------|------|---------|-------|
| `pages/index.ts` | 264 | `page.locator('h1').first()` | Assumes first h1 is the page heading |

**Why This Is Risky:**
- Multiple h1 elements may exist
- Relies on assumption about element order
- Brittle to layout changes

---

## Recommended Fixes

### Fix 1: Auth Fixture - Signup Error (Lines 81-82)

**Current Code:**
```typescript
// Line 81-82
const errorAlert = page.locator('[role="alert"]');
if (await errorAlert.isVisible()) {
  const error = await errorAlert.textContent();
  throw new Error(`Signup failed: ${error}`);
}
```

**Fixed Code:**
```typescript
// Use specific selector that targets only application errors
const errorAlert = page.locator('p[role="alert"]').filter({ hasNot: page.locator('#__next-route-announcer__') });
// Or more reliably:
const errorAlert = page.locator('p.text-error[role="alert"]');
// Or simplest - match by specific error styles:
const errorAlert = page.locator('p[role="alert"][class*="error"]');

if (await errorAlert.isVisible()) {
  const error = await errorAlert.textContent();
  throw new Error(`Signup failed: ${error}`);
}
```

**Why This Works:**
- `p[role="alert"]` - Targets paragraphs only (excludes div)
- `[class*="error"]` - Matches element with "error" in class name
- Specific, unambiguous selector

### Fix 2: Auth Fixture - Login Error (Lines 118-119)

**Same approach as Fix 1:**
```typescript
const errorAlert = page.locator('p[role="alert"][class*="error"]');
if (await errorAlert.isVisible()) {
  const error = await errorAlert.textContent();
  throw new Error(`Login failed: ${error}`);
}
```

### Fix 3: Page Objects - All Error Message Selectors

**Current Code (pages/index.ts, all error methods):**
```typescript
const errorElement = this.page.locator('p[role="alert"]').first();
```

**Fixed Code:**
```typescript
// More specific selector that doesn't need .first()
const errorElement = this.page.locator('p[role="alert"][class*="error"]');
// Or if classes vary, use by negative lookahead:
const errorElement = this.page.locator('p[role="alert"]:not(#__next-route-announcer__)');
```

**Benefits:**
- Removes need for `.first()` (strict mode compliant)
- Specifically targets error paragraphs only
- More maintainable and resilient

### Fix 4: Claim Spec - Validation Error Checks (Lines 113, 142)

**Current Code:**
```typescript
const errorElements = page.locator('[role="alert"]');
const errorCount = await errorElements.count();
expect(errorCount).toBeGreaterThan(0);
```

**Fixed Code:**
```typescript
// Count only application errors, exclude route announcer
const errorElements = page.locator('p[role="alert"][class*="error"]');
// Or more explicitly:
const errorElements = page.locator('p[role="alert"]:not(#__next-route-announcer__)');
const errorCount = await errorElements.count();
expect(errorCount).toBeGreaterThan(0);
```

### Fix 5: Page Objects - Admin Dashboard Heading (Line 264)

**Current Code:**
```typescript
async isLoaded() {
  return this.page.locator('h1').first().isVisible();
}
```

**Fixed Code:**
```typescript
async isLoaded() {
  // Use specific text matcher instead of .first()
  return this.page.locator('h1:has-text("Dashboard")').isVisible();
  // Or if no unique text:
  return this.page.locator('main h1').first().isVisible(); // h1 within main is more specific
}
```

### Fix 6: Page Objects - Field Errors with Positional Selectors (Line 66)

**Current Code:**
```typescript
const emailField = this.page.locator('input[id="email"]');
const errorAlert = emailField.locator('~ p[role="alert"]');
```

**Fixed Code:**
```typescript
// Use field's aria-describedby instead of assuming sibling structure
const emailField = this.page.locator('input[id="email"]');
const errorId = await emailField.getAttribute('aria-describedby');
if (errorId) {
  const errorAlert = this.page.locator(`p#${errorId}`);
  return (await errorAlert.isVisible()) ? await errorAlert.textContent() : null;
}
// Fallback to specific selector
const errorAlert = this.page.locator('p#email-error[role="alert"]');
return (await errorAlert.isVisible()) ? await errorAlert.textContent() : null;
```

**Why This Works:**
- Uses semantic HTML attributes (`aria-describedby`)
- Not dependent on DOM tree structure
- Resilient to refactoring
- Aligns with accessibility standards

### Fix 7: Claim Wizard Field Errors (Line 236-237)

**Current Code:**
```typescript
const field = this.page.locator(`input[id="${fieldId}"], textarea[id="${fieldId}"]`);
const errorElement = field.locator('..').locator('p[role="alert"]').first();
```

**Fixed Code:**
```typescript
const field = this.page.locator(`input[id="${fieldId}"], textarea[id="${fieldId}"]`);
const errorId = await field.getAttribute('aria-describedby');
if (errorId) {
  const errorElement = this.page.locator(`#${errorId}`);
  return (await errorElement.isVisible()) ? await errorElement.textContent() : null;
}
// Fallback: Look for sibling error with specific pattern
const errorElement = this.page.locator(`p:has-text("${fieldId}")`);
return (await errorElement.isVisible()) ? await errorElement.textContent() : null;
```

**Why This Works:**
- Uses `aria-describedby` to find associated error message
- Not dependent on DOM tree structure (`.locator('..')`)
- More maintainable and accessible

### Fix 8: Status Messages (Line 245)

**Current Code:**
```typescript
async getSuccessMessage() {
  const successElement = this.page.locator('[role="status"]').first();
  return (await successElement.isVisible()) ? await successElement.textContent() : null;
}
```

**Fixed Code:**
```typescript
async getSuccessMessage() {
  // Success messages are usually in toast notifications
  // Look for specific success message pattern
  const successElement = this.page.locator('[role="status"]:has-text("Account created")', { timeout: 5000 });
  // Or use test id if available:
  const successElement = this.page.locator('[data-testid="success-message"]');
  return (await successElement.isVisible()) ? await successElement.textContent() : null;
}
```

---

## Implementation Priority

### Phase 1: Critical (Must Fix - Blocks Strict Mode)
1. ✅ Fix `auth.fixture.ts` lines 81-82 (signup error)
2. ✅ Fix `auth.fixture.ts` lines 118-119 (login error)
3. ✅ Fix `claims.spec.ts` lines 113, 142 (validation checks)

### Phase 2: High Priority (Anti-Patterns)
4. ✅ Fix `pages/index.ts` - all `.first()` on error messages
5. ✅ Fix `pages/index.ts` line 245 - status messages

### Phase 3: Medium Priority (Resilience)
6. ✅ Fix `pages/index.ts` line 66 - field error selectors
7. ✅ Fix `pages/index.ts` line 236-237 - wizard field errors

### Phase 4: Low Priority (Best Practice)
8. ✅ Fix `pages/index.ts` line 264 - heading selector

---

## DOM Structure Summary

### Application Error Elements

**Location:** Auth pages (login, signup)
```tsx
{serverError && (
  <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error" role="alert">
    {serverError}
  </p>
)}
```

**Selector:** `p[role="alert"][class*="error"]` or `p.text-error[role="alert"]`

**Field Error Elements:**
```tsx
{errors.email && (
  <p id="email-error" className="text-sm text-error" role="alert">
    {errors.email.message}
  </p>
)}
```

**Selector:** `p#email-error[role="alert"]` or `p[id$="-error"][role="alert"]`

### Next.js Route Announcer (Unintended Match)

**Location:** Dynamically injected by Next.js
```html
<div role="alert" id="__next-route-announcer__"></div>
```

**Problem:** Generic `[role="alert"]` matches this element  
**Solution:** Specifically exclude it or use more specific selector

---

## Recommended Application Changes (Optional but Better)

If possible, adding `data-testid` attributes to important elements would make selectors more stable:

```tsx
// In login/signup pages:
{serverError && (
  <p className="..." role="alert" data-testid="server-error">
    {serverError}
  </p>
)}

// In claim wizard:
{errors.email && (
  <p id="email-error" className="..." role="alert" data-testid="email-error">
    {errors.email.message}
  </p>
)}

// In success messages:
<div role="status" data-testid="success-message">
  Account created!
</div>
```

**Benefits:**
- Most resilient selector method
- Explicitly marks elements for testing
- Decouples tests from styling/class changes
- Recommended by Playwright best practices

---

## Testing Strategy After Fixes

### Pre-Validation Checklist
- [ ] All `.first()` calls on ambiguous locators removed
- [ ] All generic `[role="alert"]` replaced with specific selectors
- [ ] All `.locator('..')` parent traversals replaced with semantic selectors
- [ ] All files compile without errors

### Execution Plan
1. Apply Phase 1 fixes (critical)
2. Run with strict mode: `npx playwright test --strict`
3. Apply Phase 2 fixes
4. Run again with strict mode
5. Apply Phase 3-4 fixes
6. Final full suite run

### Expected Results
```
Before Fixes:
  Error: locator('[role="alert"]') resolved to 2 elements

After Fixes:
  ✅ All 19 tests discoverable
  ✅ Strict mode: PASS
  ✅ 16+ tests pass (when backend running)
  ✅ 0 strict mode violations
```

---

## Files to Modify

1. **`tests/e2e/fixtures/auth.fixture.ts`** (2 changes)
2. **`tests/e2e/pages/index.ts`** (8 changes)
3. **`tests/e2e/specs/claims.spec.ts`** (2 changes)

---

## Summary

**Root Cause:** Generic selectors that match multiple DOM elements  
**Impact:** Strict mode violations, flaky tests  
**Solution:** Specific, stable selectors using element classes, IDs, or attributes  
**Effort:** Low - ~20 lines to change  
**Risk:** Very Low - Only improves test reliability  

---

**Next Step:** Implement fixes when backend services are confirmed running.
