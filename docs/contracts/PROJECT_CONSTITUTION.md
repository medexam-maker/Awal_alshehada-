# PROJECT CONSTITUTION

Sudan Secondary Certificate Exam-Prep Platform

Contract 1 — Master Architectural Contract

Version: 1.1.0
Status: Architectural Foundation

---

0. PURPOSE AND AUTHORITY

This document is the highest-level architectural contract of the platform.

It defines:

- product scope and boundaries;
- architectural principles;
- system-wide invariants;
- contract ownership;
- authority and dependency rules;
- cross-contract consistency requirements;
- change-control principles.

It MUST NOT duplicate detailed rules owned by specialized contracts.

If a rule is defined normatively in another contract, that contract is the authoritative source for that rule.

---

1. PRODUCT IDENTITY

The platform is an educational and training platform for Sudan Secondary Certificate exam preparation.

It is NOT an official examination authority and is NOT an examination-security or anti-cheating platform.

The product consists of:

- Web application;
- Mobile application;
- Shared backend;
- Shared database;
- Shared authentication;
- Shared question domain;
- Shared exam engine;
- Shared grading rules;
- Shared educational content;
- Shared users and results;
- Shared media/storage services.

Web and Mobile are two clients of the same product, not two independent products.

---

2. CORE ARCHITECTURAL PRINCIPLES

2.1 Single Source of Truth

Every normative rule MUST have exactly one authoritative owner.

Other contracts may:

- reference it;
- apply it;
- specialize it within their declared scope.

They MUST NOT redefine it.

2.2 Shared Domain

Business/domain rules MUST remain shared wherever Web and Mobile require identical behavior.

Client-specific presentation MUST NOT redefine domain rules.

2.3 Server Authority

The server is authoritative for:

- persisted business state;
- authorization;
- exam lifecycle;
- official grading;
- final results;
- ownership;
- database mutations.

Client state is never the final authority for persisted business results.

2.4 Historical Integrity

A submitted attempt MUST remain reproducible according to the rules and question data applicable when that attempt was created.

Later question/content changes MUST NOT silently change historical attempts.

2.5 Strict Typing

TypeScript strictness is mandatory.

"any" MUST NOT be used in production domain, API, validation, grading, or shared contracts unless an explicit architectural exception is documented and approved.

Prefer "unknown" with explicit validation/type guards.

2.6 Secure by Default

Security protects:

- the application;
- APIs;
- user accounts;
- administrator accounts;
- authorization boundaries;
- payment systems;
- data;
- storage;
- secrets;
- infrastructure.

Security MUST NOT introduce an unnecessary examination-surveillance system.

---

3. PRODUCT EXAM MODEL

The platform provides two distinct examination experiences.

3.1 Training Exam

The Training Exam is educational.

It is:

- non-proctored;
- non-timed;
- intended for learning;
- capable of immediate feedback;
- capable of multi-step instructional interaction;
- capable of selecting answers instead of requiring free-text input where appropriate.

Training may expose sufficient instructional information to support immediate educational feedback.

The exact UI, interaction, answer-entry, and correction behavior for each question type is owned by the Question Types Contract and its reserved product decisions.

3.2 Simulator Exam

The Simulator is an optional training experience designed to reproduce the atmosphere of a formal examination.

It is:

- timed;
- exam-like;
- optional;
- not an official examination;
- not a real proctoring system;
- not an anti-cheating system.

A camera may be used only as a simulation/UX feature.

Camera behavior MUST NOT include:

- video recording;
- video upload;
- server-side video storage;
- behavioral surveillance;
- cheating detection;
- automated proctoring.

The Simulator MUST NOT be designed around preventing students from cheating.

Its purpose is to simulate examination conditions, not to provide examination security.

---

4. EXAM MODE VS QUESTION BANK

The following concepts MUST remain separate:

"bank_type"

Defines the source/selection behavior of questions.

Supported conceptual values:

- "comprehensive"
- "training"

"exam_mode"

Defines how the student experiences the selected questions.

Supported conceptual values:

- "training"
- "simulator"

"bank_type" and "exam_mode" MUST NOT be treated as interchangeable concepts.

Their detailed data representation is owned by the Database Contract and their runtime behavior by the Exam Engine Contract.

---

5. QUESTION DOMAIN

The platform supports a registry-based question domain.

Question types are defined centrally and MUST NOT be scattered through unrelated code.

The Question Types Contract is the sole normative owner of:

- question-type identity;
- canonical type schemas;
- type-specific content structures;
- answer structures;
- supported interaction modes;
- type-specific validation;
- type-specific grading classification;
- type-specific media requirements;
- type-specific renderer mapping rules where applicable.

