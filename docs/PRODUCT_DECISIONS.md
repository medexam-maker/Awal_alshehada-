# Product Decisions

This document records formal Product and Architectural Decisions operating within the existing frozen C1–C9 contracts baseline (v1.1.0). These decisions do not amend, replace, or supersede the normative contracts; they document explicit product determinations where contracts accommodate options or require implementation clarification.

---

## PD-001: Calculation Grading — Phase 2
- **Status**: APPROVED
- **Date**: 2026-09-07
- **Decision**: Option 1 — Strict Objective Auto-Graded

### Rules
1. Calculation grading is objective and server-authoritative.
2. The submitted numeric "value" is compared against the server-side grading "tolerance".
3. "unit" does NOT contribute to the score in the Phase 2 calculation model.
4. "workText" does NOT contribute to the score in the Phase 2 calculation model.
5. "photoUrl" does NOT contribute to the score in the Phase 2 calculation model.
6. Calculation receives either full marks or zero marks under this model.
7. Calculation is auto-graded; it is not a manual or mixed-grading type in Phase 2.
8. This decision does NOT modify C1–C9. All frozen contracts remain v1.1.0.
9. A future change to Option 2 or Option 3 requires a new explicit Product Decision and contract review/amendment before implementation.
10. Historical/finalized attempts must remain historically immutable. A future calculation-grading model must not silently reinterpret or regrade already-finalized attempts.

### Contract Relationship
This is a Product Decision operating within the existing frozen C1–C9 baseline.
It is NOT a replacement, amendment, or new normative contract.
C1–C9 remain the authoritative contractual baseline at v1.1.0.

---

## PD-002: Reconciliation of Access Token Lifetime and Zero-Request Exam Invariant
- **Status**: APPROVED
- **Date**: 2026-09-07
- **Scope**: Phase 2 — Authentication / Exam Submission
- **Contracts**: C1–C9 remain FROZEN at v1.1.0

### Context
C7 §6 establishes a short-lived access-token security model with an architectural target of approximately 15 minutes.
C4 §20–§21, C5 §62 (Rule 4), and C6 §19 establish the Zero-Request Invariant: after "POST /api/exam/start" returns the complete exam snapshot and until "POST /api/exam/finish" is submitted, the active exam must operate locally without normal API requests.
Simulator attempts may last substantially longer than the normal access-token lifetime.
C5 §31 nevertheless requires the server to authenticate the caller when processing "FINISH".
The interaction between these requirements was previously underspecified.

### Decision
Option 1 — Pre-FINISH Token Renewal is approved.
Normal access tokens remain short-lived, with an architectural target of approximately 15 minutes, preserving the security intent of C7 §6.
During active exam execution:
- No answer synchronization is permitted.
- No progress-saving requests are permitted.
- No heartbeat requests are permitted.
- No polling is permitted.
- No background token refresh is permitted.
- The client continues operating entirely from its local exam state.
When the user initiates "POST /api/exam/finish":
1. If the access token is still valid, the client sends "FINISH" normally.
2. If the access token has expired, the client may invoke "POST /api/auth/refresh" immediately before sending "FINISH".
3. If "FINISH" returns HTTP 401 specifically because the access token has expired, the client may refresh the token and retry "FINISH" once.
4. Refresh/retry must never alter or discard the locally stored answers.
5. Failure of token refresh must not destroy the active local exam state.
The token-renewal activity described above is a submission-phase authentication mechanism, not part of active exam execution.

### Boundary Rule
The Zero-Request Invariant applies to the active question-answering phase.
The following are prohibited between START and the user's decision to submit:
- background refresh;
- polling;
- answer saves;
- progress synchronization;
- heartbeat requests;
- question fetching;
- any other normal API activity.
Authentication renewal is permitted only as part of the explicit FINISH submission flow immediately before, or once in response to, the FINISH authentication failure described above.

### Exam Expiration Authority
Access-token lifetime and exam-attempt lifetime are independent.
Refreshing an access token:
- does not extend "expiresAt";
- does not extend the 120-second Simulator grace period;
- does not reopen an expired attempt;
- does not bypass server-side expiry validation;
- does not change the server-authoritative exam timer.
The server remains authoritative for whether "FINISH" is accepted.

### Offline Behavior
The exam must remain fully usable offline during active execution.
Connectivity is required for final submission.
If connectivity is unavailable when the user attempts to finish, the client must preserve the complete local exam state and answers and must not falsely mark the attempt as submitted.
When connectivity returns, the client must establish valid authentication before the privileged "FINISH" mutation is accepted.
Authentication recovery must not clear the local exam state.

### Retry Safety
Automatic authentication recovery may retry "FINISH" at most once after an authentication failure caused by access-token expiration.
The retry mechanism must not:
- duplicate a successfully finalized attempt;
- bypass ownership checks;
- bypass exam expiration;
- bypass authorization;
- create a second attempt;
- modify the submitted answers.
Existing C4/C5 rules for "ATTEMPT_ALREADY_FINALIZED", ownership, expiry, validation, and server-side grading remain authoritative.

### Security Constraint
This decision does not create an unauthenticated FINISH path.
"POST /api/exam/finish" remains a protected endpoint and must authenticate the caller server-side.
No mock authentication or client-supplied user identity is permitted.

