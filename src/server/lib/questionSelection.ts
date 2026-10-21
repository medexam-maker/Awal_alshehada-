import { PoolClient } from 'pg';
import { BankType, ExamMode, QuestionStatus } from '../../shared/constants';
import { QUESTION_TYPE_REGISTRY } from '../../shared/questionTypeRegistry';

function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export async function selectQuestions(
  client: PoolClient,
  userId: string,
  subjectId: string,
  bankType: BankType,
  examMode: ExamMode,
  limit: number,
  trainingSetId?: string
): Promise<Record<string, unknown>[]> {
    if (bankType === BankType.TRAINING) {
        if (!trainingSetId) {
            throw new Error('Training sets require a trainingSetId');
        }
        const res = await client.query(
            `SELECT q.*, tsq.marks_override
             FROM question_bank q
             JOIN training_set_questions tsq ON q.id = tsq.question_id
             WHERE tsq.training_set_id = $1 AND q.status = $2
             ORDER BY tsq.position ASC`,
            [trainingSetId, QuestionStatus.APPROVED]
        );
        if (res.rows.length === 0) {
            throw new Error('INSUFFICIENT_QUESTIONS: Training set contains no approved questions.');
        }
        return res.rows.map((row: Record<string, unknown>) => ({
            ...row,
            marks: row.marks_override !== null && row.marks_override !== undefined ? row.marks_override : row.marks
        }));
    }

    const supportedTypes = Object.values(QUESTION_TYPE_REGISTRY)
        .filter(entry => examMode === ExamMode.SIMULATOR ? entry.simulationSupport : entry.trainingSupport)
        .map(entry => entry.type);

    const query = `SELECT * FROM question_bank
                   WHERE subject_id = $1 AND bank_type = $2 AND status = $3 AND question_type = ANY($4::text[])`;
    const params: unknown[] = [subjectId, BankType.COMPREHENSIVE, QuestionStatus.APPROVED, supportedTypes];

    const allQuestionsRes = await client.query(query, params);
    const allQuestions = allQuestionsRes.rows as Record<string, unknown>[];

    // C5 Section 15: If the eligible pool cannot satisfy the required limit, fail deterministically
    if (allQuestions.length < limit) {
        throw new Error(`INSUFFICIENT_QUESTIONS: Eligible question pool (${allQuestions.length}) is insufficient for required exam size (${limit}).`);
    }

    // Check seen questions in current cycle for this user + subject + comprehensive bank
    const historyRes = await client.query(
        `SELECT h.question_id 
         FROM exam_question_history h
         JOIN question_bank q ON h.question_id = q.id
         WHERE h.user_id = $1 AND q.subject_id = $2 AND q.bank_type = $3`,
        [userId, subjectId, BankType.COMPREHENSIVE]
    );
    const seenIds = new Set(historyRes.rows.map((r: { question_id: string }) => r.question_id));

    const unseen = allQuestions.filter(q => !seenIds.has(q.id as string));

    if (unseen.length >= limit) {
        shuffleArray(unseen);
        return unseen.slice(0, limit);
    }

    // C5 Section 13: Cycle Reset when unseen questions are insufficient
    await client.query(
        `DELETE FROM exam_question_history
         WHERE user_id = $1 AND question_id IN (
             SELECT id FROM question_bank WHERE subject_id = $2 AND bank_type = $3
         )`,
        [userId, subjectId, BankType.COMPREHENSIVE]
    );

    // After reset, entire eligible pool is available again; select required questions without duplicates
    shuffleArray(allQuestions);
    return allQuestions.slice(0, limit);
}
