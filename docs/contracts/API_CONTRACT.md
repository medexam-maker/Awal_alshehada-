# API_CONTRACT.md

Contract: 4 — API & Transport
Version: 1.1.0
Status: Approved Architectural Contract
Depends On: C1 PROJECT_CONSTITUTION.md v1.1.0, C2 QUESTION_TYPES_CONTRACT.md v1.1.0, C3 DATABASE_CONTRACT.md v1.1.0
Normative Owner: This contract is the sole normative owner of API transport contracts, endpoint shapes, request/response DTOs, and HTTP behavior.

---

0. Purpose

This contract defines the HTTP API boundary between clients and the server.

It owns:

- API endpoints.
- HTTP methods.
- Request DTOs.
- Response DTOs.
- Error DTOs.
- HTTP status behavior.
- API serialization.
- Transport-level validation.
- Runtime representation exposed to clients.

It does not own:

- Question-type semantics.
- Database structure.
- Exam selection algorithms.
- Exam lifecycle semantics.
- Grading algorithms.
- Authentication policy.
- Authorization policy.
- Web/Mobile rendering.
- Exact student-facing UX.

Those responsibilities belong to C2, C3, C5, C6, and C7.

---

1. API Authority

The API is a transport boundary.

API contracts must expose approved domain behavior without redefining that behavior.

Therefore:

Domain Rule → Domain Owner
API → Transport/Exposure

The API must not independently invent:

- exam-selection logic;
- grading logic;
- Full-Cycle behavior;
- snapshot semantics;
- authorization policy;
- question-type definitions.

---

2. Base API Rules

All API responses use JSON unless explicitly documented otherwise.

IDs use UUID strings.

Dates/timestamps use ISO 8601 representations.

Requests and responses must use stable, documented field names.

Unknown or malformed input must be rejected rather than silently ignored when doing so would create ambiguous behavior.

---

3. Success Response

Successful responses use:

{
  "success": true,
  "data": {},
  "message": null,
  "timestamp": "ISO-8601"
}

"message" may be omitted or populated where appropriate.

The API must not expose internal database objects directly.

---

4. Error Response

Errors use:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "timestamp": "ISO-8601"
}

Error responses must not expose:

- SQL;
- stack traces;
- secrets;
- internal infrastructure details;
- database credentials;
- security-sensitive implementation details.

Security-related error behavior is governed by C7.

---

5. Authentication Boundary

Protected endpoints require the approved authenticated application identity.

The API consumes the authenticated identity established by the authentication layer.

Client-provided "userId" values must never be trusted as the authoritative identity for protected operations.

For ownership-sensitive operations:

Authenticated server-side user identity
        ↓
Authorization/ownership check
        ↓
Operation

Authentication and authorization semantics are owned by C7.

---

6. API Validation Pipeline

Incoming requests follow:

parse
  ↓
validate
  ↓
authenticate
  ↓
authorize
  ↓
execute domain operation
  ↓
serialize response

The exact security controls are owned by C7.

Domain behavior is owned by the relevant domain contract.

API schemas are owned by C4.

---

7. Question API

Question endpoints must expose only representations defined by the approved question contract.

Question CRUD/status/preview endpoints may include:

- create;
- read;
- update;
- status transition;
- preview.

Question content must conform to C2.

The API must validate:

- "questionType";
- content;
- answer structure;
- interaction-mode values;
- supported configuration.

The API must not create undocumented question types.

---

8. Question Creation

Question creation requires a valid question type defined by C2.

The server must validate the submitted question according to the corresponding question-type schema before persistence.

The API must not trust client-supplied grading data without server validation.

Persistence follows C3.

---

9. Question Retrieval

Question retrieval must return an appropriate DTO rather than exposing the raw database record.

The API must distinguish between:

- administrative/content-management representations;
- student runtime representations.

A student-facing runtime response must not accidentally expose server-only fields.

---

10. Training Set API

Training-set endpoints operate on the persistence model defined by C3.

Typical operations include:

GET    /api/training-sets
POST   /api/training-sets
GET    /api/training-sets/:id
PATCH  /api/training-sets/:id
POST   /api/training-sets/:id/questions
DELETE /api/training-sets/:id/questions/:questionId

Exact administrative authorization is governed by C7 and the reserved Admin Authorization Matrix.

Training-set semantics are governed by C5.

---

11. Subjects API

Public/client subject retrieval:

GET /api/subjects

Response contains the subject representation required by clients.

Subject persistence is defined by C3.

The API must not expose unnecessary internal database fields.

---

12. Exam Start

Endpoint:

POST /api/exam/start

Request:

{
  "subjectId": "UUID",
  "bankType": "comprehensive | training",
  "examMode": "training | simulator",
  "trainingSetId": "UUID | optional"
}

