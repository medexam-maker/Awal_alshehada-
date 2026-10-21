# QUESTION_TYPES_CONTRACT.md

Contract: 2 — Question Types & Question Domain
Version: 1.1.0
Status: Approved Architectural Contract
Depends On: PROJECT_CONSTITUTION.md v1.1.0
Normative Owner: This contract is the sole normative owner of supported question-type definitions.

---

0. Purpose

This contract defines the platform's supported question types and their domain-level contracts.

It owns:

- Question type identity.
- Question type schemas.
- Question content structures.
- Answer structures.
- Supported interaction modes.
- Supported exam modes.
- Type-level validation.
- Type-level grading capability.
- Question-type metadata.
- Question-type registry metadata.

It does not own:

- Exam lifecycle or selection algorithms.
- Database persistence.
- API transport.
- Authentication or authorization.
- Security controls.
- Web/Mobile rendering implementation.
- Exact student-facing UI.
- Exact answer-entry presentation.
- Exact correction/feedback UX.
- Admin permission policy.

Those responsibilities belong to their respective contracts.

---

1. Architectural Ownership

The platform follows:

«One rule → one normative owner → many references.»

Question Types Contract is the sole normative owner for the definition of supported question types.

Other contracts may:

- reference question types;
- consume their schemas;
- enforce their constraints;
- implement their rendering;
- apply their grading behavior.

They must not redefine the question types independently.

---

2. Supported Question Types

Version 1 supports exactly these 15 standardized types:

1. "true_false"
2. "fill_blank"
3. "multiple_choice"
4. "matching"
5. "short_essay"
6. "long_essay"
7. "explain"
8. "comparison_table"
9. "odd_one_out"
10. "diagram_labeling"
11. "contour_map"
12. "calculation"
13. "ordering"
14. "arabic_grammar"
15. "reading_comprehension"

New question types require an explicit contract change.

No implementation may silently introduce a new normative question type.

---

3. Question Type Identity

Every question has exactly one canonical "questionType".

The identifier must:

- be unique;
- be stable;
- use the canonical registry identifier;
- not be changed for cosmetic/UI reasons.

Human-readable Arabic/English labels are metadata and are not identifiers.

---

4. Question Contract

Each question type must define, directly or through its canonical schema:

- "questionType"
- human-readable labels
- content schema
- answer schema
- supported interaction modes
- supported exam modes
- default interaction mode where applicable
- validation rules
- grading capability
- media requirements where applicable
- registry metadata

The type contract must be sufficient for both Web and Mobile implementations to consume the same domain definition.

---

5. Content vs Grading Answer

The platform distinguishes between:

5.1 "content"

"content" contains the information required to construct and teach the question.

It may contain structured information that is useful for instructional behavior.

Some question types may therefore contain answer-related instructional metadata inside "content".

Examples include:

- blank-level expected values used for instructional behavior;
- matching pair identifiers;
- ordering metadata;
- diagram labeling metadata;
- reading sub-question structures.

This is allowed.

5.2 "correct_answer"

"correct_answer" is the canonical grading key used by the server-side grading system.

It is the authoritative answer representation for grading.

The presence of answer-related metadata inside "content" does not make that metadata a second independent grading authority.

Where the same semantic information exists in both structures, grading authority remains with "correct_answer".

---

6. Runtime Answer-Key Protection

Question-type schemas may contain answer-bearing instructional fields.

However:

«No grading key may be exposed to the student in Simulator runtime data.»

This includes answer keys nested inside "content".

Therefore, Simulator runtime representations must be sanitized before being returned to the client.

The detailed runtime snapshot and API representation are owned by the Exam Engine and API contracts respectively.

Security enforcement belongs to the Security Contract.

Training may expose information required for its approved instructional feedback behavior, subject to the rules of the other contracts.

---

7. Student Answer

Each question type defines a typed student-answer structure.

Submitted answers must be:

- structurally valid;
- type-valid;
- validated against the question-type schema;
- interpreted by the server-side grading pipeline.

Client-side validation is UX assistance only.

The server remains authoritative.

---

8. Interaction Modes

Interaction modes describe supported ways a question can be answered or interacted with.

A question type may support one or more interaction modes.

Interaction modes are domain capabilities, not UI implementations.

A question type may therefore support different interaction modes in Training and Simulator.

The exact visual presentation and answer-entry UX are intentionally outside this contract.

---

9. Exam Mode Resolution

This contract defines which modes a question type supports.

It does not independently decide the final interaction mode used during an exam attempt.

