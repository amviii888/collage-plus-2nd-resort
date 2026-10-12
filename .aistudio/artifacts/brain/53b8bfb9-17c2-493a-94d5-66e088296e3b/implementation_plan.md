# Implementation Plan: Terminal Build Optimization & SSR Security Guard Fix

Fix terminal build stalls during static page compilation (`next build`) by bypassing client-side security checks during build-time SSR, purging Next.js caches, and verifying complete terminal compilation.

---

## Proposed Changes

### 1. SSR & Build-Time Security Guard Bypass
- **File**: `src/components/security/ScreenProtectionGuard.tsx`
- **File**: `src/components/security/DynamicWatermark.tsx`
- Ensure all DevTools detection intervals, window blur listeners, `outerWidth/innerWidth` checks, and DOM mutation observers execute strictly on the client browser (`typeof window !== 'undefined'`) and are bypassed during static HTML generation and server-side rendering (`SSR` / `next build`).

---

### 2. Cache Cleanup
- Wipe `.next` build output directory.
- Clear `.cache` and `node_modules/.cache`.

---

### 3. Terminal Build Execution & Verification
- Execute `npm run build` in terminal.
- Verify static route generation (`/`, `/login`, `/profile`, `/settings`, etc.) finishes cleanly without hanging.
- Restart dev server to confirm live runtime state.

---

## Verification Plan

### Automated Tests & Commands
1. Run `rm -rf .next .cache`
2. Run `npm run build`
3. Confirm static route generation output logs complete without stalls.
4. Verify port 3000 server response.
