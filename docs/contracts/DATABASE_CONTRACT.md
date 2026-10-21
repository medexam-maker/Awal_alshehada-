# DATABASE_CONTRACT.md

Contract: 3 — Database & Persistence
Version: 1.1.0
Status: Approved Architectural Contract
Depends On: PROJECT_CONSTITUTION.md v1.1.0, QUESTION_TYPES_CONTRACT.md v1.1.0
Normative Owner: This contract is the sole normative owner of database structure and persistence rules.

---

0. Purpose

This contract defines the PostgreSQL database structure and persistence model for the platform.

It owns:

- Tables.
- Columns.
- Data types.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Indexes.
- Persistence relationships.
- Migration structure.
- Database-level deletion behavior.
- Database representation of domain state.

It does not own:

- Question-type semantics.
- Exam selection algorithms.
- Exam lifecycle semantics.
- Grading algorithms.
- API request/response contracts.
- Authentication semantics.
- Authorization policy.
- Web/Mobile behavior.

Those concerns belong to their respective contracts.

---

1. Database Authority

PostgreSQL is the system of record for persistent application data.

The database schema is defined by migrations.

The application must not maintain a separate undocumented database model.

ORMs are not used.

The backend uses the PostgreSQL "pg" driver and explicit SQL.

---

2. Migration-First Policy

All schema changes must be introduced through versioned migrations.

Required properties:

- deterministic ordering;
- explicit migration filenames;
- reviewable SQL;
- forward migration;
- rollback consideration where practical;
- no destructive production migration without explicit approval.

Current migration sequence:

001_initial_schema.sql
002_add_training_sets.sql
003_add_exam_attempts.sql
004_add_media_assets.sql

Future changes must use the next migration number.

Schema changes must not be performed by modifying historical migrations after they have been applied to a shared/production environment.

---

3. General Naming Rules

Database identifiers use:

- "snake_case";
- singular or plural naming consistently with the existing schema;
- UUID primary keys for application entities;
- explicit foreign keys;
- explicit timestamps.

Application TypeScript naming is separate from SQL naming.

Database naming must not redefine domain terminology established by C1/C2.

---

4. UUID Policy

Application entities use UUID primary keys.

Foreign keys referencing those entities use UUID.

IDs are generated securely by the database/application according to the approved implementation.

Clients must not be trusted to define ownership relationships.

---

5. Timestamp Policy

Persistent timestamps use PostgreSQL timestamp types appropriate for timezone-aware application data.

The application/API layer serializes them according to C4.

The database remains responsible for persistence, not API formatting.

Typical lifecycle timestamps include:

- "created_at";
- "updated_at";
- "started_at";
- "submitted_at";
- "expires_at";
- "seen_at";
- "graded_at".

---

6. Users

Table:

users

Purpose:

Stores application accounts.

Core fields:

id UUID PRIMARY KEY
email
google_id
phone
password_hash
full_name
role
status
created_at
updated_at

Constraints:

- "email" is unique;
- "google_id" is unique when present;
- "password_hash" must never contain plaintext passwords;
- role values are constrained to the supported application roles;
- status values are constrained to supported account states.

Current roles:

student
content_partner
admin

Current statuses:

active
suspended
disabled

The database stores role and status.

Authorization meaning and permission rules are owned by C7.

A role column must not be interpreted as an authorization policy by itself.

---

7. Subjects

Table:

subjects

Purpose:

Stores the platform's subject taxonomy.

Core fields:

id UUID PRIMARY KEY
name_ar
name_en
slug
is_active
display_order
created_at
updated_at

Constraints:

- "slug" unique;
- subject identity stable;
- inactive subjects remain available for historical references unless explicitly migrated.

The current platform uses a flat subject model.

Specialty/council hierarchy is not part of the current database contract.

---

8. Question Bank

Table:

question_bank

Purpose:

Stores canonical questions.

Core fields:

id UUID PRIMARY KEY
subject_id UUID NOT NULL
question_type
content JSONB NOT NULL
correct_answer JSONB NOT NULL
primary_interaction_mode
secondary_interaction_mode
marks
bank_type
status
difficulty
explanation
created_by UUID
created_at
updated_at

Foreign keys:

subject_id → subjects.id
created_by → users.id

---

9. Question Type Storage