The Exam Engine determines the effective mode according to:

- question capabilities;
- exam mode;
- engine rules;
- question configuration.

A question-type contract must not override the Exam Engine's lifecycle or mode-resolution rules.

---

10. Training vs Simulator

Question types may legitimately behave differently between:

Training

Training is educational and may support:

- immediate feedback;
- explanation;
- instructional interaction;
- multi-step learning;
- selectable instructional answers where appropriate.

Training behavior does not imply that every question type must be automatically graded immediately.

Simulator

Simulator is timed and exam-like.

It does not expose grading feedback before submission.

The exact correction presentation and student-facing interaction remain reserved product decisions.

---

11. Question-Type Definitions

11.1 True / False

ID: "true_false"

Purpose: binary proposition evaluation.

Typical content:

- prompt/question statement.

Answer:

type TrueFalseAnswer = boolean;

Validation:

- answer must be boolean.

Grading:

- exact match against the canonical correct answer.

---

11.2 Fill in the Blank

ID: "fill_blank"

Purpose: complete one or more missing values.

Each blank may define instructional metadata such as:

- blank identifier;
- accepted values;
- optional choices.

Student answer:

type FillBlankAnswer = Record<string, string>;

Supported interaction may include:

- free entry;
- configured choice-based interaction;
- "tap_reveal_3".

For "tap_reveal_3":

- exactly three choices must be supplied for the applicable blank;
- validation must reject an invalid choice count.

Normalization rules used for grading are owned by the Exam Engine.

---

11.3 Multiple Choice

ID: "multiple_choice"

Purpose: select an answer from defined choices.

Content includes:

- question prompt;
- choices;
- stable choice identifiers.

Student answer:

type MultipleChoiceAnswer = {
  selectedOptionId: string;
};

Validation:

- submitted answer must be an object of shape { selectedOptionId: string }.
- selectedOptionId must be a non-empty string without extra properties.
- selectedOptionId must reference an available choice in the question's content.options.

Grading:

- deterministic exact ID matching against the canonical correct option ID (no partial credit, no negative marking, no fuzzy or string-coerced comparisons).

---

11.4 Matching

ID: "matching"

Purpose: associate items from two or more defined groups.

Content may contain stable pair/group identifiers.

Student answer:

type MatchingAnswer = Record<string, string>;

Validation:

- referenced identifiers must exist;
- answer structure must conform to the defined matching schema.

Grading supports partial credit.

The exact scoring algorithm is owned by the Exam Engine.

Question content must not introduce an independent scoring policy such as an implementation-specific "allowPartialMatch" switch that overrides the engine.

---

11.5 Short Essay

ID: "short_essay"

Purpose: short free-form written response.

Student answer:

type ShortEssayAnswer = string;

Validation:

- answer must be a string;
- length constraints, when configured, must be schema-valid.

Grading capability may be:

- manual;
- future AI-assisted;
- or another explicitly approved grading path.

Exact correction and feedback behavior is reserved.

---

11.6 Long Essay

ID: "long_essay"

Purpose: extended written response.

Student answer:

type LongEssayAnswer = string;

Validation:

- answer must be a string;
- configured length constraints must be respected.

Grading is primarily manual in the current architecture.

Future AI assistance may be added through the approved AI grading architecture.

Exact correction UX is reserved.

---

11.7 Explain

ID: "explain"

Purpose: require an explanatory response or reasoning.

Student answer may be structured or textual according to the question schema.

The schema must define the permitted answer representation explicitly.

The type supports manual/mixed grading where configured.

Training may provide instructional feedback.

Simulator must not expose grading keys before submission.

Exact correction behavior is reserved.

---

11.8 Comparison Table

ID: "comparison_table"

Purpose: complete structured comparisons between defined entities and criteria.

Content defines:

- rows;
- columns;
- comparison criteria;
- stable identifiers.

Student answer is a structured table representation.

Partial credit is supported.

Any numeric tolerance required by a future comparison rule must be part of the grading configuration, not an uncontrolled property of the submitted student answer.

The Exam Engine owns scoring.

---

11.9 Odd One Out

ID: "odd_one_out"

Purpose: identify the item that does not belong.

Content defines:

- item identifiers;
- displayed item data;
- instructional metadata where required.

Student answer:

type OddOneOutAnswer = string;

Validation:

- selected identifier must exist.

Grading uses the canonical "correct_answer".

Any instructional "isOdd" metadata inside content must not become a second grading authority.

---

11.10 Diagram Labeling

