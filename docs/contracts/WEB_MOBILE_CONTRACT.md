# WEB_MOBILE_CONTRACT.md

Contract: 6 — Web & Mobile Client Architecture
Version: 1.1.0
Status: Draft for External Audit
Depends On: C1 PROJECT_CONSTITUTION.md v1.1.0, C2 QUESTION_TYPES_CONTRACT.md v1.1.0, C3 DATABASE_CONTRACT.md v1.1.0, C4 API_CONTRACT.md v1.1.0, C5 EXAM_ENGINE_CONTRACT.md v1.1.0
Normative Owner: This contract is the sole normative owner of Web/Mobile client architecture, platform integration, client-side runtime behavior, and shared client architecture.

---

0. Purpose

This contract defines how the shared application is consumed by:

- Web;
- Mobile Android.

The Web and Mobile clients must use the same:

- backend;
- database;
- authentication system;
- API contracts;
- question contracts;
- exam engine;
- grading rules;
- content;
- user accounts;
- attempts;
- results;
- storage architecture.

This contract does not create separate Web and Mobile business logic.

---

1. Architectural Principle

The platform has one application domain with multiple client surfaces.

                    ┌──────────────────┐
                    │ Shared Backend   │
                    │ Express/TS       │
                    │ Netlify Functions│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ PostgreSQL       │
                    │ / Supabase       │
                    └──────────────────┘
                             ▲
                 ┌───────────┴───────────┐
                 │                       │
        ┌────────┴────────┐     ┌────────┴────────┐
        │ Web Client      │     │ Android Client  │
        │ React + Vite    │     │ React + Vite    │
        │ TypeScript      │     │ Capacitor       │
        └─────────────────┘     └─────────────────┘

The clients are presentation/runtime surfaces over the same domain.

---

2. Web Technology

The Web application uses:

- React;
- TypeScript;
- Vite.

The Web client must consume the shared API and contracts.

It must not create a parallel backend or alternate exam engine.

---

3. Mobile Technology

The Android application uses:

- React;
- TypeScript;
- Vite;
- Capacitor.

Mobile is a packaged client of the Web application architecture.

It is not React Native.

It must not introduce a second application domain or second exam engine.

---

4. Shared Core Principle

Business logic that is independent of the physical platform should remain shared.

Examples include:

- API client behavior;
- DTO parsing;
- shared types;
- validation;
- authentication state handling;
- question registry consumption;
- exam-session state model;
- local exam-state model;
- result models;
- platform-neutral utilities.

Platform-specific behavior must be isolated behind explicit platform boundaries.

---

5. Platform Abstraction

Code that differs between Web and Android must use an explicit platform abstraction.

Examples:

- camera access;
- storage;
- safe-area handling;
- application lifecycle;
- native navigation integration;
- external browser interaction;
- Android-specific capabilities.

Platform-specific code must not leak throughout the shared application.

---

6. No Platform-Specific Business Rules

The Android client must not implement a different:

- question-selection algorithm;
- Full-Cycle algorithm;
- grading algorithm;
- timer authority;
- expiration rule;
- result calculation;
- attempt lifecycle.

The Web client must follow the same rule.

All such behavior belongs to C5.

---

7. Question Rendering Ownership

Question rendering belongs to the client layer.

The client consumes the question type and schema defined by C2.

The client must not redefine:

- question type identity;
- canonical answer schema;
- grading key;
- marks semantics;
- engine selection rules.

---

8. Reserved Question UX Decisions

The exact UX for each question type remains intentionally outside this contract.

This includes:

- exact visual presentation;
- exact answer-entry method;
- exact interaction sequence;
- exact correction presentation;
- exact feedback behavior.

C6 may implement the finally approved UX, but may not independently establish it as a normative domain rule.

---

9. Question Registry Consumption

The client must use the shared question-type registry/contracts.

Question types must not be hardcoded independently in Web and Mobile implementations where doing so would create divergent definitions.

The registry determines which question types are recognized.

C2 remains the normative owner of question-type definitions.

---

10. Unsupported Question Types

If a client cannot render a question type required by an exam snapshot, it must fail safely.

It must not:

- substitute another question type;
- alter the question;
- silently remove the question;
- modify the grading schema;
- invent a fallback answer representation.

The client must surface an explicit unsupported-question state.

---

11. Exam Snapshot Consumption

After START, the client receives the complete exam snapshot defined by C4/C5.

The client must treat the snapshot as immutable exam-definition data.

It must not fetch replacement questions during normal exam execution.

---

12. Client Exam State

The client maintains local runtime state including, as applicable:

- attempt ID;
- exam mode;
- question snapshot;
- answers;
- current position;
- navigation state;
- local interaction state;
- local recovery state.

This state exists to operate the client between START and FINISH.