### Architectural Consequences
- Normal access tokens remain short-lived.
- No new exam-specific credential/token type is introduced.
- C4 exam DTOs remain unchanged.
- The active exam remains zero-request.
- Long Simulator exams remain compatible with short-lived authentication.
- Server-side authentication and authorization remain mandatory at FINISH.
- Local answers remain available through authentication/network failure recovery.

### Historical Integrity
This decision concerns authentication/session lifecycle only.
It does not authorize modification or reinterpretation of finalized attempts.
Finalized exam attempts, immutable question snapshots, submitted answers, and recorded results remain subject to the historical-integrity requirements of C1 and C5.
Future changes to authentication or grading behavior must not silently rewrite historical finalized results.

### Contract Impact
No amendment to C1–C9 is made by this Product Decision.
C1–C9 remain FROZEN v1.1.0.
This decision formally resolves the previously identified timing/lifecycle interaction between:
- C7 short-lived access credentials;
- C4/C5/C6 zero-request exam execution; and
- C5 server-authenticated FINISH.

---

## PD-003: Refresh Token Lifecycle, Replay Policy, and Operation Recovery
- **Status**: APPROVED
- **Date**: 2026-10-15
- **Scope**: Phase 2 — Authentication Foundation / Token Lifecycle / Credential Revocation
- **Contracts**: C1–C9 remain FROZEN at v1.1.0

### Context
C7 §6 and §7 mandate short-lived access credentials, refresh token expiration, and controlled credential revocation upon security-sensitive events. In distributed, mobile, and flaky network environments (specifically student connectivity in Sudan), uncertain COMMIT outcomes, concurrent multi-tab token rotations, and lost responses can inadvertently cause false-positive token theft alerts or orphaned sessions. Furthermore, password change operations must provide atomic invalidation of active sessions and deterministic recovery without leaking authentication credentials or bypassing authentication gates.

### Decision
The following architectural specifications are approved and implemented:

#### 1. D1 — Session Lifetime and Concurrency Control
- **Rolling Refresh Lifetime**: 30 days rolling expiration from each successful rotation.
- **Absolute Session Maximum**: 90 days absolute lifetime calculated from the initial session creation (`session_created_at`).
- **Hierarchical Lock Order**: All credential mutations must strictly follow a uniform lock order:
  1. Lock `users` table row first (`SELECT id, token_version FROM users WHERE id = $1 FOR UPDATE`).
  2. Lock `refresh_tokens` table rows second (`SELECT id, ... FROM refresh_tokens WHERE id = $1 FOR UPDATE`).
- **Concurrent Logout and Refresh**: Logout revokes all refresh tokens belonging to the authenticated user and increments `token_version`. A concurrent `/refresh` racing with `/logout` cannot leave a newly issued refresh token active; if `/logout` commits first, the `/refresh` transaction sees the revoked state and aborts; if `/refresh` commits first, the `/logout` transaction's subsequent lock and update revokes the newly issued token and invalidates its access token via `token_version`.
- **Legacy Token Handling**: Existing tokens pre-dating session tracking have nullable `session_id` and `session_created_at`. When rotated, a legacy token is assigned a new `session_id` with an explicit validity cap strictly bounded to the original token's recorded `expires_at`, never granting an artificial 90-day extension from migration time.

#### 2. D3 — Encrypted Replay Buffer
- **Configurable Grace Window**: Initial 15-second grace window configured via `REFRESH_REPLAY_GRACE_SECONDS` environment variable (default: 15s).
- **Authenticated Encryption**: Replacement tokens are stored encrypted using AES-256-GCM in the dedicated `refresh_replay_buffer` table.
- **Associated Data (AAD)**: Ciphertext is cryptographically bound to `${old_token_id}:${user_id}`.
- **Fail-Closed Key Management**: If the required encryption key (`encryption_key_id`) is missing or authentication tag verification fails, decryption fails closed, aborting the rotation.
- **Ambiguous Replay Policy**: When an already-revoked token is presented outside the grace window, the server returns HTTP 401 (`AUTH_REQUIRED`) without cascade-revoking the user's entire account, protecting students against network-induced false positives while denying unauthorized token extension.

#### 3. D4 — Immediate Server-Side Session Invalidation
- **token_version Column**: An authoritative integer column `token_version` in the `users` table.
- **JWT Inclusion**: The `tokenVersion` claim is embedded in every issued access JWT.
- **Strict Verification on Every Request**: The `requireAuth` middleware verifies `user.tokenVersion === claims.tokenVersion` against the primary database on every protected request.
- **Revocation Triggers**: Password changes, administrative account suspension, and user-wide logout increment `token_version`, ensuring no new protected request is accepted after revocation commit.

#### 4. D5 — Password-Change Operation Recovery
- **Single Atomic Transaction**: Password update (Argon2id), `token_version` increment, refresh token revocation, and durable operation outcome logging execute in a single database transaction.
- **Durable Operation Record**: Stored in `auth_operation_log` with a 2-hour retention limit.
- **Zero Credential Exposure**: Raw passwords or recovery secrets are never persisted in the operation log. A high-entropy `recovery_secret_hash` (SHA-256) authenticates recovery requests.
- **Non-Token Recovery**: The recovery endpoint (`POST /api/auth/change-password/recover`) confirms whether the operation committed or is uncertain; it never issues replacement tokens and requires full login with the new password.

### Contract Impact
No amendment to C1–C9 is required. C1–C9 remain FROZEN at v1.1.0.
