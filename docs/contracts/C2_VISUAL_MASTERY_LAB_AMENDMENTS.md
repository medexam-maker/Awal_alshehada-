# C2 — Visual Mastery Lab Amendments (CR-2026-11-06)
Reference: CR-2026-11-06 — Visual Mastery Lab, Phase A: foundation (diagram_labeling)
Status: Approved Architectural Amendments

## 1. Owner Decisions (Amendments to the Draft Contract)
1. **Phasing**: Phase A = server/shared foundation (geometry, upload validation, schemas, grading, snapshots, media library, admin routes). Phase B = renderer + editor + library UI + image preloading for offline/zero-request exams. Phase C (later, separate approval): mastery profile, remediation, spaced repetition — they need new tables and formulas the draft itself defers. Phase A only leaves data hooks: every sub-question has a `skill`, and grading returns per-component results (kept in attempt result details, no new table).
2. **Audit Finding**: `media_assets` (migration 004) exists but was unused: no upload route, no storage backend; current images were static files under `public/`. Decision: store images in PostgreSQL (BYTEA) in `media_assets`, behind a small `MediaStorage` interface so object storage can replace it later. Migration 011 approved.
3. **Region Geometry**: `ellipse`, `rect`, `polygon` (the draft's "circle" is replaced by ellipse; "path" is deferred). Coordinates are NORMALIZED to the original image (0..1 on x and y), never pixels. Each region has an optional `tolerance` (normalized distance, 0..0.1, default 0.01) so a tap near the boundary still counts.
4. **Immutability & Content-Addressing**: Assets are IMMUTABLE and content-addressed (sha256). "Replacing" an image in a question means pointing it to another asset id and re-drawing its regions; bytes of an existing asset are never updated. Assets are archived, never hard-deleted through the API; archived assets are still served (historical exams stay valid).
5. **Sub-Question Kinds**: Three sub-question kinds replace the draft's loose dimensions: `locate` (tap the image → identification), `name` (recognition), `function` (understanding). Default skill by kind; `skill` may be overridden per sub-question.
6. **Simulator vs Training Naming**: Simulator naming = the student TYPES the name; it is graded by exact match after Arabic normalization against `acceptedNames` (no fuzzy matching). Training naming = 3 shuffled options graded by id. `function` is always selection by id (3-4 options).
7. **Hints**: plain text, at most 4 per sub-question, training only. Region-based hints are deferred.
8. **Legacy Compatibility**: Legacy `labels` questions stay valid and graded exactly as today; they are not migrated.
9. **Diagram References**: The diagram reference is `assetId` (uploaded) OR a bundled `/assets/...` url (demo/seed only). External URLs are rejected.

## 3. Data Shapes (Canonical, Additive)
- **Content**:
  ```ts
  {
    prompt: string,
    diagram: { assetId?: string, url?: string, alt?: string },
    subQuestions: [
      {
        id: string,
        kind: 'locate' | 'name' | 'function',
        skill?: 'recognition' | 'identification' | 'understanding',
        prompt: string,
        marks?: number, // weight, default 1
        target?: Region, // display-only highlight
        options?: [{ id: string, text: string }],
        hints?: string[] // <= 4 items
      }
    ]
  }
  ```
  - `name`: exactly 3 options.
  - `function`: 3-4 options.
  - Unique sub-question ids and unique option ids inside a question.
  - `target` must be a valid Region.
- **Key (`correct_answer`, DB only)**:
  ```ts
  {
    subAnswers: {
      [subId: string]:
        | { regions: Region[] } // locate (>= 1 region)
        | { optionId: string, acceptedNames: string[] } // name (>= 1 acceptedName)
        | { optionId: string } // function
    },
    explanations?: { [subId: string]: string }
  }
  ```
- **Student Answer**:
  ```ts
  {
    subAnswers: {
      [subId: string]: {
        point?: { x: number, y: number }, // 0..1 normalized
        optionId?: string,
        text?: string
      }
    }
  }
  ```
- **Region**:
  - `{ type: 'ellipse', cx: number, cy: number, rx: number, ry: number, tolerance?: number }`
  - `{ type: 'rect', x: number, y: number, w: number, h: number, tolerance?: number }`
  - `{ type: 'polygon', points: [{ x: number, y: number }], tolerance?: number }` // >= 3 points
  - Tolerance: optional normalized distance (0..0.1, default 0.01).
- All answer keys (regions, acceptedNames, optionId, explanations) live ONLY in `correct_answer`; `content` holds only what the student may see.
