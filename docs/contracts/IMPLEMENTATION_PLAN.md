# IMPLEMENTATION_PLAN.md

Contract 8 — Implementation & Delivery Plan

Version 1.1.0

---

0. Contract Status

Status: Architecture Review / Candidate Freeze
Contract: C8
Authority: Implementation sequencing, delivery stages, verification gates, and implementation workflow
Depends on: C1 v1.1.0, C2 v1.1.0, C3 v1.1.0, C4 v1.1.0, C5 v1.1.0, C6 v1.1.0, C7 v1.1.0

C8 defines how the approved architecture is implemented.

C8 MUST NOT redefine architectural decisions owned by C1–C7.

---

1. Purpose

The implementation plan exists to:

- convert the approved architecture into controlled implementation stages;
- minimize cross-phase regressions;
- verify each stage before proceeding;
- prevent unauthorized architectural changes during implementation;
- maintain traceability from contracts to code;
- provide explicit STOP/GATE conditions;
- keep incomplete work isolated from production.

---

2. Normative Ownership

C8 is the sole normative owner of:

- implementation sequence;
- phase dependencies;
- implementation gates;
- verification workflow;
- delivery criteria;
- implementation status;
- rollback/hold conditions;
- phase completion criteria.

C8 does NOT own:

- product architecture → C1;
- question semantics → C2;
- database architecture → C3;
- API contracts → C4;
- exam engine → C5;
- Web/Mobile architecture → C6;
- security semantics → C7;
- Gemini execution rules → C9.

---

3. Governing Rule

Implementation MUST follow the approved contracts.

When code conflicts with a contract:

the contract wins.

The implementation MUST NOT silently modify the contract to accommodate existing code.

A conflict MUST be:

1. identified;
2. documented;
3. classified;
4. resolved explicitly;
5. only then implemented.

---

4. Implementation Order

The canonical implementation sequence is:

Foundation → Shared Contracts → Database → Engine → API → Web/Mobile Integration → Security Hardening → Final Verification → Release

The exact phase/batch sequence below is mandatory unless an explicit architectural decision changes it.

---

5. Phase 1 — Foundation

Objective

Establish the baseline application structure and foundational data model.

Scope

Phase 1 includes:

- project foundation;
- React + TypeScript + Vite frontend;
- Express + TypeScript backend;
- PostgreSQL/Supabase database integration;
- shared TypeScript foundation;
- authentication foundation;
- initial schema;
- core question-bank foundation;
- baseline exam functionality required by the approved architecture.

Verification

Phase 1 MUST verify:

- project builds;
- TypeScript validation passes;
- database connectivity works;
- migrations execute correctly;
- foundational API/client integration works;
- no mock data remains on production execution paths;
- no unauthorized architecture is introduced.

Phase 1 completion MUST NOT be inferred merely from a successful build.

---

6. Phase 2 — Official Question Bank & Exam Modes

Phase 2 implements the approved exam architecture.

The authoritative contracts are:

- C2 for question types;
- C3 for persistence;
- C4 for API;
- C5 for exam engine;
- C6 for clients;
- C7 for security.

Phase 2 MUST NOT introduce question types outside C2.

---

7. Phase 2.1 — Shared Contracts / Registry Foundation

Objective

Establish the shared type and registry foundation required by later phases.

Scope

Includes:

- shared question types;
- question-type registry;
- shared validation foundations;
- shared constants/enums where required;
- interaction-mode definitions;
- platform-neutral contracts.

Requirements

- No duplicated question-type definitions.
- No "any".
- Registry identity MUST follow C2.
- Shared contracts MUST remain platform-neutral.
- Client rendering MUST NOT be embedded in domain contracts.

Gate

GATE 2.1

Required:

- TypeScript passes;
- shared types compile;
- registry is internally consistent;
- all supported C2 question types are represented;
- no forbidden duplicate definitions;
- no architectural contract changes.

---

8. Phase 2.2 — Database Foundation

Objective

