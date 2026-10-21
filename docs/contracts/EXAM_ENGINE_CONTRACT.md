# EXAM_ENGINE_CONTRACT.md

Contract: 5 — Exam Engine & Grading
Version: 1.1.0
Status: Approved Architectural Contract
Depends On: C1 PROJECT_CONSTITUTION.md v1.1.0, C2 QUESTION_TYPES_CONTRACT.md v1.1.0, C3 DATABASE_CONTRACT.md v1.1.0, C4 API_CONTRACT.md v1.1.0
Normative Owner: This contract is the sole normative owner of exam lifecycle, question selection, attempt execution, snapshot semantics, timing, and grading behavior.

---

0. Purpose

This contract defines the deterministic server-side behavior of the exam engine.

It owns:

- Exam lifecycle.
- Attempt creation and resumption.
- Question selection.
- Training-set consumption.
- Comprehensive Full-Cycle Exclusion.
- Snapshot semantics.
- Exam timing.
- Expiration.
- Finish/finalization.
- Server-side answer validation.
- Grading behavior.
- Partial-credit calculation.
- Result calculation.
- Recovery behavior.
- Concurrent attempt handling.

It does not own:

- Question-type definitions.
- Database schema.
- API transport.
- Authentication implementation.
- Authorization policy.
- Web/Mobile rendering.
- Exact student-facing question UX.
- Exact answer-entry UX.
- Exact correction/feedback UX.
- Admin permission policy.

Those concerns belong to C2, C3, C4, C6, and C7.

---

1. Engine Authority

The Exam Engine is the sole normative owner of exam behavior.

Other contracts may:

- expose engine behavior;
- persist engine state;
- consume engine results;
- render engine state.

They must not independently redefine exam lifecycle or grading behavior.

---

2. Core Exam Lifecycle

The canonical lifecycle is:

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
Server Validation
  ↓
Server Grading
  ↓
Persist Result
  ↓
Result

This lifecycle applies to both Training and Simulator, with their mode-specific timing and feedback differences.

---

3. Server Authority

The server is authoritative for:

- attempt identity;
- attempt ownership;
- question selection;
- snapshot;
- timer;
- expiration;
- answer validation;
- grading;
- marks;
- final result;
- final attempt state.

The client is never authoritative for final exam state.

---

4. START

"START" is the engine operation invoked by the API.

Inputs conceptually include:

userId
subjectId
bankType
examMode
trainingSetId when required

"userId" must originate from authenticated server-side identity.

The engine must not trust a client-provided user ID.

---

5. Active Attempt Resolution

Before creating a new attempt, the engine checks for an existing active attempt for:

user + subject

The rule applies regardless of:

- bank type;
- exam mode.

If an active attempt exists:

«Resume that attempt rather than creating another active attempt.»

This preserves the one-active-attempt-per-user-per-subject invariant.

---

6. Attempt Creation

If no active attempt exists:

1. Validate the requested subject.
2. Validate "bankType".
3. Validate "examMode".
4. Validate "trainingSetId" when required.
5. Select questions according to the applicable selection algorithm.
6. Create the attempt.
7. Create its immutable question snapshot.
8. Persist the attempt question records.
9. Return the complete runtime snapshot.

Creation must be transactional.

---

7. Training Exam

Training is:

- non-timed;
- educational;
- non-proctored;
- suitable for immediate instructional feedback.

For Training:

expiresAt = null
durationSeconds = null

Training does not use the Simulator timer or expiration mechanism.

---

8. Simulator Exam

Simulator is:

- timed;
- exam-like;
- optional;
- non-official.

Simulator does not provide real proctoring.

Camera behavior is outside the engine and belongs to C6 as client/device UX.

No camera recording, video upload, behavioral surveillance, cheating detection, or anti-cheat analysis is performed.

---

9. Question Selection — Comprehensive

For:

bankType = comprehensive

the engine selects questions using:

1. requested subject;
2. "bank_type = comprehensive";
3. "status = approved";
4. supported question type/mode;
5. Full-Cycle Exclusion;
6. random selection;
7. no duplicates within the attempt.