It is not authoritative for final grading.

---

13. Local Answer Storage

Answers during an active exam are maintained locally.

The client may use:

- in-memory state;
- localStorage;
- IndexedDB;
- an appropriate Capacitor storage mechanism.

The selected mechanism must support reliable recovery appropriate to the platform.

---

14. No Answer Synchronization

The client must not implement answer-by-answer synchronization with the backend.

There is no normal:

- save-answer request;
- save-progress request;
- heartbeat;
- answer polling;
- exam-state polling.

This directly implements the Zero-Request rule defined by C5.

---

15. FINISH Submission

At FINISH, the client sends the final answer state through the API defined by C4.

The client may send:

- attempt ID;
- answers;
- allowed telemetry such as "timeTakenSeconds".

Telemetry is not authoritative.

The client must not send:

- client-calculated marks as authoritative data;
- client-calculated correctness as authoritative data;
- client-calculated percentage;
- a client-created final result.

---

16. Server Result Authority

After FINISH, the client displays the server-returned result.

The client must not replace or recalculate the authoritative result.

Server values remain authoritative for:

- obtained marks;
- total marks;
- percentage;
- grading status;
- correctness;
- question-level results.

---

17. Simulator Timer

The Simulator timer displayed by Web/Mobile is a client-side presentation of server-defined timing.

The client may:

- display remaining time;
- update the visual countdown;
- warn the user;
- disable local interactions when appropriate.

The client must not determine server validity from its own clock.

---

18. Simulator Expiration

The client must not assume that its local clock is authoritative.

The final acceptance/rejection of FINISH is determined by the server according to C5, including the 120-second grace period.

A client-side timer reaching zero must not be treated as proof that the server will reject a submission.

---

19. Training Timer

Training has no authoritative exam timer.

The client must not introduce a mandatory expiration mechanism for Training that conflicts with C5.

Any educational timing feature must remain non-authoritative and must not alter attempt validity.

---

20. Training Feedback

Training may provide immediate educational feedback.

The client may present approved instructional information available in the Training snapshot.

The exact feedback and correction UX remains reserved.

The client must not convert local feedback into authoritative final grading.

---

21. Simulator Feedback

Before FINISH, the Simulator client must not expose authoritative correctness or final grading information.

It must not derive an authoritative score locally.

---

22. Recovery

The preferred recovery sequence is:

Local Exam State
      ↓
if unavailable/corrupted
      ↓
GET /api/exam/active

Recovery must restore the existing active attempt.

It must never create a second attempt.

---

23. Recovery Scope

Recovery is an exception to the normal zero-request execution rule.

"GET /api/exam/active" is used only when required to recover an active session.

It must not become:

- polling;
- heartbeat;
- periodic synchronization;
- continuous exam-state refresh.

---

24. Browser Refresh

Web must support reasonable recovery from:

- browser refresh;
- accidental navigation;
- temporary application restart;

using local exam state where available.

The recovery implementation must preserve the existing attempt ID and snapshot.

---

25. Android Application Restart

Android must support reasonable recovery after application lifecycle events, including:

- backgrounding;
- process recreation where recoverable;
- application restart.

Local state must be persisted sufficiently to restore the active exam without requiring answer synchronization.

---

26. Connectivity Loss

Loss of connectivity during an active exam must not require continuous synchronization.

The client continues using its locally available exam state.

When connectivity is restored, the normal operation remains:

START → local exam → FINISH

There is no answer replay queue or background answer synchronization.

---

27. FINISH Connectivity Failure

If FINISH cannot reach the server:

- the client must not mark the attempt as successfully submitted;
- the client should preserve the local final answer state;
- the user may retry FINISH.

The server remains the only authority for successful finalization.

---

28. Duplicate FINISH Attempts

The client should prevent accidental repeated FINISH submissions where practical.

However, server-side concurrency protection remains authoritative.

A client-side lock is not a substitute for C5 finalization locking.

---

29. Authentication State

Web and Mobile use the same application authentication model.

Clients must consume the authentication API defined by C4.

They must not implement separate user identity systems.

The server determines authenticated identity.

---

30. Authentication Storage

Client-side authentication credentials/tokens must use the safest storage mechanism available for the platform.

The exact security requirements and threat controls belong to C7.

C6 only defines the client integration boundary.

---

31. Authorization

The client may hide or show UI according to known user state.

However:

«Client-side visibility is not authorization.»

The server must enforce authorization according to C7.

C6 does not define Admin permission policy.

---

32. Admin Interface

An Admin interface may exist on Web and/or Mobile according to product requirements.

C6 does not define the Admin permission matrix.

Any unusual or unsafe permission behavior must be escalated to the security/architecture review rather than invented by the client.

---

33. RTL and Localization