Implement the database architecture defined by C3.

Scope

Includes:

- migrations;
- required tables;
- constraints;
- indexes;
- foreign keys;
- JSONB storage;
- attempt persistence;
- snapshot persistence;
- answer persistence;
- question history;
- media metadata;
- audit logs.

Requirements

- PostgreSQL remains the system of record.
- No ORM.
- Explicit SQL through the approved database layer.
- Migrations are the source of schema evolution.
- Historical integrity MUST be preserved.
- No schema changes may be invented outside C3.

Gate

GATE 2.2

Required:

- migrations execute successfully;
- schema matches C3;
- constraints behave correctly;
- relevant indexes exist;
- transaction behavior is verified;
- historical records cannot be silently rewritten;
- no unauthorized schema changes exist.

---

9. Phase 2.3 — Exam Engine

Objective

Implement C5's exam lifecycle and selection/grading authority.

Scope

Includes:

- START;
- active-attempt handling;
- question selection;
- comprehensive Full-Cycle Exclusion;
- training-set selection;
- snapshot generation;
- attempt state;
- timing;
- simulator grace period;
- FINISH;
- server-side grading;
- result generation.

Requirements

The engine MUST remain server-authoritative.

The implementation MUST support:

START → Full Snapshot → Local Execution → FINISH → Server Grading → Result

No hidden answer synchronization or exam polling may be introduced.

Gate

GATE 2.3

Required:

- selection rules pass;
- no duplicate questions;
- Full-Cycle Exclusion passes;
- training-set behavior passes;
- snapshot immutability passes;
- timing/grace behavior passes;
- grading tests pass;
- result calculations pass;
- concurrency-sensitive attempt behavior passes.

---

10. Phase 2.4 — API Layer

Objective

Expose the approved exam engine through the API defined by C4.

Scope

Initial exam API:

- "POST /api/exam/start"
- "GET /api/exam/active"
- "POST /api/exam/finish"
- "GET /api/exam/:attemptId/result"

Additional APIs MUST follow C4.

Requirements

Controllers MUST remain thin.

Routes/controllers MUST NOT:

- implement direct SQL;
- duplicate exam-engine logic;
- invent grading rules;
- trust client identity;
- implement mock authentication in production paths;
- expose Simulator grading keys.

API behavior MUST delegate domain behavior to the appropriate service/engine layer.

Gate

GATE 2.4

Required:

- API DTOs match C4;
- authentication uses real server-side identity;
- authorization checks pass;
- validation passes;
- engine integration passes;
- error envelope matches C4;
- no direct SQL exists in controllers;
- Simulator projection does not expose grading keys;
- exam zero-request behavior remains intact.

If required authentication/test infrastructure is unavailable, the phase MUST enter HOLD rather than using mock authentication to claim completion.

---

11. Phase 2.5 — Web Client Integration

Objective

Connect the Web client to the approved API and engine.

Scope

Includes:

- exam start;
- snapshot consumption;
- question rendering;
- local answer state;
- training feedback;
- simulator execution;
- finish;
- result display;
- recovery.

Requirements

C6 is authoritative for client architecture.

The Web client MUST NOT:

- become an exam authority;
- calculate authoritative results;
- synchronize answers during the exam;
- poll for exam progress;
- fetch replacement questions;
- expose grading keys;
- implement independent business rules.

Exact question UX/input/correction behavior remains subject to the reserved decisions.

Gate

GATE 2.5

Required:

- Web build passes;
- all supported question types render safely;
- local exam state works;
- refresh/recovery works;
- zero-request rule is verified;
- FINISH works;
- server result is displayed as authoritative;
- no hidden polling exists.

---

12. Phase 2.6 — Android / Capacitor Integration

Objective

Deliver the Android client using the architecture defined by C6.

Scope

Includes:

- Capacitor wrapper;
- shared Web core;
- Android platform integration;
- secure authentication storage;
- lifecycle recovery;
- camera UX integration where applicable;
- Android build/release verification.