"question_type" stores the canonical question-type identifier defined by C2.

Examples:

true_false
fill_blank
multiple_choice
matching
...
reading_comprehension

The database does not redefine the meaning of these types.

The canonical type definition remains C2.

An unknown or unsupported question type must not be silently accepted into production question data.

---

10. Question Content

"content" is stored as "JSONB".

Its structure is governed by C2.

The database does not define the internal semantic schema of each question type.

However:

- JSON must be valid;
- application validation is required before persistence;
- production data must conform to the corresponding C2 schema.

The database must not be treated as permission to store arbitrary JSON.

---

11. Correct Answer

"correct_answer" is stored separately as "JSONB".

It represents the canonical grading key.

Its semantic structure is governed by C2 and grading behavior by C5.

Important rule:

«"correct_answer" is the authoritative grading representation.»

Answer-bearing instructional metadata may exist inside "content", where permitted by C2, but this does not create a second grading authority.

---

12. Question Content and Simulator Protection

The database may contain answer-bearing data required for:

- grading;
- instructional behavior;
- question construction.

This is acceptable because the database is trusted server-side storage.

The database contract does not determine which fields are exposed to a client.

Before Simulator data reaches the client:

- "correct_answer" must be excluded;
- nested grading keys inside "content" must also be sanitized when applicable.

API representation is owned by C4.

Snapshot/runtime behavior is owned by C5.

Security enforcement is owned by C7.

---

13. Interaction Mode Storage

The question table may persist:

primary_interaction_mode
secondary_interaction_mode

These values reference the capabilities defined by C2.

The database stores the configured values.

It does not decide:

- which mode wins;
- which mode is forced;
- how an exam resolves modes;
- how the UI renders the mode.

Those decisions belong to C5 and C6 respectively.

---

14. Question Marks

"marks" stores the canonical question mark value.

Exam attempts store their own effective marks where required.

This allows an attempt snapshot to preserve historical scoring configuration even if the source question is later edited.

The grading engine owns the meaning of marks during grading.

---

15. Question Bank Type

Questions have:

bank_type

Supported values:

comprehensive
training

"bank_type" is distinct from "exam_mode".

- "bank_type" identifies the question source/selection population.
- "exam_mode" identifies the exam experience.

This distinction is defined architecturally by C1 and applied by C5.

The database stores both where required by the relevant entity.

---

16. Question Status

Supported question statuses:

draft
approved
archived

Lifecycle:

draft → approved → archived

Archived questions remain historically significant where referenced by existing attempts.

Question selection rules are owned by C5.

The database stores lifecycle state.

---

17. Difficulty

"difficulty" is constrained to the supported range:

1..5

Difficulty is metadata.

It must not silently become an exam-selection algorithm.

Selection behavior belongs to C5.

---

18. Training Exam Sets

Table:

training_exam_sets

Purpose:

Stores deterministic/predefined training sets.

Core fields:

id UUID PRIMARY KEY
subject_id UUID NOT NULL
name
description
category
exam_year
status
created_by UUID
created_at
updated_at

Constraints:

General set

category = general
exam_year IS NULL

Year set

category = year
exam_year IS NOT NULL

Foreign keys:

subject_id → subjects.id
created_by → users.id

Training-set selection semantics are owned by C5.

---

19. Training Set Questions

Table:

training_set_questions

Core fields:

training_set_id UUID NOT NULL
question_id UUID NOT NULL
position
marks_override
created_at
updated_at

Constraints:

- unique "(training_set_id, question_id)";
- unique "(training_set_id, position)".

Foreign keys:

training_set_id → training_exam_sets.id
question_id → question_bank.id

"position" determines deterministic ordering within a training set.

The database stores the relationship.

C5 defines how a Training exam consumes it.

---

20. Exam Attempts

Table:

exam_attempts

Purpose:

Stores the persistent lifecycle state of an exam attempt.

Core fields:

id UUID PRIMARY KEY
user_id UUID NOT NULL
subject_id UUID NOT NULL
bank_type
training_set_id
exam_mode
status
started_at
submitted_at
expires_at
total_marks
obtained_marks

Foreign keys:

user_id → users.id
subject_id → subjects.id
training_set_id → training_exam_sets.id

---

21. Exam Attempt Constraints

