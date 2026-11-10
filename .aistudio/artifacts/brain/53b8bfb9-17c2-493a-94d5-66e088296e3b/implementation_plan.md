# Advanced Share Codes System & Financial Analytics Upgrade

Complete migration from the legacy manual access request model to an advanced, high-yielding Share Codes and Financial Tracking System. This update removes manual access requesting across the entire platform, introduces unit-level code creation, and provides real-time revenue analytics for teachers.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during Phase 1 interactive clarification:

- **Confirmed Layout Strategy**: **2-Column Responsive Grid** with high-visibility status badges (`Active / Used` vs `Available / Unused`), clear code copy actions, and explicit entitlement metadata (Course, Collection, or Specific Unit).
- **Confirmed Financial Dashboard**: **Top Analytics Cards** displaying **Activated Earnings** (collected revenue from redeemed codes) vs **Pending Revenue** (potential revenue from unredeemed codes), paired with detailed status filter tabs.
- **Confirmed Code Generation Scope**: **Dynamic Dropdown** for Unit selection when "Course" scope is selected, allowing teachers to issue codes for full courses, specific units, or entire collections.

---

## 1. Overview & Core Concept

- **What It Does**: 
  - Retires the manual access request system completely (removing "Request Access" buttons, pending request tables, and request backend handlers).
  - Establishes a code-only entitlement model where courses are unlocked via 16-character Share Codes default-limited to **3 views per code** (or unlimited if specified on video level).
  - Introduces a reimagined **Advanced Share Codes & Financial Hub** in the teacher dashboard with instant Excel exports, unit-level code generation, filtering, search, and revenue tracking.
- **Target Audience**: University teachers & professors seeking efficient code distribution, bulk printing/exporting, and clear financial ledger reporting.

---

## 2. User Experience & Visual Design

- **Visual Theme & Atmosphere**: High-contrast, digital slate dark theme (`#09090b` canvas, `#131316` card surface) with electric green (`#22c55e`) active accents and warm desert amber (`#bf7c1c`) markers.
- **Top Financial Analytics Grid**:
  - **Total Generated Codes**: Metric card showing total issued codes count and potential catalog value.
  - **Activated Earnings**: Highlighted green metric showing real earnings from redeemed codes.
  - **Pending Revenue**: Muted amber metric showing unredeemed codes currently in circulation.
- **Code Generator Panel**:
  - Scope selection: `Full Course`, `Specific Unit`, or `Collection`.
  - Dynamic Unit Selector: Appears when a course is chosen, enabling unit-level code generation.
  - Batch Quantity & Custom Pricing: Set batch size and custom code price (or default to course/collection price).
- **2-Column Code Vault Grid**:
  - Responsive 2-column grid layout displaying generated codes in scannable cards.
  - Rich Status Badges: Clear unboxed text and high-contrast badges indicating `Redeemed (مُفعل)` or `Available (جاهز للإستخدام)`.
  - Content Entitlement Metadata: Displays target Course Title, Unit Title, or Collection Name.
  - One-Click Excel Export: Instant `.xlsx` download of filtered or full code batches.

---

## 3. Key Product Decisions & Trade-Offs

1. **Complete Removal of Access Requests**:
   - *Decision*: Remove `UnlockCourseDialog` requesting tab and `course_requests` subcollections from student and teacher portals.
   - *Why*: Eliminates administrative clutter for teachers and replaces slow manual approvals with instant code redemption.
2. **Code-Centric Views Limit (3 Views Max Default)**:
   - *Decision*: Bound code redemption access to 3 views per student code by default.
   - *Why*: Protects professor content from account-sharing exploits while allowing students sufficient review iterations.
3. **Financial Valuation Rules**:
   - *Decision*: If a custom batch price is entered during code generation, that value is used; otherwise, the system automatically pulls the current price from the target Course or Collection.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Teacher Portal / Manager                        │
│                                                                        │
│   ┌───────────────────────┐         ┌──────────────────────────────┐   │
│   │ Top Analytics Cards   │         │ Code Generator Panel         │   │
│   │ • Total Revenue       │         │ • Course / Unit / Collection │   │
│   │ • Activated Earnings  │         │ • Quantity & Custom Price    │   │
│   │ • Pending Revenue     │         │ • Bulk Excel Export          │   │
│   └───────────┬───────────┘         └──────────────┬───────────────┘   │
│               │                                    │                   │
│               └──────────────────┬─────────────────┘                   │
│                                  ▼                                     │
│                     ┌───────────────────────────┐                      │
│                     │ 2-Column Code Vault Grid  │                      │
│                     │ • Filter by Status/Scope  │                      │
│                     │ • Search by Code/Course   │                      │
│                     └────────────┬──────────────┘                      │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Firestore Persistence                         │
│                                                                        │
│   teachers/{teacherId}/share_codes/{codeId}                            │
│   ├── code: string                                                     │
│   ├── type: 'course' | 'unit' | 'collection'                           │
│   ├── courseId?: string, unitId?: string, collectionId?: string        │
│   ├── viewLimit: 3                                                     │
│   ├── price: number                                                    │
│   ├── used: boolean, usedByStudentId?: string, usedAt?: timestamp      │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & Data Modifications Map:

1. **`src/components/ManageShareCodes.tsx`**:
   - Redesign interface with Top Financial Analytics Cards, 2-Column Code Grid, and Unit-Level code generation.
   - Remove pending requests tab and legacy request backend functions.
   - Add financial metrics computation (Activated Earnings vs Pending Revenue).

2. **`src/components/UnlockCourseDialog.tsx`**:
   - Remove manual access request submission tabs and pending state handlers.
   - Keep clean **Code Redemption Tab (إدخال كود الوصول)** as the exclusive access method.

3. **`src/app/courses/[...slug]/client.tsx`**:
   - Update lock overlay to present the single **"Enter Code (إدخال كود الوصول)"** CTA.

4. **`src/db` / Firestore Rules (`firestore.rules`)**:
   - Ensure `share_codes` security rules support creation, querying, and student redemption while preventing unauthorized modification.