The engine must not select archived questions.

---

10. Full-Cycle Exclusion

Full-Cycle Exclusion applies only to the comprehensive bank.

It does not apply to Training Sets.

Conceptually:

Eligible Questions
        ↓
Exclude Questions Seen in Current Cycle
        ↓
Random Selection

---

11. Cycle Identity

A Full-Cycle is scoped independently by:

(userId, subjectId, bankType)

For the current comprehensive-bank implementation:

bankType = comprehensive

Therefore a user's history in one subject does not affect another subject.

Training history does not affect comprehensive-bank cycles.

---

12. Seen History

When a comprehensive question is used in an attempt, its appearance is recorded in:

exam_question_history

The database stores this history according to C3.

The history record identifies:

- user;
- question;
- attempt;
- time seen.

---

13. Cycle Reset

If the number of eligible unseen questions is insufficient for the required exam size:

1. reset the current comprehensive cycle for that user/subject;
2. make the complete eligible pool available again;
3. select the required questions;
4. prevent duplicates within the new attempt.

Reset affects only the applicable:

user + subject + comprehensive bank

It does not reset other subjects or Training Sets.

---

14. New Questions

A question added to the comprehensive bank after a user's previous cycle activity is immediately eligible if it satisfies all current eligibility conditions.

New questions do not require a manual cycle reset.

---

15. Insufficient Question Pool

If the eligible pool cannot provide the required number of questions even after the applicable cycle reset, the engine must fail the start operation with a deterministic insufficient-question condition.

It must not:

- duplicate questions to fill the exam;
- use mock questions;
- use archived questions;
- silently lower the required exam size.

The API exposes the resulting error according to C4.

---

16. Training Set Selection

For:

bankType = training

the engine requires a valid:

trainingSetId

Questions are selected from that training set.

Selection is deterministic according to the stored "position".

Full-Cycle Exclusion is not applied.

The same question must not occur twice within one attempt.

---

17. Training Set Eligibility

Training-set questions must satisfy the applicable question/content rules before being used.

At minimum:

- question exists;
- question belongs to the requested subject;
- question is approved;
- question type is supported;
- required configuration is valid.

Invalid training-set composition must not silently produce an invalid exam.

---

18. Snapshot Creation

When an attempt starts, the engine creates an immutable snapshot of the selected questions.

The snapshot represents the exact question state used by that attempt.

It must preserve the information required to:

- render the question;
- validate the answer;
- grade the answer;
- reproduce the historical attempt.

The snapshot must not depend on later changes to "question_bank".

---

19. Snapshot Contents

The persisted snapshot must contain, directly or through its defined structure, the required immutable runtime information including:

- question ID;
- question type;
- question content;
- effective interaction configuration;
- effective marks;
- position;
- other approved immutable question configuration required for execution/grading.

The exact persistence structure is stored according to C3.

---

20. Simulator Snapshot Sanitization

The engine must distinguish between:

Server snapshot

Contains everything required for authoritative validation and grading.

Simulator client representation

Contains only information the client needs to conduct the exam.

Simulator client data must not expose:

- "correct_answer";
- nested grading keys;
- equivalent answer-bearing data that reveals the solution.

The API transport layer performs the final DTO representation defined by C4.

---

21. Training Snapshot

Training may expose additional approved instructional data required for its educational behavior.

Such data must remain schema-defined.

Training exposure must not compromise server authority.

---

22. Snapshot Immutability

After attempt creation:

«The attempt's question snapshot must not be replaced by the current question-bank version.»

Changes to the source question after START must not alter the active attempt.

This includes changes to:

- content;
- correct answer;
- marks;
- interaction configuration;
- status.

Historical grading uses the attempt snapshot.

---

23. Local Exam State

After START, the client maintains local exam state.

This may include:

- answers;
- current question;
- navigation;
- instructional interaction state;
- local recovery information.

The engine does not require answer-by-answer API synchronization.

Client storage is implemented by C6.

---

24. Zero-Request Rule

During normal exam execution:

«No API request is required for each answer, navigation event, timer tick, or interaction.»

There is no normal:

- answer-save request;
- progress-save request;
- heartbeat;
- timer polling;
- exam polling.

The next normal server interaction is "FINISH".

---

25. Training Feedback

Training supports immediate educational feedback.

The exact presentation of:

- correctness;
- explanation;
- correction;
- instructional steps;

is reserved product UX.

The engine must nevertheless provide the authoritative information required by the approved Training feedback flow.

---

26. Simulator Feedback

Before FINISH:

«Simulator does not provide authoritative correctness or grading feedback.»

The client may manage local UI state, but it must not present a client-calculated authoritative result.

Server grading occurs at FINISH.

---

27. Timer Authority

For Simulator:

expiresAt

is the server-authoritative expiration boundary.

The client timer is display-only.

Client clock values must not determine whether an attempt is accepted.

---

28. Expiration

At FINISH the server evaluates the current server time against "expiresAt".

The client-supplied "timeTakenSeconds" is not authoritative.

---

29. Simulator Grace Period

The Simulator uses a 120-second finalization grace period:

now <= expiresAt
    → accept

expiresAt < now <= expiresAt + 120 seconds
    → accept

now > expiresAt + 120 seconds
    → reject as expired

The grace period is an exam-experience tolerance, not an anti-cheating control.

---

30. Expired Attempt

If the attempt is beyond the allowed grace period:

- FINISH is rejected;
- the attempt is finalized as expired according to the engine lifecycle;
- no normal submitted result is produced.

The API exposes the appropriate error.

---

31. FINISH

FINISH performs:

1. authenticate caller;
2. verify attempt ownership;
3. verify attempt state;
4. verify expiration;
5. lock the attempt for finalization;
6. load the immutable snapshot;
7. validate submitted answers;
8. grade answers on the server;
9. persist answer/grading records;
10. calculate final result;
11. finalize the attempt;
12. return the server-authoritative result.

The operation must be atomic.

---

32. Concurrent FINISH Protection

Finalization must use transactional locking sufficient to prevent two simultaneous finish operations from producing conflicting final states.

A row-level lock such as:

SELECT ... FOR UPDATE

is appropriate for the attempt-finalization critical section.

The exact SQL belongs to the implementation layer.

The locking requirement is an engine invariant.

---

33. Already Finalized Attempts

If an attempt has already reached a final state and another finish operation is submitted:

409 ATTEMPT_ALREADY_FINALIZED

The API exposes this state.

C5 owns the finalization rule.

---

34. Answer Validation

Every submitted answer is untrusted input.

Before grading, the engine validates each answer against:

- the question in the immutable snapshot;
- its C2 question-type schema;
- the expected answer representation;
- allowed identifiers/values;
- structural constraints.

Invalid answers are rejected deterministically.

The engine must not trust:

- client "isCorrect";
- client "obtainedMarks";
- client grading status;
- client result;
- client question selection.

---

35. Missing Answers

Missing answers are validly interpreted as unanswered questions where the question type permits an empty/unanswered state.

The engine must define the result consistently:

- unanswered questions receive zero marks unless a specific approved grading rule says otherwise;
- unanswered questions do not cause arbitrary client-side scoring.

---

36. Unknown Answers / Question IDs

An answer submitted for a question not belonging to the attempt must be rejected.

The engine must not grade an answer against the current question bank merely because the question ID exists globally.

The attempt snapshot defines the valid question set.

---

37. Grading Authority

All authoritative grading occurs server-side.

The client never determines:

- correctness;
- obtained marks;
- percentage;
- final grading status.

---

38. Auto Grading

Current auto-grading supports deterministic machine grading for appropriate objective types, including:

- "multiple_choice";
- "true_false".

Additional deterministic types may be auto-graded where their approved grading rules are implemented.

---

39. Manual Grading

Essay-oriented types may require manual grading, including:

- "short_essay";
- "long_essay".

Manual grading must operate on the persisted attempt data.

Authorization for manual grading belongs to C7.