ID: "diagram_labeling"

Purpose: identify or label regions/elements of a diagram.

Content may define:

- diagram media reference;
- label targets;
- target identifiers;
- instructional label metadata.

Student answer is a structured mapping between target identifiers and submitted labels.

Partial credit is supported.

Media must use the platform's approved media/storage model rather than arbitrary uncontrolled storage references.

The Exam Engine owns scoring.

---

11.11 Contour Map

ID: "contour_map"

Purpose: answer questions involving geographic/contour-map structures.

Content may define:

- map/media reference;
- regions;
- points;
- lines;
- sub-questions;
- instructional metadata.

Student answers must use an explicit typed structure.

No "any" is permitted.

Example generic representation:

type ContourMapAnswer = {
  subAnswers: Record<string, unknown>;
};

The concrete schema must validate the allowed values for each sub-question.

Any answer-bearing metadata embedded in content must be removed from Simulator runtime representations when it constitutes a grading key.

Grading behavior is owned by the Exam Engine.

---

11.12 Calculation

ID: "calculation"

Purpose: solve a mathematical, scientific, or quantitative problem.

Content may define:

- problem statement;
- variables;
- units;
- required steps;
- instructional information.

Student answer must be explicitly typed.

Numeric grading configuration such as tolerance, when required, is grading configuration and is not part of the submitted answer itself.

Example conceptual separation:

type CalculationAnswer = {
  value: number;
  unit?: string;
};

The final schema may extend this structure where required by the approved question model.

Grading and tolerance application are owned by the Exam Engine.

---

11.13 Ordering

ID: "ordering"

Purpose: place defined items into the correct sequence.

Content defines stable item identifiers.

Student answer:

type OrderingAnswer = string[];

Validation:

- identifiers must exist;
- duplicates must be rejected where the schema requires a permutation;
- invalid identifiers must be rejected.

Partial credit is supported.

The Exam Engine owns scoring.

---

11.14 Arabic Grammar

ID: "arabic_grammar"

Purpose: structured Arabic grammar exercises.

Content may define:

- sentence/text;
- words;
- grammatical targets;
- instructional metadata.

Student answer must use the explicit schema appropriate to the exercise.

No "any" is permitted.

Any "correctAnswer" field inside instructional content must not become a second grading authority.

The canonical grading key is "correct_answer".

---

11.15 Reading Comprehension

ID: "reading_comprehension"

Purpose: answer structured questions based on a reading passage.

Content may define:

- passage;
- sub-questions;
- choices;
- question metadata;
- instructional information.

Student answer:

type ReadingComprehensionAnswer = {
  subAnswers: Record<string, unknown>;
};

The schema must validate each sub-question according to its defined answer type.

Nested "correctAnswer" data must never be exposed to Simulator clients when it represents grading information.

The canonical grading key remains "correct_answer".

---

12. Partial-Credit Types

The following types support partial-credit grading:

1. "matching"
2. "fill_blank"
3. "comparison_table"
4. "ordering"
5. "diagram_labeling"
6. "arabic_grammar"

The Exam Engine owns the exact partial-credit algorithm.

Question Types Contract only declares the capability.

---

13. Validation

Every question type must provide explicit validation for:

- content;
- student answer;
- required fields;
- field types;
- identifiers;
- allowed values;
- mode-specific constraints.

Validation must be deterministic and schema-based where applicable.

No production question-type validator may use "any".

Use explicit types, "unknown", schemas, and type guards as appropriate.

---

14. JSON Schema / Runtime Validation

Question schemas must have an explicit validation standard.

The implementation must use the project's approved schema-validation mechanism.

The exact validation library is an implementation dependency and must not silently become a new domain rule.

Schema validation must be applied server-side for untrusted input.

---

15. Registry

The shared question-type registry is the executable representation of this contract.

It must contain canonical metadata such as:

- type ID;
- labels;
- supported interaction modes;
- supported exam modes;
- schema references;
- grading capability;
- validation references.

The registry must not become a second normative source of truth.

If registry metadata conflicts with this contract, the implementation is incorrect and must be corrected.

---

16. Client Registry and Renderers

Client renderers are implementation details.

Web and Mobile may each maintain client-specific renderer mappings.

Conceptually:

Question Type Contract
        ↓
Shared Registry
        ↓
Client Registry
        ↓
Web Renderer / Mobile Renderer

React components and platform-specific renderer implementations are owned by the Web/Mobile Contract.

This contract does not contain React component implementations.