The exact student-facing UI, answer-entry method, and correction experience for each question type remains a reserved product decision.

A new question type MUST be introduced through the question-type contract/registry rather than by scattered special cases.

---

6. CONTRACT RESPONSIBILITY AND OWNERSHIP MATRIX

Contract| Sole Normative Responsibility
C1 — PROJECT_CONSTITUTION| Product scope, architecture, boundaries, principles, ownership, authority
C2 — QUESTION_TYPES_CONTRACT| Question-type domain definitions and type-specific contracts
C3 — DATABASE_CONTRACT| Database schema, constraints, indexes, migrations and persistence model
C4 — API_CONTRACT| HTTP/API endpoints, request/response contracts and API-level behavior
C5 — EXAM_ENGINE_CONTRACT| Exam lifecycle, selection, attempts, timing, snapshot behavior and grading engine
C6 — WEB_MOBILE_CONTRACT| Client architecture, Web/Mobile boundary and platform-specific integration
C7 — SECURITY_CONTRACT| Application, account, API, payment, authorization and security controls
C8 — IMPLEMENTATION_PLAN| Implementation phases, sequencing, deliverables and completion criteria
C9 — GEMINI_EXECUTION_PROTOCOL| AI execution rules, file boundaries, verification and change governance

This matrix is normative.

A contract MUST NOT become a second source of truth for a responsibility owned by another contract.

---

7. AUTHORITY MODEL

When contracts overlap, authority follows ownership, not document length.

C1 owns architectural principles and boundaries.

Specialized contracts own the detailed rules inside their declared domains.

Therefore:

- C1 defines what architectural boundary must exist.
- The specialized contract defines the detailed behavior inside that boundary.

A specialized contract MUST NOT silently override C1.

If a specialized requirement conflicts with C1, the conflict MUST be resolved by changing the authoritative contract rather than creating an undocumented exception.

---

8. CROSS-CONTRACT REVIEW GATE

Contracts MUST be reviewed sequentially.

Before Contract N is approved:

1. Contract N MUST be reviewed against every preceding contract relevant to its scope.
2. Existing normative rules MUST be identified.
3. Duplicate normative definitions MUST be identified.
4. Contradictions MUST be identified.
5. Ownership MUST be assigned for every new rule.
6. Dependencies MUST be identified.
7. Rules without an authoritative owner MUST be flagged.
8. The new contract MUST NOT be approved while an unresolved architectural contradiction remains.

Required review chain:

C1
↓
C1 + C2
↓
C1 + C2 + C3
↓
C1 + C2 + C3 + C4
↓
...
↓
C1 ... C9

This is a mandatory architectural gate.

---

9. NORMATIVE DEFINITION RULE

A rule has one normative definition.

Later contracts MAY use a rule by reference.

Preferred pattern:

«Defined by C1 §X; this contract only specifies its implementation within its scope.»

Not permitted:

«Repeating the same rule with slightly different wording in multiple contracts.»

If two contracts appear to define the same behavior, the review MUST determine:

- which contract owns it;
- whether the other definition should become a reference;
- whether the rule actually contains two different responsibilities.

---

10. DOMAIN / PERSISTENCE / TRANSPORT / CLIENT SEPARATION

The architecture MUST distinguish:

Domain

What the system means and how business behavior works.

Persistence

How domain state is stored.

API

How clients communicate with the server.

Client

How users interact with the system.

A database schema MUST NOT become the normative owner of business behavior merely because it stores the relevant data.

An API endpoint MUST NOT redefine domain behavior merely because it exposes it.

A UI MUST NOT become authoritative for server-side business rules.

---

11. EXAM LIFECYCLE PRINCIPLE

The exam lifecycle follows:

START
  ↓
FULL SNAPSHOT
  ↓
LOCAL EXAM EXPERIENCE
  ↓
FINISH
  ↓
SERVER PROCESSING
  ↓
RESULT

During an active exam, normal question answering/navigation MUST NOT require continuous server requests.

The exact lifecycle, snapshot, selection, timer, answer validation, grading, and result rules are owned by C5 and exposed through C4.

---

12. LOCAL EXAM STATE

The client MAY maintain local exam state for:

- answers;
- navigation;
- timer display;
- educational interaction;
- recovery.

Local state MUST NOT become authoritative for:

- final grading;
- final result;
- persisted attempt status.

The detailed persistence mechanism is owned by C6/C5 as applicable.

---

13. COMPREHENSIVE BANK

The Comprehensive Bank uses a full-cycle exclusion model.

The architectural requirement is:

«Previously seen comprehensive questions MUST be excluded according to the defined cycle rules before normal random selection.»

The exact algorithm, cycle identity, reset behavior, concurrency handling, and history registration are owned exclusively by C5.