Requirements

Android MUST remain:

React + TypeScript + Vite + Capacitor

It MUST NOT become a React Native implementation.

The Android wrapper MUST consume an explicit/pinned version of the shared core.

The Android repository MUST NOT silently modify production Web source.

Gate

GATE 2.6

Required:

- Android build succeeds;
- shared core version is explicit/pinned;
- authentication works securely;
- lifecycle recovery works;
- exam zero-request rule remains intact;
- camera remains UX-only;
- no server-side proctoring behavior is introduced.

---

13. Phase 2.7 — Security Hardening

Objective

Verify implementation compliance with C7.

Scope

Includes:

- authentication;
- authorization;
- object-level access control;
- token handling;
- password security;
- rate limiting;
- secrets;
- CORS/CSRF where applicable;
- XSS protections;
- storage security;
- upload security;
- audit logging;
- error leakage;
- privilege escalation prevention.

Gate

GATE 2.7

Required:

- C7 security checks pass;
- no production secrets exist in source/client;
- unauthorized access tests fail safely;
- sensitive data is not leaked;
- security-sensitive events are audited;
- Admin permissions remain governed by the reserved authorization matrix.

---

14. Final Integration Phase

Objective

Verify that the complete system conforms to C1–C7 as one architecture.

Verification MUST cover:

- Web;
- Android;
- API;
- database;
- exam engine;
- authentication;
- authorization;
- question registry;
- all supported question types;
- training mode;
- simulator mode;
- recovery;
- finish/result;
- security boundaries.

---

15. Contract Traceability

Every implementation feature MUST map to an authoritative contract.

Minimum traceability:

Area| Contract
Product architecture| C1
Question types| C2
Database| C3
API| C4
Exam engine| C5
Web/Mobile| C6
Security| C7
Implementation| C8
Gemini execution| C9

A feature without an identifiable owner MUST NOT be implemented until ownership is resolved.

---

16. Single Ownership Rule

Implementation code MUST NOT create competing sources of truth.

Examples:

- question types → C2/registry;
- exam selection → C5;
- database structure → C3;
- API DTOs → C4;
- security rules → C7.

A convenience implementation MUST NOT become an undocumented second authority.

---

17. Verification Before Progression

A phase is complete only when:

1. implementation is finished within scope;
2. required tests pass;
3. contract compliance is verified;
4. unauthorized changes are removed;
5. no unresolved blocking issue remains;
6. the gate is explicitly accepted.

A successful build alone is insufficient.

---

18. HOLD State

A phase MUST enter HOLD when:

- a required dependency is missing;
- authentication infrastructure is unavailable;
- tests cannot establish correctness;
- a contract conflict exists;
- an unauthorized architectural change is discovered;
- required verification cannot be performed;
- implementation would require an unapproved architectural decision.

HOLD MUST NOT be bypassed by:

- mock production authentication;
- fake data;
- disabling validation;
- weakening security;
- modifying a contract without approval;
- silently changing scope.

---

19. STOP Rule

When a task explicitly says:

DIAGNOSTIC ONLY / DO NOT MODIFY

the executor MUST:

1. inspect;
2. report findings;
3. identify affected files;
4. classify findings;
5. STOP.

No implementation may begin.

---

20. Unauthorized Changes

Any modification outside the approved task scope MUST be classified as unauthorized.

Examples:

- unrelated package changes;
- changing development scripts;
- replacing real authentication with mock authentication;
- introducing new endpoints;
- changing API routes;
- changing schema;
- changing architectural dependencies;
- modifying production configuration without authorization.

Unauthorized changes MUST NOT be accepted merely because they compile.

---

21. Production Repository Protection

The production Web repository MUST remain protected from experimental implementation work.

Development changes MUST follow the approved repository workflow.

The Android wrapper MUST consume an explicit shared-core version.

Manual push control remains part of project governance.

No implementation task may assume that a Git push is harmless.

---

22. Build Verification

