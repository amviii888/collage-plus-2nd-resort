# Firestore Security Specification (Mol5saty Post-Breach Hardening)

## 1. Access Matrix & Invariants

| Collection | Unauthenticated | Authenticated Student | Authenticated Teacher | Admin |
|---|---|---|---|---|
| `students/{id}` | DENY ALL | `get`/`create`/`update` own doc only (no plaintext password keys, no role escalation); `list`/`delete` DENY | DENY `list`; no direct PII read | FULL (still forbids plaintext password fields) |
| `teachers/{id}` | DENY ALL | DENY `get`/`list`/`write` | `get`/`create`/`update` own doc only (no plaintext password keys) | FULL (still forbids plaintext password fields) |
| `teachers/{id}/private/*` | DENY ALL | DENY ALL | DENY ALL | DENY ALL (server Admin SDK only) |
| `teachers/{id}/courses/*` | DENY ALL | `read` | `read` + owner `write` | FULL |
| `public_teachers/{id}` | `read` (zero PII) | `read` | `read` + owner `write` (strict no-PII guard) | FULL (no-PII guard) |
| `users/{uid}` | DENY ALL | `get`/`create`/`update` own doc only (immutable `role`) | `get`/`create`/`update` own doc only (immutable `role`) | FULL |
| `phone_verifications/{code}` | `get` by exact code only; `list` DENY; `write` DENY | `get` by exact code only; `list`/`write` DENY | `get` by exact code only; `list`/`write` DENY | `get` only; `list`/`write` DENY (Admin SDK only) |
| `password_reset_challenges/*` | DENY ALL | DENY ALL | DENY ALL | DENY ALL (Admin SDK only) |
| `system_security/*` | DENY ALL | DENY ALL | DENY ALL | DENY ALL (Admin SDK only) |
| `admins/{uid}` | DENY ALL | `get` own UID only; `list`/`write` DENY | `get` own UID only; `list`/`write` DENY | `get` own UID only; `list`/`write` DENY (Admin SDK only) |

## 2. Targeted Attack Vectors ("Dirty Dozen")

1. **Unauthenticated REST Collection Dump (`GET .../documents/students`)**: Blocked by `allow list: if isAdmin();`.
2. **Unauthenticated Teacher Collection Dump (`GET .../documents/teachers`)**: Blocked by `allow list: if isAdmin();`.
3. **Cross-Student IDOR Read (`GET /students/{victimUid}` as another student)**: Blocked by `isOwner(studentId) || isAdmin()`.
4. **Legacy Credential Theft (`GET /teachers/{id}/private/credentials`)**: Permanently denied to all clients (`allow read, write: if false;`).
5. **Plaintext Password Injection (`POST/PATCH /students/{uid}` with `password` field)**: Blocked by `noPlaintextPasswordFields()`.
6. **Self-Privilege Escalation (`PATCH /users/{uid}` setting `role: "admin"`)**: Blocked by immutable `role` invariant.
7. **Admin Registry Poisoning (`PUT /admins/{attackerUid}`)**: Blocked by `allow write: if false;`.
8. **WhatsApp Phone Verification Scraping (`GET .../documents/phone_verifications`)**: Blocked by `allow list: if false;`.
9. **WhatsApp Verification Spoofing (`PUT /phone_verifications/123456` with `{ verified: true }`)**: Blocked by `allow write: if false;` (only Admin SDK / bot writes).
10. **Password Reset Challenge Tampering (`PATCH /password_reset_challenges/{id}` setting `phoneVerified: true`)**: Blocked by `allow read, write: if false;`.
11. **Public Teacher PII Leak (`PUT /public_teachers/{uid}` containing `email` or `phoneNumber`)**: Blocked by explicit forbidden-key guard.
12. **Teacher Local Attendance / Student Ledger Cross-Tenant Read (`GET /teachers/{victimId}/localStudents/{id}`)**: Blocked by `isOwner(teacherId) || isAdmin()`.