C1 does not redefine the algorithm.

---

14. TRAINING BANK

The Training Bank supports deterministic/predefined educational sets.

Training sets MAY define:

- membership;
- ordering;
- educational grouping.

The exact schema is owned by C3.

The exact selection/runtime behavior is owned by C5.

---

15. SNAPSHOT AND HISTORICAL INTEGRITY

An exam attempt MUST use an immutable snapshot sufficient to preserve the historical examination state.

At minimum, historical reproduction MUST NOT depend on later mutable question content.

C3 owns the persistence structure.

C5 owns:

- when the snapshot is created;
- what runtime data must be frozen;
- how it is used during grading and result retrieval.

No later content edit may silently rewrite the meaning of an existing submitted attempt.

---

16. GRADING ARCHITECTURE

The platform supports different grading strategies according to question type.

Conceptually:

- automatic grading;
- manual grading;
- mixed grading;
- future AI-assisted grading.

AI-assisted grading is not required for the foundation and MUST NOT be treated as a dependency for current functionality.

Question-type grading classification belongs to C2.

Exam-wide grading pipeline and execution behavior belong to C5.

API exposure belongs to C4.

---

17. AUTHENTICATION AND AUTHORIZATION

Authentication and authorization are platform-level security concerns.

The server MUST enforce authorization.

Client-side visibility or UI restrictions MUST NOT be considered authorization.

Detailed authentication, authorization, RBAC, payment protection, administrator security, secrets, rate limiting and application-security controls are owned by C7.

Administrator permission details are a reserved product decision and MUST be explicitly resolved before finalizing the Admin Authorization Matrix.

---

18. SECURITY SCOPE

Security is intentionally limited to the risks relevant to this product.

In scope

- application security;
- API security;
- authentication;
- account protection;
- authorization;
- Admin/RBAC protection;
- payment security;
- database protection;
- storage protection;
- secret management;
- input validation;
- abuse/rate limiting;
- auditability of sensitive administrative actions;
- secure deployment.

Out of scope

- anti-cheating systems;
- real examination proctoring;
- cheating detection;
- behavioral surveillance;
- examination video recording;
- examination video storage;
- examination video analysis.

The Simulator camera, when used, is a UX simulation feature and not a security subsystem.

---

19. MEDIA AND STORAGE

Media may be used by educational questions and other platform features.

Storage references MUST remain stable enough to preserve historical content where required.

Replacing or deleting a current media asset MUST NOT silently break historical attempts that depend on it.

Detailed media schema and persistence rules belong to C3.

API upload/access behavior belongs to C4.

Client handling belongs to C6.

Security controls belong to C7.

---

20. WEB / MOBILE BOUNDARY

Web and Mobile share the same:

- backend;
- database;
- authentication;
- question domain;
- question contracts;
- exam engine;
- grading rules;
- API contracts;
- user/result model.

They may differ in:

- presentation;
- navigation;
- platform APIs;
- local persistence implementation;
- camera/device integration.

Neither client may create an alternative business rule.

Detailed client architecture is owned by C6.

---

21. DATABASE AND MIGRATION PRINCIPLE

The database is the persistence source of truth.

Database changes are migration-first.

Production schema changes MUST:

- use controlled migrations;
- preserve historical integrity;
- define affected constraints/indexes/relations;
- avoid destructive changes without explicit approval.

Detailed database rules are owned exclusively by C3.

---

22. API PRINCIPLE

The API is the formal transport boundary between clients and the backend.

API contracts MUST be explicit, typed and version-consistent.

The API MUST expose domain behavior rather than creating a second business-logic model.

Detailed request/response schemas, endpoints, errors, authentication transport and rate limits belong to C4/C7 according to ownership.

---

23. CONTENT LIFECYCLE

Question/content data follows a controlled lifecycle.

Conceptually:

DRAFT → APPROVED → ARCHIVED

Archived content MUST NOT be silently reused where the domain rules prohibit it.

Detailed content structures and persistence belong to C2/C3 according to responsibility.

---

24. PAYMENT BOUNDARY

Payment is a platform/business-security concern.

Payment status MUST NOT be trusted solely from client input.

The server MUST remain authoritative for payment-related state.

Detailed payment implementation belongs to the appropriate API/security/business layer and MUST NOT be duplicated across contracts.

---

25. TESTING PHILOSOPHY

Testing MUST verify:

- contract compliance;
- shared-domain consistency;
- server authority;
- database constraints;
- API behavior;
- exam lifecycle;
- grading;
- security;
- Web/Mobile compatibility.

Tests MUST NOT become an alternative source of business rules.

Where a test encodes a domain rule, that rule MUST already have a normative owner.

---