Supported:

bank_type:
  comprehensive
  training

exam_mode:
  training
  simulator

status:
  active
  submitted
  expired
  cancelled

Constraint:

training bank → training_set_id required
comprehensive bank → training_set_id NULL

The database enforces the structural relationship.

C5 owns the semantic selection/lifecycle rules.

---

22. Attempt Timing Fields

"started_at" records server-side attempt start time.

"expires_at" records the server-side expiration boundary when the attempt is timed.

For Training:

expires_at = NULL

For Simulator:

expires_at = required

The database stores the values.

C5 owns timer semantics.

C4 owns API representation.

The client must never be the authoritative source of expiration.

---

23. Attempt Results

"total_marks" and "obtained_marks" are persistent result fields.

They preserve the final state of the attempt.

The grading algorithm is owned by C5.

The database must not implement application-level grading algorithms through SQL triggers or duplicated logic.

---

24. Active Attempt Uniqueness

The architecture permits only one active attempt for a user and subject.

This applies regardless of "bank_type".

Conceptually:

one active attempt
per user + subject

This is a deliberate product/engine constraint.

The database should enforce this at the persistence level where practical, while C5 defines the lifecycle behavior when an active attempt already exists.

---

25. Exam Question Snapshot

Table:

exam_attempt_questions

Purpose:

Stores the immutable question state used by an attempt.

Core fields:

id UUID PRIMARY KEY
attempt_id UUID NOT NULL
question_id UUID NOT NULL
position
marks
question_snapshot JSONB NOT NULL

Constraints:

- unique "(attempt_id, question_id)";
- unique "(attempt_id, position)".

Foreign keys:

attempt_id → exam_attempts.id
question_id → question_bank.id

---

26. Snapshot Ownership Boundary

The meaning and required contents of the exam snapshot are owned by C5.

This contract owns:

- the persistence location;
- the JSONB storage mechanism;
- relational references;
- immutability at the application level;
- historical preservation.

The snapshot must preserve enough information to reproduce the attempt independently of later edits to the source question.

At minimum, the persisted snapshot must support the attempt's required:

- question content;
- question type;
- interaction configuration;
- effective marks;
- position;
- other immutable runtime information required by C5.

Simulator sanitization remains mandatory before client exposure.

---

27. Snapshot Immutability

Once an attempt begins, its question snapshot must not be silently replaced by the current question-bank version.

Source questions may later be:

- edited;
- archived;
- corrected;
- otherwise changed.

The historical attempt must remain reproducible.

The snapshot is therefore the authoritative question representation for that attempt.

---

28. Exam Answers

Table:

exam_answers

Core fields:

id UUID PRIMARY KEY
attempt_id UUID NOT NULL
attempt_question_id UUID NOT NULL
answer JSONB
grading_status
obtained_marks
grader_type
graded_at
created_at
updated_at

Foreign keys reference the corresponding attempt and attempt-question records.

Constraint:

unique per attempt/question

The submitted answer is untrusted client input until validated and graded by the server.

---

29. Grading Status

Supported persistence values:

pending
auto_graded
manual_pending
manually_graded
mixed

These values represent persisted grading state.

Their semantic lifecycle and transitions are owned by C5.

The database stores the state and does not independently define grading workflows.

---

30. Grader Type

Supported values:

system
teacher
admin
ai

"ai" is a future extension and must not imply that AI grading is required for the current implementation.

The database allows the state required by the approved grading architecture.

C5 owns grading semantics.

C7 owns authorization around who may perform privileged grading actions.

---

31. Obtained Marks

"obtained_marks" stores the server-determined marks for the answer.

It must not be accepted as authoritative client input.

The client may submit an answer.

The server calculates the result.

The database stores the resulting value.

---

32. Exam Question History

Table:

exam_question_history

Purpose:

Tracks which questions a user has encountered for Full-Cycle Exclusion.

Core fields:

id UUID PRIMARY KEY
user_id UUID NOT NULL
question_id UUID NOT NULL
attempt_id UUID NOT NULL
seen_at

Foreign keys:

user_id → users.id
question_id → question_bank.id
attempt_id → exam_attempts.id

This table stores history.

The Full-Cycle algorithm is exclusively owned by C5.

---

33. Full-Cycle Data Boundary