No "React.ComponentType<any>" or equivalent "any"-based renderer contract is permitted.

---

17. Media

Question types requiring media must reference the platform's approved media model.

Media references must not introduce arbitrary uncontrolled storage URLs as a parallel storage architecture.

The Database Contract owns persistence.

The Web/Mobile Contract owns rendering and device access.

The Security Contract owns upload/access protection.

---

18. Training Instructional Data

Training may require additional structured information to support learning interactions.

Such data may exist in the question content model where appropriate.

However:

- it must remain schema-defined;
- it must not create a second grading authority;
- it must not violate Simulator answer-key protection;
- it must not bypass server-side grading authority.

Training flexibility is intentional and does not imply that Simulator receives the same runtime representation.

---

19. Simulator Sanitization Boundary

For Simulator:

Authoritative Question
        ↓
Question-Type Schema
        ↓
Sanitized Runtime Representation
        ↓
Client

The client must receive only information necessary to conduct the exam.

The sanitization layer must account for:

- top-level "correct_answer";
- nested answer-bearing fields;
- instructional fields that reveal the grading key;
- future question-type-specific answer leakage.

This is a cross-contract implementation requirement owned respectively by:

- C2 — type structure;
- C4 — API representation;
- C5 — exam snapshot behavior;
- C7 — security enforcement.

---

20. Future Question Types

Future types may be added only through an explicit contract revision.

Potential future types are outside the current v1 scope.

A future type must define the same minimum contract:

- identity;
- content;
- answer;
- interaction modes;
- validation;
- grading capability;
- supported exam modes;
- media requirements where applicable.

Implementation must not create an undocumented type first and update the contract later.

---

21. Reserved Product Decisions

The following decisions are intentionally not finalized by this contract:

21.1 Exact Question UX

This includes:

- exact visual presentation;
- exact controls;
- exact answer-entry method;
- exact mobile interaction;
- exact Web interaction;
- exact Training presentation;
- exact Simulator presentation.

21.2 Exact Correction / Feedback UX

This includes:

- exact feedback presentation;
- exact instructional correction flow;
- exact multi-step correction interaction;
- exact visual indication of correctness.

These remain reserved product decisions.

---

22. Cross-Contract Boundaries

Concern| Owner
Question type definition| C2
Question selection| C5
Full-Cycle Exclusion| C5
Exam lifecycle| C5
Grading algorithm| C5
Question persistence| C3
Question API DTOs| C4
Authentication| C7
Authorization| C7
Security enforcement| C7
Web renderer| C6
Mobile renderer| C6
Client/device integration| C6
Implementation sequence| C8
Gemini execution behavior| C9

No contract may silently assume ownership of another contract's normative rules.

---

23. Non-Negotiable Rules

1. Exactly one canonical identifier per supported question type.
2. No undocumented question types.
3. No "any" in production question contracts or implementations.
4. "correct_answer" remains the canonical grading authority.
5. Instructional answer-bearing content does not create a second grading authority.
6. Simulator runtime data must not expose grading keys.
7. Question-type definitions must be shared by Web and Mobile.
8. Client renderers are implementation-specific.
9. Question Types Contract does not own exam lifecycle.
10. Question Types Contract does not own database structure.
11. Question Types Contract does not own API transport.
12. Question Types Contract does not own security policy.
13. Question Types Contract does not define exact student-facing UX.
14. Question Types Contract does not define exact correction UX.
15. Partial-credit algorithms are owned by the Exam Engine.
16. New types require contract change before implementation.

---

24. Acceptance Criteria

C2 is considered correctly implemented only when:

- all 15 supported types use canonical IDs;
- every type has an explicit schema;
- every type has an explicit answer representation;
- supported interaction modes are explicit;
- supported exam modes are explicit;
- validation is explicit;
- no production "any" exists;
- renderer ownership remains with C6;
- grading algorithm ownership remains with C5;
- API representation ownership remains with C4;
- Simulator answer-key exposure is prevented;
- Training instructional flexibility remains supported;
- no duplicate normative question-type definition exists elsewhere.

---

25. Final Rule

The Question Types Contract defines what each question type is.

It does not define:

- how the database stores it;
- how the API transports it;
- how the engine selects it;
- how the engine scores it;
- how Web/Mobile renders it;
- how security protects it;
- how Admin permissions work;
- or the exact student-facing UX.

Therefore:

«One Question Type → One Canonical Definition → One Normative Owner → Shared Implementation Across Clients.»

End of Contract 2 — v1.1.0