Exact grader UI is outside this contract.

---

40. Mixed Grading

The following may require mixed/manual or structured grading:

- "explain";
- "contour_map";
- "reading_comprehension".

The exact grading workflow may vary according to the approved grading capability of the question type.

The engine owns the grading state transitions.

---

41. AI Grading

AI grading is a future capability.

Current implementation must not depend on AI availability for core exam operation.

Where AI is eventually introduced:

- it must be explicitly enabled;
- it must operate within the approved grading architecture;
- it must not replace server authority;
- it must not silently alter existing grading rules.

---

42. Partial Credit

The following six types support partial-credit grading:

1. "matching"
2. "fill_blank"
3. "comparison_table"
4. "ordering"
5. "diagram_labeling"
6. "arabic_grammar"

For these types:

obtainedMarks =
(correct units / total gradeable units) × maxMarks

The exact definition of a gradeable unit is type-specific and must be deterministic.

The question type contract defines the structure.

This contract defines the scoring behavior.

---

43. Matching Grading

Each valid matching unit is evaluated against the canonical grading key.

Partial credit is calculated from:

correct matches / gradeable matches

The exact UI representation is outside this contract.

---

44. Fill-Blank Grading

Each gradeable blank contributes to the partial-credit calculation.

Normalization rules:

trimWhitespace = mandatory
ignoreDiacritics = mandatory
ignoreCase = mandatory
ignoreAl = optional

Normalization is applied consistently before comparison.

The canonical accepted answer data comes from the question's grading representation.

---

45. Comparison Table Grading

Each gradeable table unit is evaluated against the canonical grading key.

Partial credit is calculated from correct gradeable units.

Numeric tolerance, where required by an approved question configuration, is a grading rule rather than part of the submitted answer structure.

---

46. Ordering Grading

Each gradeable ordering unit is evaluated against the canonical ordering key.

Partial credit is calculated deterministically from the correct gradeable units.

Duplicate or invalid item identifiers are rejected during validation.

---

47. Diagram Labeling Grading

Each gradeable diagram target is evaluated independently against the canonical grading key.

Partial credit is calculated from correct gradeable targets.

Media itself is not considered authoritative answer data.

---

48. Arabic Grammar Grading

Each gradeable grammar unit is evaluated against its canonical grading key.

Partial credit is calculated from correct gradeable units.

Any normalization or equivalence rule must be explicit and deterministic.

---

49. Result Calculation

The engine calculates:

totalMarks
obtainedMarks
percentage
gradingStatus
details

The result is derived from server-side grading.

The client does not calculate the authoritative result.

---

50. Result Detail

Each question result contains conceptually:

questionId
isCorrect
obtainedMarks
maxMarks

For partial-credit types:

isCorrect = obtainedMarks === maxMarks

"isCorrect" is server-derived.

---

51. Maximum Marks

"maxMarks"/effective question marks come from the authoritative attempt snapshot.

The result must never derive marks from the current mutable question bank after the attempt begins.

---

52. Grading Status

Canonical result-level states include:

auto_complete
pending_review
graded

Persistence-level grading statuses are stored according to C3.

The engine defines the semantic meaning and transitions between these states.

---

53. Expired Result

An attempt that expires without an accepted final submission does not receive a normal submitted result.

Where the API must represent the result of an expired attempt:

obtainedMarks = null

The API representation follows C4.

---

54. Recovery

Primary recovery mechanism:

local exam state

If local state is unavailable or corrupted:

GET /api/exam/active

may recover the server-side active snapshot.

Recovery must not create a second active attempt.

---

55. Local Recovery Integrity

The client may recover local answers from its storage.

Those answers remain untrusted until submitted and validated by the server.

The server snapshot remains authoritative for:

- question identity;
- question membership;
- marks;
- grading.

---

56. Concurrent START

Concurrent START operations must not create multiple active attempts for the same:

user + subject

The engine/database must coordinate this invariant transactionally.

If an active attempt already exists, the engine resumes it.

---

57. Question Duplication

An attempt must never contain duplicate questions.