The database stores the facts required by the Full-Cycle algorithm.

It does not define:

- what constitutes a cycle;
- when a cycle starts;
- when a cycle resets;
- which questions are eligible;
- how random selection occurs.

Those are C5 rules.

The database must retain sufficient history for C5 to implement them reliably.

---

34. Media Assets

Table:

media_assets

Purpose:

Stores metadata for uploaded media.

Core fields:

id UUID PRIMARY KEY
owner_id UUID
storage_key UNIQUE
file_name
mime
size
status
created_at

The database stores metadata.

Actual binary storage is handled by the approved storage layer.

The Security Contract owns upload/access security.

Question Types Contract owns the semantic need for media.

Web/Mobile owns client presentation/access integration.

---

35. Audit Logs

Table:

audit_logs

Core fields:

id UUID PRIMARY KEY
actor_id UUID
action
entity_type
entity_id
metadata JSONB
created_at

Purpose:

Stores security/business audit events where required.

"metadata" must contain structured JSON.

Secrets, passwords, tokens, or other sensitive authentication material must not be logged.

Security/logging policy is owned by C7.

---

36. Subscription Data

Subscription persistence is not part of the current Phase 1 database contract.

No subscription table is required by this version.

No exam-engine implementation may introduce a subscription dependency unless the contract set is explicitly revised.

Future monetization/subscription work requires an explicit contract change.

---

37. Deletion Policy

Historical exam data must not be destroyed merely because a source question is deleted or archived.

Relevant foreign keys use restrictive behavior where historical integrity requires it.

In particular:

question_bank
    ↓ RESTRICT
exam_attempt_questions

question_bank
    ↓ RESTRICT
training_set_questions

question_bank
    ↓ RESTRICT
exam_question_history

Exam answers may be deleted with their owning attempt-question record where the approved lifecycle permits it.

Attempt references to training sets may use:

ON DELETE SET NULL

where defined by the migration.

Deletion policy must preserve historical exam integrity.

---

38. Referential Integrity

Foreign keys are mandatory for persistent relationships.

Application code must not rely solely on convention when a database constraint can enforce integrity.

The database should reject:

- references to nonexistent entities;
- invalid required relationships;
- duplicate relationship records;
- structurally invalid state combinations.

---

39. Indexing

Indexes must support the actual query paths.

Required indexes include appropriate indexes for:

- user lookup;
- subject lookup;
- question type;
- bank type;
- question status;
- training-set membership;
- attempt ownership;
- active attempts;
- attempt-question lookup;
- answer lookup;
- history lookup;
- timestamps where operationally useful.

GIN indexes may be used for JSONB fields where justified by actual query requirements.

Indexes must not be added merely because a field is JSONB.

---

40. JSONB Policy

JSONB is permitted where question structures or flexible metadata require it.

JSONB must always have an explicit application-level schema.

Permitted major uses include:

question_bank.content
question_bank.correct_answer
exam_attempt_questions.question_snapshot
exam_answers.answer
audit_logs.metadata

JSONB does not mean untyped data.

Production code must validate JSONB before trusting it.

No "any"-based JSON handling is permitted.

Use explicit TypeScript types, "unknown", schema validation, and type guards where appropriate.

---

41. No Duplicate Domain Authority

The database must not become a second source of truth for rules owned by C2 or C5.

Examples:

- C2 owns what "matching" means.
- C5 owns how matching is graded.
- C3 stores the matching question data.
- C2 owns question-type schema.
- C3 stores JSONB conforming to that schema.
- C5 owns Full-Cycle behavior.
- C3 stores history required by that behavior.

Database constraints may enforce structural invariants but must not silently redefine domain semantics.

---

42. Database vs Application Validation

Database constraints are responsible for:

- structural integrity;
- uniqueness;
- required relationships;
- supported enum/state values where appropriate;
- basic numeric constraints.

Application/schema validation is responsible for:

- question-type content schemas;
- answer schemas;
- complex JSONB validation;
- domain-specific grading input validation.

C5 remains responsible for exam-domain validation during the exam lifecycle.

---

43. Security Boundary

Database persistence must support C7's security requirements.

The database layer must:

- use parameterized SQL;
- never construct SQL through unsafe string interpolation;
- avoid exposing database credentials to clients;
- preserve ownership relationships;
- protect sensitive account fields.