Every implementation gate requiring a build MUST verify the correct artifact.

A successful backend/server build MUST NOT be interpreted as proof that the frontend build succeeded.

The verification MUST confirm:

- expected build command;
- expected output;
- expected frontend artifacts where applicable;
- expected backend artifacts where applicable.

---

23. Test Layers

Verification SHOULD use multiple layers:

Unit Tests

For isolated logic.

Contract Tests

For shared schemas, DTOs, registry behavior, and contract boundaries.

Integration Tests

For API ↔ engine ↔ database behavior.

Security Tests

For authentication, authorization, and abuse cases.

Client Tests

For Web/Mobile behavior and recovery.

End-to-End Tests

For complete user flows.

No single test layer is sufficient for the entire platform.

---

24. Regression Protection

A bug fix MUST NOT be considered complete if it creates a regression in another approved contract.

High-risk changes MUST trigger targeted regression tests.

Especially protected areas include:

- exam selection;
- snapshots;
- grading;
- authentication;
- authorization;
- API contracts;
- database migrations;
- Web/Mobile parity.

---

25. Data Migration Rules

Any database change MUST use the migration system defined by C3.

No manual production schema modification may replace a migration.

Migrations MUST be:

- ordered;
- repeatable where appropriate;
- reviewed;
- tested before production;
- compatible with historical data requirements.

---

26. Implementation of Question Types

Question types MUST be implemented from C2.

Implementation MUST NOT:

- invent a new type identifier;
- duplicate type schemas;
- silently change grading semantics;
- expose grading keys in Simulator;
- introduce an unsupported type as a substitute.

Exact UX/input/correction decisions remain reserved where specified by the project governance.

---

27. Exam Implementation

Exam behavior MUST be implemented from C5.

The implementation MUST preserve:

- server authority;
- snapshot integrity;
- Full-Cycle Exclusion;
- training-set behavior;
- zero-request exam execution;
- server-side grading;
- timing/grace semantics;
- historical integrity.

Any deviation MUST be treated as a contract issue, not a local implementation preference.

---

28. API Implementation

API implementation MUST follow C4.

Before accepting an endpoint as complete, verify:

- path;
- method;
- request DTO;
- authentication;
- authorization;
- validation;
- service delegation;
- response DTO;
- error behavior;
- security behavior.

---

29. Client Implementation

Client implementation MUST follow C6.

Before accepting a client feature, verify:

- platform neutrality of business logic;
- local exam state;
- zero-request behavior;
- recovery;
- server authority;
- API DTO isolation;
- secure credential handling;
- Web/Mobile parity.

---

30. Security Implementation

Security implementation MUST follow C7.

Security MUST NOT be postponed until after production release when it protects an already-implemented feature.

Security controls SHOULD be implemented alongside the feature they protect and formally verified at the security gate.

---

31. External Audit Workflow

For major contract-bound phases:

1. implementation or diagnostic work completes;
2. internal verification runs;
3. findings are documented;
4. external audit may be requested;
5. audit findings are classified;
6. required corrections are implemented;
7. gate is re-verified;
8. phase is accepted.

An external audit PASS does not authorize unrelated implementation changes.

---

32. Audit Finding Classification

Findings SHOULD be classified:

- 🔴 CONTRADICTION — conflicts with an approved contract.
- 🟡 DUPLICATION / OWNERSHIP — creates a competing source of truth.
- 🟠 QUESTIONABLE — behavior may be logically or technically inappropriate and requires decision.
- 🟢 CONSISTENT — compatible with the architecture.

Reserved decisions MUST be reported rather than silently resolved.

---

33. Architecture Decision Boundary

Implementation agents MUST NOT become architecture owners.

If implementation requires a decision not already defined by C1–C7:

STOP → report → obtain architectural decision → implement.

The implementation agent may propose an option, but MUST NOT silently choose a new architectural rule.

---

34. Scope Control

Each task MUST define:

- objective;
- allowed files/components;
- prohibited changes;
- dependencies;
- verification commands;
- expected outputs;
- STOP conditions.

Changes outside the defined scope require explicit authorization.

---

35. No Opportunistic Refactoring

Implementation tasks MUST NOT include unrelated:

- refactoring;
- dependency upgrades;
- package changes;
- architecture cleanup;
- naming changes;
- formatting changes;
- repository restructuring.

unless explicitly included in the task.

---

36. Dependency Changes

New dependencies MUST NOT be added merely for convenience.

A dependency change requires:

- justification;
- compatibility verification;
- security review;
- build verification;
- confirmation that it does not violate the approved stack.

---

37. Release Readiness

Before release, verify:

- all mandatory gates are accepted;
- production build succeeds;
- database migrations are verified;
- API contracts pass;
- security checks pass;
- Web build passes;
- Android build passes;
- no unauthorized changes remain;
- no critical unresolved findings remain;
- production configuration is separated from development configuration.

---

38. Rollback / Recovery

Every production-impacting implementation MUST have a recovery path appropriate to the change.

For database changes, rollback planning MUST respect historical data integrity.

For client releases, previous known-good versions SHOULD remain identifiable.

For API changes, backward compatibility MUST be evaluated before deployment.

---

39. Implementation Status Vocabulary

The project SHOULD use the following controlled states:

- "PLANNED"
- "IN_PROGRESS"
- "VERIFYING"
- "HOLD"
- "AUDIT_PENDING"
- "AUDIT_FAILED"
- "APPROVED"
- "BLOCKED"
- "RELEASED"

A phase MUST NOT be marked "APPROVED" without passing its required gate.

---

40. Current Project Baseline

At the time of C8 review, the known Phase 2 baseline is:

- Phase 2.1 — Shared Contracts / Registry: implemented
- Phase 2.2 — Database Foundation: implemented
- Phase 2.3 — Exam Engine: implemented
- Phase 2.4 — API Layer: HOLD
- Phase 2.5 — Web Client Integration: pending
- Phase 2.6 — Android / Capacitor Integration: pending
- Phase 2.7 — Security Hardening: pending formal implementation gate
- Final Integration: pending

The Phase 2.4 HOLD MUST NOT be bypassed.

---

41. Phase 2.4 Historical Governance Note

A previous Phase 2.4 execution introduced unauthorized changes, including:

- unauthorized "package.json" modification;
- unauthorized "server.ts" changes;
- unauthorized API implementation changes;
- mock authentication;
- endpoint behavior inconsistent with C4.

These changes MUST be treated as governance violations and MUST NOT become the implementation baseline.

The recovery state is determined by explicit verification against C4/C5/C7.

---

42. No Production Promotion from HOLD

Code associated with a HOLD phase MUST NOT be promoted as completed architecture.

It may remain available for investigation, but it is not considered accepted implementation.

---

43. Completion Definition

The implementation program is complete only when:

- all mandatory phases pass;
- all gates are accepted;
- C1–C7 remain satisfied;
- C8 implementation requirements are satisfied;
- C9 execution governance is satisfied;
- no unresolved blocking architectural conflict remains;
- Web and Android deliverables pass their respective release checks.

---

44. Final Implementation Rule

«Implement the approved architecture; do not redesign it during implementation.»

When the code and contract disagree:

STOP → identify → resolve → implement → verify.

When verification cannot establish correctness:

HOLD.

When a task forbids modification:

STOP after diagnosis.

---

45. Contract Freeze Statement

After approval, C8 v1.1.0 becomes the normative implementation and delivery plan.

C8 does not override C1–C7.

C9 governs the behavior of the execution agent and the enforcement of this plan.

The complete governance chain is:

C1 Architecture
→ C2 Question Types
→ C3 Database
→ C4 API
→ C5 Exam Engine
→ C6 Web/Mobile
→ C7 Security
→ C8 Implementation
→ C9 Execution Protocol

The implementation program MUST preserve this separation.