The authenticated user is obtained from the server-side authentication context.

A client-supplied user ID is not accepted as the authoritative exam owner.

---

13. Exam Start Semantics

The endpoint invokes the Exam Engine.

The API does not implement selection itself.

C5 owns:

- active-attempt detection;
- resume behavior;
- question selection;
- Full-Cycle Exclusion;
- training-set selection;
- snapshot creation;
- timer semantics;
- attempt state.

C4 transports the resulting state.

---

14. Exam Start Response

Successful creation/resumption returns the complete exam runtime snapshot.

Conceptual response:

{
  "success": true,
  "data": {
    "attemptId": "UUID",
    "examMode": "training | simulator",
    "bankType": "comprehensive | training",
    "status": "active",
    "subjectId": "UUID",
    "startedAt": "ISO-8601",
    "expiresAt": "ISO-8601 | null",
    "durationSeconds": "number | null",
    "totalMarks": "number",
    "questions": []
  },
  "timestamp": "ISO-8601"
}

Each question runtime representation includes the fields required by the engine/client contract, including:

- "id";
- "questionType";
- "content";
- effective interaction configuration;
- "marks";
- "position".

---

15. Simulator Answer-Key Protection

Simulator responses must never expose grading keys.

This includes:

- top-level "correct_answer";
- nested answer-bearing fields inside "content";
- any equivalent representation that reveals the canonical grading key.

Therefore:

Database Question
       ↓
Engine Snapshot
       ↓
API Sanitization
       ↓
Simulator Client

The client receives only the sanitized runtime representation.

This rule applies regardless of whether the grading key originated in "correct_answer" or nested content.

C2 owns the question structure.

C5 owns snapshot semantics.

C4 owns transport representation.

C7 owns security enforcement.

---

16. Training Runtime Representation

Training may receive additional information required for its approved instructional behavior, including information necessary for immediate educational feedback.

This does not authorize exposing unnecessary server-only data.

The Training response must remain schema-defined and must respect the security boundary established by C7.

---

17. Training Timing

For Training:

expiresAt = null
durationSeconds = null

The API transports these values.

C5 owns the semantic rule that Training is non-timed.

---

18. Simulator Timing

For Simulator:

expiresAt = required
durationSeconds = required

The client may display the timer.

The server remains authoritative for expiration.

C5 owns timer behavior.

---

19. Active Exam

Endpoint:

GET /api/exam/active

Purpose:

Recover an active exam when required.

The response follows the same runtime snapshot representation as exam start, with any locally recoverable saved state included where applicable.

Normal exam operation must not poll this endpoint.

It exists primarily for recovery.

---

20. Zero-Request Exam Lifecycle

The normal lifecycle is:

START
  ↓
Full Snapshot
  ↓
Local Exam State
  ↓
ZERO normal API requests
  ↓
FINISH
  ↓
Server Grading
  ↓
Result

The API does not provide:

- answer-by-answer endpoints;
- save-progress endpoints;
- heartbeat endpoints;
- exam polling endpoints;
- telemetry polling endpoints.

---

21. Local State

During an active exam, clients may persist:

- answers;
- navigation state;
- local exam state;
- educational interaction state where applicable.

Storage implementation is owned by C6.

The API does not receive each answer during normal exam operation.

---

22. Exam Finish

Endpoint:

POST /api/exam/finish

Request:

{
  "attemptId": "UUID",
  "answers": {
    "questionId": "answer"
  },
  "timeTakenSeconds": 123
}

"timeTakenSeconds" is telemetry.

It is not authoritative for expiration.

The server determines timing from the persisted attempt state.

---

23. Finish Security Boundary

The server must verify:

- authenticated user;
- attempt ownership;
- attempt existence;
- attempt state;
- answer structure;
- question membership;
- valid answer schemas;
- server-side grading.

C7 owns security/authorization enforcement.

C5 owns exam finalization semantics.

---

24. Simulator Expiration Grace

For timed Simulator attempts:

now <= expiresAt
    → accept

expiresAt < now <= expiresAt + 120 seconds
    → accept

now > expiresAt + 120 seconds
    → EXAM_EXPIRED

The 120-second grace period is an engine rule owned by C5.

C4 exposes the corresponding API behavior.

The grace period is not an anti-cheating mechanism.

---

25. Finalized Attempts

If an attempt has already reached a final state and another finish operation is submitted:

409 ATTEMPT_ALREADY_FINALIZED

The API exposes this state.

C5 owns the finalization rule.

---

26. Finish Response

A successful finish response contains the server-calculated result.

Conceptual representation:

