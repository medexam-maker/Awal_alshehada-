# Traceability Matrix - Sudan Secondary Certificate Exam Platform

| Phase | Feature/Requirement | Contract Source | Target File(s) | Status |
|---|---|---|---|---|
| **2.1** | Define 15 Question Types | `docs/contracts/QUESTION_TYPES_CONTRACT.md` (v1.1.0) | `src/shared/types.ts`<br>`src/shared/constants.ts` | ✅ Done |
| **2.1** | Question Type Registry | `docs/contracts/QUESTION_TYPES_CONTRACT.md` (v1.1.0) | `src/shared/questionTypeRegistry.ts` | ✅ Done |
| **2.1** | JSON Schema Validation | `docs/contracts/QUESTION_TYPES_CONTRACT.md` (v1.1.0) | `src/shared/validation/schemas.ts` | ✅ Done |
| **2.1** | Constants (Roles, Status, Modes) | `docs/contracts/DATABASE_CONTRACT.md` (v1.1.0)<br>`docs/contracts/API_CONTRACT.md` (v1.1.0) | `src/shared/constants.ts` | ✅ Done |
| **2.1** | Scoring Interfaces | `docs/contracts/EXAM_ENGINE_CONTRACT.md` (v1.1.0) | `src/shared/scoring.ts` | ✅ Done |
| **2.2** | PostgreSQL Schema & Migrations | `docs/contracts/DATABASE_CONTRACT.md` (v1.1.0) | `migrations/*.sql` | ✅ Done |
| **2.2** | DB Connection Pool & Validator | `docs/contracts/IMPLEMENTATION_PLAN.md` (v1.1.0) | `src/server/db/index.ts` | ✅ Done |
| **2.3** | Full-Cycle Exclusion Algorithm | `docs/contracts/EXAM_ENGINE_CONTRACT.md` (v1.1.0) | `src/server/lib/questionSelection.ts` | ✅ Done |
| **2.3** | Immutable Snapshots | `docs/contracts/EXAM_ENGINE_CONTRACT.md` (v1.1.0) | `src/server/lib/snapshot.ts` | ✅ Done |
| **2.3** | Server-Authoritative Auto-Grading | `docs/contracts/EXAM_ENGINE_CONTRACT.md` (v1.1.0) | `src/server/lib/scoringEngine.ts` | ✅ Done |
| **2.3** | Lifecycle: Start, Active, Finish | `docs/contracts/EXAM_ENGINE_CONTRACT.md` (v1.1.0) | `src/server/lib/attemptManager.ts`<br>`src/server/lib/recovery.ts` | ✅ Done |
| **2.4** | Authentication & PD-003 Token Lifecycle | `docs/PRODUCT_DECISIONS.md` (PD-003)<br>`docs/contracts/SECURITY_CONTRACT.md` (v1.1.0) | `src/server/lib/tokenService.ts`<br>`src/server/routes/authRoutes.ts`<br>`src/server/middleware/auth.ts`<br>`migrations/005_auth_refresh_tokens.sql`<br>`migrations/006_auth_lifecycle_and_replay.sql` | ✅ Done |
| **2.4** | API Layer Endpoints & Transport DTOs | `docs/contracts/API_CONTRACT.md` (v1.1.0) | `src/server/routes/authRoutes.ts`<br>`src/server/routes/examRoutes.ts`<br>`src/server/routes/subjectRoutes.ts`<br>`src/shared/validation/apiSchemas.ts` | ✅ Done |
| **2.5** | Web Client Arabic RTL & Platform Identity | `docs/contracts/WEB_MOBILE_CONTRACT.md` (v1.1.0) | `index.html`<br>`src/App.tsx`<br>`src/client/components/layout/` | ✅ Done |
| **2.5** | 15 Question Type Web Renderers | `docs/contracts/QUESTION_TYPES_CONTRACT.md` (v1.1.0)<br>`docs/contracts/WEB_MOBILE_CONTRACT.md` (v1.1.0) | `src/client/components/questions/*.tsx` | ✅ Done |
| **2.5** | Zero-Request Invariant & Local Persistence | `docs/contracts/WEB_MOBILE_CONTRACT.md` §14<br>`docs/PRODUCT_DECISIONS.md` (PD-002) | `src/client/storage/examStorage.ts`<br>`src/client/context/ExamContext.tsx` | ✅ Done |
| **2.5** | Simulator Timer & Grace Window Awareness | `docs/contracts/WEB_MOBILE_CONTRACT.md` §17–18 | `src/client/hooks/useTimer.ts`<br>`src/client/components/exam/Timer.tsx` | ✅ Done |
| **2.5** | FINISH Submission & Token Recovery (PD-002/D3) | `docs/contracts/WEB_MOBILE_CONTRACT.md` §15<br>`docs/PRODUCT_DECISIONS.md` (PD-002, PD-003) | `src/client/api/apiClient.ts`<br>`src/client/pages/ExamView.tsx` | ✅ Done |
| **2.5** | Authoritative Result Display & Review | `docs/contracts/WEB_MOBILE_CONTRACT.md` §16 | `src/client/pages/ResultView.tsx` | ✅ Done |
| **2.5** | Dual-Mode Resilience (Live + Standalone Curriculum) | `docs/contracts/WEB_MOBILE_CONTRACT.md` §10 | `src/client/data/demoCurriculum.ts`<br>`src/client/context/ExamContext.tsx` | ✅ Done |
| **2.6** | Pattern 01: Multiple Choice Lifecycle (Input, Save, Display, Grading) | Owner Approved Architecture | `src/client/pages/admin/AdminDashboard.tsx`<br>`src/server/routes/adminRoutes.ts`<br>`src/client/components/questions/MultipleChoiceRenderer.tsx`<br>`src/server/lib/scoringEngine.ts`<br>`scripts/verifyMCQPattern.ts` | ✅ Done |
| **2.6** | Pattern 02: True / False Lifecycle (Input, Save, Display, Grading) | Owner Approved Architecture | `src/client/pages/admin/AdminDashboard.tsx`<br>`src/server/routes/adminRoutes.ts`<br>`src/client/components/questions/TrueFalseRenderer.tsx`<br>`src/server/lib/scoringEngine.ts`<br>`scripts/verifyTrueFalsePattern.ts` | ✅ Done |

*(Updated: 2026-10-17 — Patterns 01 (MCQ) & 02 (True/False) Complete with Full Verification Suites)*