RLS may be used where appropriate.

Backend authorization remains the primary authorization boundary unless explicitly changed by contract.

---

44. Authentication Data

The database stores authentication-related data such as:

- email;
- password hash;
- Google identity reference;
- account status.

It does not define:

- JWT behavior;
- refresh-token policy;
- password hashing algorithm;
- authorization permissions.

Those are owned by C7.

---

45. Historical Integrity

The database must preserve the ability to reconstruct a submitted attempt.

This means historical attempts must not depend exclusively on mutable current question-bank data.

The combination of:

exam_attempts
+
exam_attempt_questions.question_snapshot
+
exam_answers

must preserve the required historical state.

C5 defines what constitutes a complete historical exam state.

---

46. Transactional Integrity

Operations that modify multiple related exam records must use database transactions where atomicity is required.

Examples include:

- creating an attempt and its question records;
- finalizing an attempt;
- persisting grading results;
- state transitions that must be atomic.

The database transaction provides atomic persistence.

C5 defines the business operation.

---

47. Concurrent Finalization

Concurrent finish requests must not produce conflicting final states.

Persistence must support C5's locking strategy.

For finalization, the engine may use row-level locking such as:

SELECT ... FOR UPDATE

The database contract provides transactional/locking capability.

C5 owns when and why the lock is required.

---

48. Database Environment

Database credentials must never be committed to source control.

Connection configuration belongs to server-side environment configuration.

Clients must never receive:

- database URLs;
- database passwords;
- service-role secrets;
- unrestricted database credentials.

Security ownership remains with C7.

---

49. Current Core Tables

The current Phase 1 database contract contains:

users
subjects
question_bank
training_exam_sets
training_set_questions
exam_attempts
exam_attempt_questions
exam_answers
exam_question_history
media_assets
audit_logs

Subscription persistence is excluded from the current Phase 1 schema.

---

50. Contract Boundaries

Concern| Owner
Database structure| C3
Migration sequence| C3
Question type semantics| C2
Question JSON schemas| C2
Exam selection| C5
Exam lifecycle| C5
Snapshot semantics| C5
Grading algorithm| C5
API DTOs| C4
Authentication| C7
Authorization| C7
Security controls| C7
Web/Mobile rendering| C6
Implementation sequence| C8
Gemini execution| C9

---

51. Non-Negotiable Rules

1. PostgreSQL is the persistent system of record.
2. Schema changes are migration-first.
3. No ORM is used.
4. SQL must be parameterized.
5. UUIDs are used for application entity IDs.
6. JSONB must have explicit application schemas.
7. No production "any".
8. "correct_answer" is stored separately from "content".
9. "correct_answer" remains the canonical grading key.
10. "content" must not become an independent grading authority.
11. Attempt snapshots preserve historical exam state.
12. Historical attempts must not depend solely on mutable question-bank records.
13. Exam answers are untrusted until server validation/grading.
14. Subscription persistence is excluded from Phase 1.
15. Database structure must not redefine C2 question semantics.
16. Database structure must not redefine C5 engine behavior.
17. Roles stored in the database do not independently define permissions.
18. Destructive production changes require explicit approval.
19. Foreign-key integrity must be preserved.
20. Multi-record exam operations requiring atomicity must use transactions.

---

52. Acceptance Criteria

C3 is accepted only when:

- all required tables exist through migrations;
- all required relationships have explicit foreign keys;
- structural constraints are enforced;
- question data conforms to C2 schemas;
- "correct_answer" is stored separately;
- attempt snapshots are persisted;
- historical integrity is preserved;
- exam answers cannot become client-authoritative results;
- Full-Cycle history is persistable without embedding the algorithm in the database;
- no subscription dependency exists in Phase 1;
- no ORM is introduced;
- no production "any" is introduced;
- no database rule duplicates or overrides C2/C5 semantics;
- security-sensitive fields remain server-side.

---

53. Final Rule

The Database Contract defines:

«How persistent data is stored and related.»

It does not define:

«What a question means, how an exam behaves, how a question is graded, how an API communicates, or who is authorized to perform an action.»

Therefore:

«One persistent structure → One canonical schema → One normative owner → Explicit references across the architecture.»

End of Contract 3 — v1.1.0