{
  "success": true,
  "data": {
    "attemptId": "UUID",
    "status": "submitted",
    "totalMarks": 100,
    "obtainedMarks": 82,
    "percentage": 82,
    "gradingStatus": "auto_complete",
    "details": []
  },
  "timestamp": "ISO-8601"
}

"maxMarks"/"totalMarks" must be available wherever needed to correctly interpret the result.

The client must not calculate the authoritative result.

---

27. Result Detail

Each question result may contain:

{
  "questionId": "UUID",
  "isCorrect": true,
  "obtainedMarks": 2,
  "maxMarks": 2
}

For partial-credit question types, "isCorrect" is derived according to the approved engine rule:

isCorrect = obtainedMarks === maxMarks

The engine owns this semantic rule.

The API transports the result.

---

28. Pending Grading

Where manual or mixed grading is required:

obtainedMarks = null or partial/approved value
gradingStatus = pending_review

The exact grading lifecycle is owned by C5.

The API must accurately represent the server's current grading state.

---

29. Result Retrieval

Endpoint:

GET /api/exam/:attemptId/result

Purpose:

Retrieve the server-authoritative result of an attempt.

The response must use the same canonical result representation as the finish operation where applicable.

The client must not treat locally calculated results as authoritative.

---

30. Result Ownership

The API result is derived from:

Persisted Attempt
+
Persisted Answers
+
Server Grading

Client-calculated scores are not authoritative.

---

31. Authentication Endpoints

The API supports the application's authentication operations, including:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/google
POST /api/auth/change-password
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/logout
POST /api/auth/refresh

Exact authentication/security semantics belong to C7.

C4 owns request/response transport schemas.

---

32. History API

Where enabled:

GET /api/history

The API exposes historical exam data according to the approved persistence and authorization model.

History must respect ownership.

C3 owns stored history.

C5 owns exam/result semantics.

C7 owns authorization.

---

33. Grading API

Grading endpoints may include operations for:

- pending grading;
- manual grading;
- result updates.

These endpoints must not redefine the grading algorithm.

C5 owns grading semantics.

C7 owns authorization.

C4 owns endpoint and DTO structure.

AI grading remains a future capability and must not be treated as required for the current implementation.

---

34. Admin API Boundary

Administrative endpoints may expose content, users, grading, media, audit, or other administrative operations as approved.

However:

«This contract does not define the Admin Authorization Matrix.»

Authorization for Admin operations belongs to C7 and the reserved Admin decision area.

Any endpoint requiring Admin privileges must be protected server-side.

---

35. Subscription API

Subscription/payment endpoints are not part of the Phase 1 exam-engine dependency.

No exam endpoint may require a subscription API check unless an approved contract revision introduces that dependency.

Future payment/subscription APIs must be server-authoritative and security-reviewed.

Payment security belongs to C7.

---

36. Rate Limits

The API applies the approved baseline rate limits:

login        → 5/min
register     → 3/hour
exam start   → 10/min
exam finish  → 3/min

Additional sensitive endpoints may receive appropriate limits.

Rate-limit enforcement is a security concern owned by C7.

C4 documents the API behavior/affected endpoints.

---

37. Error Codes

The API uses stable machine-readable error codes.

Examples:

AUTH_REQUIRED
INVALID_REQUEST
VALIDATION_ERROR
NOT_FOUND
FORBIDDEN
ATTEMPT_NOT_FOUND
ATTEMPT_ALREADY_FINALIZED
EXAM_EXPIRED
INVALID_ANSWER
INVALID_QUESTION

The final error-code registry must remain centralized.

Error codes must not be duplicated with conflicting meanings across endpoints.

---

38. HTTP Status Codes

Baseline behavior:

200 → successful retrieval/update/action
201 → successful resource creation
400 → malformed/invalid request
401 → authentication required/invalid authentication
403 → authenticated but unauthorized
404 → resource not found
409 → state/conflict condition
422 → semantically invalid validated input where applicable
429 → rate limited
500 → unexpected server error

Exact security-safe error messaging is governed by C7.

---

39. API Schema Validation

All external request bodies must be validated before domain execution.

Question content and answers must additionally conform to their corresponding C2 schemas.

Exam-specific validation follows C5.

Database persistence follows C3.

The API must not rely on TypeScript compile-time types alone for untrusted runtime input.

---

40. No Direct SQL in Controllers

API route/controller code must not contain direct database SQL where a domain/service layer is responsible for the operation.

Controllers should remain thin:

HTTP request
   ↓
validate
   ↓
authenticate/authorize
   ↓
domain/service call
   ↓
serialize
   ↓
HTTP response

Database access follows C3.

Exam engine operations follow C5.

---

41. DTO Isolation

API DTOs must not simply expose:

database row = API response

DTOs are transport representations.

This is especially important for:

- passwords/password hashes;
- internal ownership fields;
- grading keys;
- audit metadata;
- storage internals;
- server-only fields.

---

42. No Client Authority

The API must not accept client-supplied authoritative values for:

- user identity;
- obtained marks;
- grading status;
- correctness;
- expiration;
- question selection;
- final result.

Where such values are submitted for UX/telemetry purposes, they are treated as untrusted.

---

43. Exam Answer Payload

The finish payload may contain answers in a map keyed by question ID.

The server must verify that:

- each question belongs to the attempt;
- each answer conforms to its question-type schema;
- no unknown question is accepted;
- duplicate/conflicting representations are rejected;
- grading uses the immutable attempt snapshot.

---

44. Offline / Reconnect Behavior

The API does not implement continuous offline synchronization for active exams.

For the approved exam lifecycle:

- active exam state remains local;
- no answer synchronization occurs during the exam;
- FINISH sends the final answer payload;
- recovery may use "GET /api/exam/active" when local state is unavailable.

Client storage and reconnect behavior are owned by C6.

---

45. API Versioning

Changes that alter a normative request/response contract require an explicit contract revision.

Breaking API changes must not be introduced silently.

Implementation changes that preserve the documented API contract do not require a contract revision.

---

46. Compatibility

Web and Mobile clients consume the same API.

Client-specific UI behavior must not require separate incompatible exam APIs unless explicitly approved.

The backend remains shared.

---

47. Security Boundary

The API must operate under C7's security model.

Security requirements include, as applicable:

- authentication;
- authorization;
- ownership;
- input validation;
- rate limiting;
- secure error handling;
- secret protection;
- answer-key protection;
- parameterized database access.

C4 documents the transport surface.

C7 remains the normative owner of security controls.

---

48. Cross-Contract Ownership

Concern| Owner
API endpoints| C4
Request/response DTOs| C4
HTTP status/error transport| C4
Question type semantics| C2
Question schemas| C2
Database structure| C3
Exam lifecycle| C5
Exam selection| C5
Snapshot semantics| C5
Grading| C5
Web rendering| C6
Mobile rendering| C6
Authentication| C7
Authorization| C7
Security controls| C7
Implementation sequence| C8
Gemini execution| C9

---

49. Non-Negotiable Rules

1. The API is a transport boundary, not a second domain engine.
2. Protected endpoints use server-side authenticated identity.
3. Client-supplied user IDs are never authoritative.
4. The API never accepts client-calculated final results as authoritative.
5. The API never accepts client-calculated marks as authoritative.
6. The API never accepts client-calculated expiration as authoritative.
7. Exam operation follows START → snapshot → zero normal requests → FINISH.
8. No answer-by-answer save endpoint exists for the normal exam lifecycle.
9. No exam heartbeat/polling endpoint is required for the normal lifecycle.
10. Simulator responses must not expose grading keys.
11. Nested answer-bearing content must also be sanitized.
12. Training may receive approved instructional data.
13. "GET /api/exam/active" is primarily a recovery mechanism.
14. The server owns final grading.
15. The server owns exam expiration.
16. The server owns attempt finalization.
17. The API does not redefine C2 question types.
18. The API does not redefine C5 engine behavior.
19. The API does not redefine C3 persistence.
20. Authentication and authorization follow C7.
21. No subscription dependency is required by Phase 1 exam APIs.
22. No direct SQL belongs in thin API controllers.
23. API DTOs must not expose raw database records.
24. AI grading remains future-only.
25. Exact Question UX/Input/Correction remains reserved.
26. Admin Authorization Matrix remains reserved.

---

50. Acceptance Criteria

C4 is accepted only when:

- all documented endpoints use stable DTOs;
- all external inputs are runtime-validated;
- authentication uses server-side identity;
- exam start invokes C5 rather than implementing selection in controllers;
- full exam snapshot is returned at start;
- normal exam operation requires zero API requests before finish;
- finish sends answers once;
- server performs authoritative grading;
- Simulator data is sanitized against both top-level and nested answer leakage;
- result retrieval returns server-authoritative results;
- 120-second Simulator grace behavior is exposed correctly;
- finalized attempts return the correct conflict behavior;
- API controllers remain thin;
- no API rule duplicates or overrides C2/C3/C5/C7;
- Web and Mobile can consume the same API;
- no Phase 1 subscription dependency is introduced.

---

51. Final Rule

The API Contract defines:

«How approved domain behavior crosses the server/client boundary.»

It does not define:

«What a question means, how an exam selects questions, how an exam is graded, how data is persisted, how clients render questions, or who is authorized to perform privileged actions.»

Therefore:

«One Domain Rule → One Owner → One API Representation → Shared Web/Mobile Consumption.»

End of Contract 4 — v1.1.0