26. IMPLEMENTATION GOVERNANCE

Implementation MUST follow the approved contracts.

Code MUST NOT be used to discover or redefine architecture that should already be specified by contracts.

The implementation sequence is owned by C8.

Execution restrictions for Gemini are owned by C9.

---

27. CHANGE CONTROL

A change to an authoritative rule MUST be made in its owning contract first.

Then all dependent contracts MUST be reviewed for impact.

No implementation should introduce undocumented behavior merely to resolve a contract inconsistency.

Required flow:

Identify change
→ identify owner
→ update authoritative contract
→ impact-review dependent contracts
→ update dependent references/details
→ implement
→ verify

---

28. RESERVED PRODUCT DECISIONS

The following areas are intentionally NOT finalized by architectural inference alone.

28.1 Question UX / Input / Correction

The product owner retains final authority over:

- how each question type is displayed;
- how each question type is answered;
- training interaction;
- simulator interaction;
- step-by-step educational interaction;
- immediate training feedback;
- type-specific answer-entry UX;
- type-specific correction presentation.

This applies to all current and future question types.

Architecture MUST support this flexibility without compromising server authority or creating duplicate domain definitions.

28.2 Admin Authorization Matrix

The product owner retains final authority over the exact permissions of administrator roles.

If an administrator permission appears unsafe, excessively broad, contradictory, or architecturally abnormal, it MUST be flagged rather than silently approved.

Until finalized, no implementation may invent additional Admin privileges.

---

29. OUT OF SCOPE FOR THE FOUNDATION

The foundation does not require:

- AI grading;
- advanced analytics;
- recommendation engines;
- unnecessary microservices;
- real exam proctoring;
- anti-cheating infrastructure;
- examination surveillance;
- native application rewrites without architectural justification;
- unnecessary third-party dependencies;
- a general-purpose offline synchronization system.

Local exam persistence required for reliable Training/Simulator operation is NOT considered a general offline synchronization system.

---

30. ARCHITECTURAL NON-NEGOTIABLES

The following are mandatory:

1. One product, Web + Mobile.
2. One shared backend/domain.
3. One normative owner per rule.
4. Later contracts MUST review all preceding contracts.
5. No silent cross-contract contradictions.
6. No duplicate normative definitions.
7. Server authority for persisted business results.
8. Immutable historical exam state.
9. Separate "bank_type" from "exam_mode".
10. Registry-based question architecture.
11. Training and Simulator remain distinct experiences.
12. Simulator camera is UX simulation only.
13. No real proctoring or anti-cheat system.
14. Security focuses on application, accounts, Admin, authorization, payment and data.
15. Database changes are migration-first.
16. API contracts are explicit.
17. Web/Mobile clients cannot redefine domain behavior.
18. AI grading remains future functionality.
19. Contracts precede implementation.
20. Gemini executes approved contracts and does not redefine architecture.

---

31. CONTRACT DEPENDENCY MAP

C1 PROJECT CONSTITUTION
        │
        ├── C2 QUESTION TYPES
        │       │
        │       └── C3 DATABASE
        │               │
        │               └── C4 API
        │                       │
        │                       └── C5 EXAM ENGINE
        │
        ├── C6 WEB / MOBILE
        │
        ├── C7 SECURITY
        │
        ├── C8 IMPLEMENTATION PLAN
        │
        └── C9 GEMINI EXECUTION PROTOCOL

This map represents responsibility/dependency relationships, not permission to duplicate rules.

---

32. REQUIRED REVIEW ORDER

The nine contracts MUST be reviewed in this order:

01 PROJECT_CONSTITUTION
02 QUESTION_TYPES_CONTRACT
03 DATABASE_CONTRACT
04 API_CONTRACT
05 EXAM_ENGINE_CONTRACT
06 WEB_MOBILE_CONTRACT
07 SECURITY_CONTRACT
08 IMPLEMENTATION_PLAN
09 GEMINI_EXECUTION_PROTOCOL

At each stage:

Previous Contracts
+
Current Contract
=
Consistency Gate

No implementation phase is authorized merely because a contract has passed review.

---

33. FINAL ARCHITECTURAL RULE

The platform shall prefer:

«One rule → one owner → one canonical definition → many references.»

Never:

«One rule → many contracts → slightly different interpretations.»

When a requirement is ambiguous, the ambiguity MUST be resolved at the appropriate ownership level before implementation.

Contracts define architecture.

Implementation realizes the contracts.

---

34. SIGN-OFF

This Constitution is the master architectural foundation.

All subsequent contracts MUST conform to it unless this Constitution is formally revised.

Any later contract that requires a change to a constitutional principle MUST identify the required amendment explicitly rather than silently overriding it.

End of Contract 1