The platform supports Arabic-first presentation.

Client architecture must support:

- RTL layouts;
- Arabic text;
- English text where required;
- localized labels;
- localized validation/error messages.

Text direction must not be implemented independently in a way that causes Web/Mobile behavioral divergence.

---

34. Responsive Web

The Web client must support the intended range of user screen sizes.

Responsive behavior is a presentation concern.

It must not alter:

- question semantics;
- answer schema;
- grading;
- exam timing;
- attempt lifecycle.

---

35. Mobile Safe Areas

The Android client must correctly account for device-specific screen constraints such as:

- status bars;
- navigation areas;
- display cutouts;
- safe areas.

These are presentation/platform concerns.

They must not modify exam semantics.

---

36. Capacitor Boundary

Capacitor is the mobile integration boundary.

Native functionality must be accessed through Capacitor-supported mechanisms or explicit platform adapters.

Native functionality must not become a second source of business logic.

---

37. Camera

The Simulator may use the device camera as an exam-like UX feature.

Camera behavior is client/device functionality.

The platform does not implement:

- recording;
- video upload;
- server video storage;
- behavioral analysis;
- automated proctoring;
- cheating detection.

The exact camera UX remains a product/UI decision.

---

38. Media

Question and content media must use the storage/API architecture defined by C3/C4.

The client consumes media references.

It must not create independent storage semantics for Web versus Android.

---

39. Offline Scope

Offline behavior is intentionally limited.

During an already-started exam, local state permits continued interaction without normal API requests.

Offline mode does not create:

- offline account registration;
- offline authoritative grading;
- offline authoritative result submission;
- offline database synchronization.

---

40. Deep Links and External Navigation

Where Mobile requires navigation to external web resources, payment pages, authentication providers, or similar services, the integration must preserve the canonical application/API boundaries.

External navigation must not bypass server authorization or security controls.

---

41. API Client Boundary

All Web/Mobile API calls must pass through a shared, controlled API client layer where practical.

The API client is responsible for:

- request construction;
- authentication headers;
- response parsing;
- standard error handling;
- DTO validation.

Business decisions remain outside the transport layer.

---

42. DTO Isolation

Clients consume API DTOs defined by C4.

They must not depend on:

- database rows;
- SQL structures;
- internal server objects;
- ORM models;
- private engine implementation details.

---

43. Error Handling

Client error handling must use canonical API error codes/messages.

The client must not expose:

- SQL;
- stack traces;
- secrets;
- internal infrastructure details.

User-facing wording may be localized.

---

44. Security Boundary

C6 does not replace C7.

The client must follow security requirements defined by C7 for:

- token handling;
- sensitive data;
- storage;
- permissions;
- network behavior;
- media;
- secrets.

Secrets must never be embedded in the client bundle.

---

45. Environment Configuration

Environment-specific configuration must be separated from application logic.

The client must not hardcode:

- production secrets;
- private API keys;
- database credentials;
- privileged service credentials.

Public configuration values must not be treated as secrets.

---

46. Build Separation

Web and Android builds must remain reproducible.

The Android wrapper must consume the intended shared Web application/core version.

The Android build must not silently pull arbitrary or mutable core code.

Version/commit selection must be explicit.

---

47. Repository Architecture

Where the approved repository structure uses a separate Android wrapper:

Web/Core Repository
        ↓
Android Wrapper Repository
        ↓
Capacitor Android Project

The Android wrapper consumes a pinned/explicit version of the shared core.

The production repository must not be modified as an incidental consequence of Android development.

---

48. Deployment Boundary

Web deployment and Android packaging are separate delivery surfaces.

A Web deployment must not automatically constitute an Android release.

An Android build/release must be explicitly produced from the approved core version.

---

49. No Hidden API Polling

The clients must not introduce background polling that conflicts with the zero-request architecture.

In particular, an active exam must not generate periodic requests for:

- timer;
- answers;
- progress;
- exam state;
- result;
- heartbeat.

Any non-exam application polling must be justified by its owning contract.

---

50. Application Lifecycle

Client lifecycle events must not silently mutate authoritative exam state.

Examples:

- tab hidden;
- browser minimized;
- Android background;
- app resumed;
- screen rotation.

The client may update its local presentation/runtime state.

Authoritative attempt state remains governed by C5.

---

51. Visibility and Timer UX

The client may pause or adapt the display/update loop when the application is not visible.

This must not alter the server's authoritative timer.

When visibility resumes, the displayed remaining time must be reconciled with the server-defined expiration model.

---

52. Navigation During Exam

The client may provide navigation controls appropriate to the approved exam UX.

Navigation must not:

- create API synchronization;
- alter snapshot contents;
- alter marks;
- alter grading;
- create another attempt.

Exact navigation UX remains a product decision.

---