Uniqueness is enforced both:

- by selection logic;
- by database constraints.

The database structure is defined by C3.

---

58. Comprehensive vs Training History

Comprehensive Full-Cycle history and Training Set usage are independent.

Training Set consumption does not mark a question as seen for comprehensive Full-Cycle Exclusion.

Comprehensive history does not alter deterministic Training Set ordering.

---

59. Source Question Changes

After START:

- changing a source question does not alter the attempt;
- archiving a source question does not invalidate the attempt;
- changing marks does not alter the attempt;
- changing the correct answer does not alter the attempt.

The attempt snapshot remains authoritative.

---

60. Engine Failure Behavior

The engine must fail safely.

It must not:

- partially finalize an attempt;
- silently substitute questions;
- create duplicate attempts;
- accept invalid answers as valid;
- calculate results from client-supplied marks;
- fall back to mock questions.

Operations requiring multiple persistent changes must be transactional.

---

61. Cross-Contract Ownership

Concern| Owner
Question definitions| C2
Question schemas| C2
Database structure| C3
Snapshot persistence location| C3
API transport| C4
Exam lifecycle| C5
Question selection| C5
Full-Cycle Exclusion| C5
Snapshot semantics| C5
Timer/expiration| C5
Grading| C5
Web rendering| C6
Mobile rendering| C6
Authentication| C7
Authorization| C7
Security enforcement| C7
Implementation sequence| C8
Gemini execution| C9

---

62. Non-Negotiable Rules

1. The server is authoritative for all final exam state.
2. START creates or resumes exactly one active attempt per user and subject.
3. START returns the complete exam snapshot.
4. Normal exam execution requires zero API requests before FINISH.
5. Training is non-timed.
6. Simulator is timed.
7. Simulator is not a proctoring or anti-cheat system.
8. The client timer is display-only.
9. Server time determines expiration.
10. Simulator uses a 120-second finalization grace period.
11. The attempt snapshot is immutable.
12. Grading uses the attempt snapshot.
13. Comprehensive selection uses Full-Cycle Exclusion.
14. Training Sets do not use Full-Cycle Exclusion.
15. Questions are never duplicated within an attempt.
16. New comprehensive questions become eligible immediately.
17. Insufficient questions must not be replaced with mock/duplicate/archived questions.
18. Every submitted answer is validated server-side.
19. Client-calculated correctness and marks are never authoritative.
20. Finalization is transactionally protected.
21. Concurrent finalization must not produce conflicting final states.
22. Objective grading is deterministic.
23. Partial-credit behavior is deterministic.
24. AI grading is future-only.
25. Historical attempts remain reproducible after source-question changes.
26. Exact question UX/input/correction remains reserved.
27. Admin permission policy remains reserved.

---

63. Acceptance Criteria

C5 is accepted only when:

- START/resume behavior is deterministic;
- one-active-attempt invariant is enforced;
- comprehensive selection uses Full-Cycle Exclusion;
- Training Set selection is deterministic;
- question duplication is impossible;
- new questions are immediately eligible;
- insufficient pools fail safely;
- snapshots are immutable;
- Simulator answer keys cannot reach the client;
- Training can support approved instructional feedback;
- normal exam operation uses zero API requests before FINISH;
- server time controls Simulator expiration;
- 120-second grace is enforced;
- FINISH is transactionally protected;
- answers are validated against the attempt snapshot;
- grading is server-authoritative;
- partial-credit types use deterministic scoring;
- Fill Blank normalization is deterministic;
- result calculation is server-side;
- AI grading is not required;
- historical results remain reproducible;
- no rule duplicates or overrides C1–C4.

---

64. Final Rule

The Exam Engine defines:

«How an exam starts, selects questions, executes, times, finishes, validates, grades, and produces results.»

It does not define:

«What a question type is, how data is stored, how HTTP transports it, how it is rendered, or who is authorized to perform privileged actions.»

Therefore:

«One Exam Behavior → One Canonical Engine Rule → Server Authority → Deterministic Execution.»

End of Contract 5 — v1.1.0
