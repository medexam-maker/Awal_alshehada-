import { pool } from '../db/index';
import { selectQuestions } from './questionSelection';
import { createClientSnapshot, createDbSnapshot } from './snapshot';
import { autoGrade } from './scoringEngine';
import { ExamMode, BankType, GradingStatus, QuestionType } from '../../shared/constants';
import { validateQuestionAnswer, validateMcqAnswer } from '../../shared/validation/schemas';
import { AnswerSchemas } from '../../shared/validation/schemas';

export async function startExam(
  userId: string,
  subjectId: string,
  bankType: BankType,
  examMode: ExamMode,
  trainingSetId?: string
) {
    if (bankType === BankType.TRAINING && !trainingSetId) {
        throw new Error('Training sets require a trainingSetId');
    }
    if (bankType === BankType.COMPREHENSIVE && trainingSetId) {
        throw new Error('Comprehensive banks cannot have a trainingSetId');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Pessimistic lock on user to prevent concurrent duplicate attempts
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);

        // Resolve subjectId (handle slug or UUID)
        let resolvedSubjectId = subjectId;
        const subCheck = await client.query(`SELECT id FROM subjects WHERE id = $1 OR slug = $1`, [subjectId]);
        if (subCheck.rows.length > 0) {
            resolvedSubjectId = subCheck.rows[0].id;
        } else {
            const newSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await client.query(
                `INSERT INTO subjects (id, name_ar, slug, is_active) VALUES ($1, $2, $2, true) ON CONFLICT (slug) DO NOTHING`,
                [newSubId, subjectId]
            );
            const refetch = await client.query(`SELECT id FROM subjects WHERE slug = $1 OR id = $1`, [subjectId]);
            resolvedSubjectId = refetch.rows[0]?.id || newSubId;
        }

        // Check if question bank has questions for this subject
        const qCountRes = await client.query(`SELECT COUNT(*) as cnt FROM question_bank WHERE subject_id = $1`, [resolvedSubjectId]);
        const qCount = Number(qCountRes.rows[0]?.cnt || 0);
        if (qCount === 0) {
            throw new Error('بنك الأسئلة لهذا الجزء قيد الإنشاء والمراجعة وسيتوفر قريباً.');
        }

        const activeCheck = await client.query(
            `SELECT ea.id, ea.exam_mode, ea.bank_type, ea.training_set_id, ea.started_at, ea.expires_at, ea.total_marks,
                    (tes.exam_category = 'weekly') AS is_weekly
             FROM exam_attempts ea
             LEFT JOIN training_exam_sets tes ON tes.id = ea.training_set_id
             WHERE ea.user_id = $1 AND ea.subject_id = $2 AND ea.status = 'active'`,
            [userId, resolvedSubjectId]
        );
        if (activeCheck.rows.length > 0) {
            const existing = activeCheck.rows[0];
            const now = Date.now();
            const isExpired = existing.expires_at && now > new Date(existing.expires_at).getTime() + 120 * 1000;
            if (isExpired) {
                // Mark existing attempt expired beyond grace period
                await client.query(
                    `UPDATE exam_attempts SET status = 'expired', obtained_marks = NULL WHERE id = $1`,
                    [existing.id]
                );
                // Fall through to start new attempt
            } else {
                // C5 Section 5: Resume existing active attempt rather than creating another
                const eaqRes = await client.query(
                    `SELECT position, marks, question_snapshot 
                     FROM exam_attempt_questions 
                     WHERE attempt_id = $1 
                     ORDER BY position ASC`,
                    [existing.id]
                );
                const isWeeklySimulation = Boolean(existing.is_weekly && existing.exam_mode === ExamMode.SIMULATOR);
                const clientQuestions = eaqRes.rows.map(row => {
                    const snap = typeof row.question_snapshot === 'string'
                        ? JSON.parse(row.question_snapshot)
                        : row.question_snapshot;
                    return createClientSnapshot(snap, existing.exam_mode as ExamMode, row.position, isWeeklySimulation);
                });

                await client.query('COMMIT');

                return {
                    attemptId: existing.id,
                    examMode: existing.exam_mode as ExamMode,
                    status: 'active',
                    startedAt: existing.started_at,
                    expiresAt: existing.expires_at,
                    durationSeconds: existing.expires_at ? 7200 : null,
                    totalMarks: Number(existing.total_marks),
                    questions: clientQuestions,
                    resumed: true
                };
            }
        }

        let isWeeklySet = false;
        if (trainingSetId) {
            const setRes = await client.query<{ exam_category: string }>(
                `SELECT exam_category FROM training_exam_sets WHERE id = $1`,
                [trainingSetId]
            );
            if (setRes.rows.length > 0 && setRes.rows[0].exam_category === 'weekly') {
                isWeeklySet = true;
            }
        }
        const isWeeklySimulation = Boolean(isWeeklySet && examMode === ExamMode.SIMULATOR);

        const questions = await selectQuestions(client, userId, resolvedSubjectId, bankType, examMode, 40, trainingSetId);
        if (questions.length === 0) {
            throw new Error('No eligible questions found.');
        }

        const totalMarks = questions.reduce((sum, q) => sum + Number(q.marks), 0);
        const durationSeconds = 7200;
        const expiresAt = examMode === ExamMode.SIMULATOR 
            ? new Date(Date.now() + durationSeconds * 1000).toISOString() 
            : null;

        const attemptResult = await client.query(
            `INSERT INTO exam_attempts
             (user_id, subject_id, bank_type, exam_mode, training_set_id, status, expires_at, total_marks)
             VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
             RETURNING id, started_at`,
            [userId, resolvedSubjectId, bankType, examMode, trainingSetId || null, expiresAt, totalMarks]
        );
        const attemptId = attemptResult.rows[0].id;
        const startedAt = attemptResult.rows[0].started_at;

        const clientQuestions: Record<string, unknown>[] = [];
        
        // Batch INSERTs
        if (questions.length > 0) {
            const eaqValues: unknown[] = [];
            const eqhValues: unknown[] = [];
            const eaqPlaceholders: string[] = [];
            const eqhPlaceholders: string[] = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                const dbSnapshot = createDbSnapshot(q);
                const clientSnapshot = createClientSnapshot(q, examMode, i + 1, isWeeklySimulation);

                eaqValues.push(attemptId, q.id, i + 1, q.marks, JSON.stringify(dbSnapshot));
                const eaqOffset = eaqValues.length - 5;
                eaqPlaceholders.push(`($${eaqOffset + 1}, $${eaqOffset + 2}, $${eaqOffset + 3}, $${eaqOffset + 4}, $${eaqOffset + 5})`);

                eqhValues.push(userId, q.id, attemptId);
                const eqhOffset = eqhValues.length - 3;
                eqhPlaceholders.push(`($${eqhOffset + 1}, $${eqhOffset + 2}, $${eqhOffset + 3})`);

                clientQuestions.push(clientSnapshot);
            }

            await client.query(
                `INSERT INTO exam_attempt_questions
                 (attempt_id, question_id, position, marks, question_snapshot)
                 VALUES ${eaqPlaceholders.join(',')}`,
                eaqValues
            );

            await client.query(
                `INSERT INTO exam_question_history
                 (user_id, question_id, attempt_id)
                 VALUES ${eqhPlaceholders.join(',')}`,
                eqhValues
            );
        }

        await client.query('COMMIT');

        return {
            attemptId,
            examMode,
            status: 'active',
            startedAt,
            expiresAt,
            durationSeconds,
            totalMarks,
            questions: clientQuestions
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function finishExam(
  userId: string,
  attemptId: string,
  answers: Record<string, unknown>,
  timeTakenSeconds: number
) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId);
    if (!isUuid) {
        throw new Error('Attempt not found.');
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const attemptRes = await client.query(
            `SELECT * FROM exam_attempts WHERE id = $1 FOR UPDATE`,
            [attemptId]
        );

        if (attemptRes.rows.length === 0) {
            throw new Error('Attempt not found.');
        }

        const attempt = attemptRes.rows[0];

        if (attempt.user_id !== userId) {
            throw new Error('Access denied.');
        }

        if (attempt.status !== 'active') {
            throw new Error('Attempt is not active.');
        }

        if (attempt.exam_mode === ExamMode.SIMULATOR && attempt.expires_at) {
            const now = new Date();
            const expiresAt = new Date(attempt.expires_at);
            const deltaSeconds = (now.getTime() - expiresAt.getTime()) / 1000;

            if (deltaSeconds > 120) {
                await client.query(
                    `UPDATE exam_attempts SET status = 'expired', obtained_marks = NULL WHERE id = $1`,
                    [attemptId]
                );
                await client.query('COMMIT');
                throw new Error('EXAM_EXPIRED');
            } else if (deltaSeconds > 0) {
                await client.query(
                    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
                     VALUES ($1, 'exam_finish_grace_accepted', 'exam_attempts', $2, $3)`,
                    [
                        userId, 
                        attemptId, 
                        JSON.stringify({ 
                            attempt_id: attemptId, 
                            expires_at: expiresAt.toISOString(), 
                            received_at: now.toISOString(), 
                            delta_seconds: deltaSeconds 
                        })
                    ]
                );
            }
        }

        const aqRes = await client.query(
            `SELECT * FROM exam_attempt_questions WHERE attempt_id = $1`,
            [attemptId]
        );

        const validQuestionIds = new Set(aqRes.rows.map(aq => aq.question_id));
        for (const submittedId of Object.keys(answers)) {
            if (!validQuestionIds.has(submittedId)) {
                throw new Error(`UNKNOWN_QUESTION_ID: Question '${submittedId}' does not belong to attempt '${attemptId}'.`);
            }
        }

        let totalObtained = 0;
        let requiresManual = false;
        const details = [];
        
        const ansValues: unknown[] = [];
        const ansPlaceholders: string[] = [];

        for (const aq of aqRes.rows) {
            const dbSnapshot = aq.question_snapshot;
            const studentAnswer = answers[aq.question_id] || null;

            let obtainedMarks = 0;
            let status: GradingStatus = GradingStatus.PENDING;

            let validatedAnswer = studentAnswer;

            if (studentAnswer) {
                if (dbSnapshot.question_type === QuestionType.MULTIPLE_CHOICE) {
                    const validation = validateMcqAnswer(studentAnswer, dbSnapshot.content);
                    if (!validation.valid) {
                        console.warn(`[Invalid MCQ Payload] Attempt: ${attemptId} | Question: ${aq.question_id} | Errors:`, validation.errors);
                        validatedAnswer = null; // Mark invalid MCQ answers as null to trigger 0 marks and safe storage
                    }
                } else {
                    const validation = validateQuestionAnswer(dbSnapshot.question_type as keyof typeof AnswerSchemas, studentAnswer);
                    if (!validation.valid) {
                        console.warn(`[Invalid Answer Payload] Attempt: ${attemptId} | Question: ${aq.question_id} | Type: ${dbSnapshot.question_type}`);
                        validatedAnswer = null; // Mark invalid answers as null to trigger 0 marks and safe storage
                    }
                }
            }

            if (validatedAnswer) {
                const gradeResult = autoGrade(
                    dbSnapshot.question_type as QuestionType,
                    dbSnapshot.content,
                    dbSnapshot.correct_answer,
                    validatedAnswer,
                    Number(aq.marks)
                );
                obtainedMarks = gradeResult.obtainedMarks;
                status = gradeResult.gradingStatus;
            } else {
                 status = GradingStatus.AUTO_GRADED;
            }

            if (status === GradingStatus.MANUAL_PENDING || status === GradingStatus.MIXED) {
                requiresManual = true;
            }

            totalObtained += obtainedMarks;

            ansValues.push(
                attemptId, 
                aq.id, 
                validatedAnswer ? JSON.stringify(validatedAnswer) : '{}', 
                status, 
                obtainedMarks, 
                'system'
            );
            const ansOffset = ansValues.length - 6;
            ansPlaceholders.push(`($${ansOffset + 1}, $${ansOffset + 2}, $${ansOffset + 3}, $${ansOffset + 4}, $${ansOffset + 5}, $${ansOffset + 6})`);

            const maxMarks = Number(aq.marks);
            details.push({
                questionId: aq.question_id,
                isCorrect: obtainedMarks === maxMarks,
                obtainedMarks,
                maxMarks
            });
        }

        if (ansPlaceholders.length > 0) {
            await client.query(
                `INSERT INTO exam_answers
                 (attempt_id, attempt_question_id, answer, grading_status, obtained_marks, grader_type)
                 VALUES ${ansPlaceholders.join(',')}`,
                ansValues
            );
        }

        const finalStatus = requiresManual ? 'pending_review' : 'auto_complete';

        await client.query(
            `UPDATE exam_attempts
             SET status = 'submitted', submitted_at = NOW(), obtained_marks = $1
             WHERE id = $2`,
            [totalObtained, attemptId]
        );

        await client.query('COMMIT');

        return {
            attemptId,
            status: 'submitted',
            gradingStatus: finalStatus,
            result: {
                totalMarks: Number(attempt.total_marks),
                obtainedMarks: totalObtained,
                percentage: Number(attempt.total_marks) > 0 ? (totalObtained / Number(attempt.total_marks)) * 100 : 0
            },
            details
        };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

export async function getExamResult(userId: string, attemptId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attemptId);
    if (!isUuid) {
        throw new Error('Attempt not found.');
    }
    const client = await pool.connect();
    try {
        const attemptRes = await client.query(
            `SELECT * FROM exam_attempts WHERE id = $1`,
            [attemptId]
        );
        if (attemptRes.rows.length === 0) {
            throw new Error('Attempt not found.');
        }
        const attempt = attemptRes.rows[0];
        if (attempt.user_id !== userId) {
            throw new Error('Access denied.');
        }

        const aqRes = await client.query(
            `SELECT eq.question_id, ea.obtained_marks, eq.marks, ea.grading_status 
             FROM exam_attempt_questions eq
             LEFT JOIN exam_answers ea ON ea.attempt_question_id = eq.id
             WHERE eq.attempt_id = $1`,
            [attemptId]
        );

        let finalStatus = 'auto_complete';
        const details = aqRes.rows.map(row => {
            const obtainedMarks = row.obtained_marks === null ? null : Number(row.obtained_marks);
            const maxMarks = Number(row.marks);
            if (row.grading_status === 'pending_review' || row.grading_status === 'mixed') {
                finalStatus = 'pending_review';
            }
            return {
                questionId: row.question_id,
                isCorrect: obtainedMarks === maxMarks,
                obtainedMarks,
                maxMarks
            };
        });

        const totalObtained = attempt.obtained_marks === null ? null : Number(attempt.obtained_marks);
        const totalMarks = Number(attempt.total_marks);

        return {
            attemptId,
            status: attempt.status,
            gradingStatus: attempt.status === 'expired' ? 'auto_complete' : finalStatus,
            result: {
                totalMarks,
                obtainedMarks: totalObtained,
                percentage: (totalObtained !== null && totalMarks > 0) ? (totalObtained / totalMarks) * 100 : null
            },
            details
        };
    } finally {
        client.release();
    }
}