53. State Separation

The client should keep distinct conceptual state for:

1. authentication;
2. application/UI state;
3. active exam state;
4. submitted result state.

An exam answer must not accidentally become an authoritative user/result record before FINISH.

---

54. Client-Side Validation

Client-side validation is allowed for:

- usability;
- immediate feedback;
- preventing obviously malformed input;
- reducing accidental invalid submissions.

It is not authoritative.

The server repeats all security- and grading-relevant validation.

---

55. Performance

The clients should minimize unnecessary:

- API calls;
- rendering work;
- storage writes;
- large asset transfers.

Exam operation should favor local state after START.

---

56. Accessibility

Web and Mobile interfaces should support accessible interaction appropriate to the platform, including:

- readable text;
- meaningful labels;
- keyboard/accessibility navigation where applicable;
- appropriate focus management;
- usable touch targets.

Accessibility implementation must not alter question semantics or grading rules.

---

57. Testing Boundary

Client tests should verify:

- rendering;
- local state;
- recovery;
- API integration;
- platform adapters;
- responsive behavior;
- accessibility;
- error presentation.

They must not become the authoritative test suite for:

- question selection;
- server grading;
- Full-Cycle Exclusion;
- final result calculation.

Those behaviors are owned and tested by the engine/server layers.

---

58. Web/Mobile Behavioral Parity

For the same account, subject, exam configuration, and server snapshot:

«Web and Android must produce equivalent exam semantics.»

Differences may exist in:

- presentation;
- navigation affordances;
- native integrations;
- device capabilities.

Differences must not exist in:

- question identity;
- selected exam snapshot;
- answer schema;
- server grading;
- result semantics;
- timer authority;
- attempt lifecycle.

---

59. Cross-Contract Ownership

Concern| Owner
Product architecture| C1
Question definitions| C2
Question schemas| C2
Database| C3
API transport/DTOs| C4
Exam lifecycle/engine| C5
Web/Mobile client architecture| C6
Authentication/security| C7
Admin authorization matrix| Reserved/C7
Implementation sequence| C8
Gemini execution rules| C9

---

60. Non-Negotiable Rules

1. Web and Mobile use the same backend.
2. Web and Mobile use the same database.
3. Web and Mobile use the same question contracts.
4. Web and Mobile use the same exam engine.
5. Mobile is React + Vite + Capacitor, not React Native.
6. No platform may implement a separate exam engine.
7. The complete exam snapshot is obtained at START.
8. Normal exam execution uses zero API requests before FINISH.
9. Answers are maintained locally during the active exam.
10. FINISH is the authoritative submission boundary.
11. Server results are authoritative.
12. Client-calculated marks/correctness are never authoritative.
13. Simulator timing is server-authoritative.
14. Training has no authoritative timer.
15. Recovery uses local state first.
16. "GET /api/exam/active" is recovery, not polling.
17. No answer synchronization or heartbeat is permitted.
18. Connectivity loss does not trigger answer synchronization.
19. Question rendering consumes C2 definitions.
20. C6 does not redefine question types.
21. Exact question UX/input/correction remains reserved.
22. Camera is optional UX only and is not proctoring.
23. No client secrets or privileged credentials.
24. Client visibility is never authorization.
25. Web and Android must remain semantically equivalent.
26. Platform-specific capabilities must remain behind explicit boundaries.
27. Android core consumption must use an explicit/pinned version.
28. Production Web deployment and Android release are separate delivery events.

---

61. Acceptance Criteria

C6 is accepted only when:

- Web and Android share the same backend and domain;
- Android uses React + Vite + Capacitor;
- no duplicate exam engine exists;
- no duplicate grading implementation becomes authoritative;
- the complete START snapshot is consumed correctly;
- active exam operation produces zero normal API requests;
- local exam recovery works;
- FINISH is the only normal submission boundary;
- server result remains authoritative;
- Simulator timing remains server-authoritative;
- Training remains non-timed;
- question rendering consumes C2 contracts;
- unsupported question types fail safely;
- API DTOs remain isolated from DB/server internals;
- platform-specific behavior is isolated;
- camera remains UX-only;
- no proctoring/anti-cheat behavior is introduced;
- Web/Mobile semantic parity is preserved;
- Android core versioning is explicit;
- no client secrets are introduced;
- no Admin permission policy is invented by C6;
- reserved UX decisions remain reserved.

---

62. Final Rule

C6 defines:

«How Web and Mobile consume and present the shared platform.»

C6 does not define:

«What a question is, how the database works, how HTTP contracts are structured, how the exam engine selects/grades questions, or who is authorized to perform privileged actions.»

Therefore:

«One Domain → One Engine → One API → Multiple Clients → No Divergent Business Logic.»

End of Contract 6 — v1.1.0
