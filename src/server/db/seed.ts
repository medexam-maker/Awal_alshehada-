import { TWELVE_CONTRACT_SUBJECTS } from '../../client/data/contractSubjects';
import { generateInitialQuestions } from '../../client/storage/defaultCurriculumData';
import { buildCanonicalAssessmentPayload, computeCanonicalSha256Node } from '../../shared/canonicalHash';

export async function seedDatabase(db: { query: (text: string, params?: any[]) => Promise<any> }) {
  try {
    // 1. Seed Subjects from official contract subjects
    for (const sub of TWELVE_CONTRACT_SUBJECTS) {
      await db.query(
        `INSERT INTO subjects (id, name_ar, name_en, slug, display_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE
         SET name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en, display_order = EXCLUDED.display_order`,
        [sub.slug, sub.name_ar, sub.name_en, sub.slug, sub.index]
      );
    }

    // Get subject ID mapping (slug -> UUID/id)
    const subRes = await db.query(`SELECT id, slug FROM subjects`);
    const slugToIdMap = new Map<string, string>();
    for (const row of subRes.rows) {
      slugToIdMap.set(row.slug, row.id);
    }

    // 2. Seed Initial Authored Questions
    const initialQuestions = generateInitialQuestions();
    for (const q of initialQuestions) {
      const subjectId = slugToIdMap.get(q.subjectSlug);
      if (!subjectId) continue;

      const fullContent = {
        prompt: q.prompt,
        ...(typeof q.content === 'object' && q.content !== null ? q.content : {}),
      };

      const canonicalPayload = buildCanonicalAssessmentPayload({
        prompt: q.prompt,
        marks: q.allocatedMarks || 5,
        content: fullContent,
        correct_answer: typeof q.correctAnswer === 'object' && q.correctAnswer !== null ? q.correctAnswer : { answer: q.correctAnswer },
        explanation: q.explanationAr
      });
      const canonicalHash = computeCanonicalSha256Node(canonicalPayload);
      const approvedHash = q.status === 'approved' ? canonicalHash : null;

      await db.query(
        `INSERT INTO question_bank
         (id, subject_id, question_type, content, correct_answer, primary_interaction_mode, marks, bank_type, status, explanation, canonical_content_hash, approved_content_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE
         SET content = EXCLUDED.content,
             correct_answer = EXCLUDED.correct_answer,
             explanation = EXCLUDED.explanation,
             canonical_content_hash = EXCLUDED.canonical_content_hash,
             approved_content_hash = EXCLUDED.approved_content_hash,
             status = EXCLUDED.status`,
        [
          q.id,
          subjectId,
          q.questionType,
          JSON.stringify(fullContent),
          JSON.stringify(q.correctAnswer),
          'large_cards',
          q.allocatedMarks || 5,
          'comprehensive',
          q.status || 'approved',
          q.explanationAr || null,
          canonicalHash,
          approvedHash,
        ]
      );
    }

    console.log('[DB Seed] Successfully seeded contract subjects and initial questions into database.');
  } catch (err) {
    console.warn('[DB Seed] Seeding warning:', err);
  }
}
