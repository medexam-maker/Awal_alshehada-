import { pool } from '../db/index';
import { createClientSnapshot } from './snapshot';
import { ExamMode } from '../../shared/constants';

export async function getActiveAttempt(userId: string, subjectId: string) {
    const attemptRes = await pool.query(
        `SELECT ea.*, (tes.exam_category = 'weekly') AS is_weekly
         FROM exam_attempts ea
         LEFT JOIN training_exam_sets tes ON tes.id = ea.training_set_id
         WHERE ea.user_id = $1 AND ea.subject_id = $2 AND ea.status = 'active'`,
        [userId, subjectId]
    );

    if (attemptRes.rows.length === 0) {
        return null;
    }

    const attempt = attemptRes.rows[0];

    if (attempt.exam_mode === ExamMode.SIMULATOR && attempt.expires_at) {
        const now = new Date();
        const expiresAt = new Date(attempt.expires_at);
        const deltaSeconds = (now.getTime() - expiresAt.getTime()) / 1000;
        
        if (deltaSeconds > 120) {
            await pool.query(
                `UPDATE exam_attempts SET status = 'expired', obtained_marks = NULL WHERE id = $1`,
                [attempt.id]
            );
            return null; // Return null effectively forcing a new state as this is now expired
        }
    }

    const questionsRes = await pool.query(
        `SELECT * FROM exam_attempt_questions
         WHERE attempt_id = $1 ORDER BY position ASC`,
        [attempt.id]
    );

    // In a strict Zero-Request Exam Flow, no intermediate answers are submitted to the server.
    // The server only recovers the client questions, and the frontend relies on its own local persistence 
    // to hydrate the answers back into the UI.
    const savedAnswers: Record<string, unknown> = {};

    const isWeeklySimulation = Boolean(attempt.is_weekly && attempt.exam_mode === ExamMode.SIMULATOR);
    const clientQuestions = questionsRes.rows.map(q => {
        const snap = typeof q.question_snapshot === 'string'
            ? JSON.parse(q.question_snapshot)
            : q.question_snapshot;
        return createClientSnapshot(snap, attempt.exam_mode as ExamMode, q.position, isWeeklySimulation);
    });

    return {
        attemptId: attempt.id,
        examMode: attempt.exam_mode,
        status: attempt.status,
        startedAt: attempt.started_at,
        expiresAt: attempt.expires_at,
        totalMarks: Number(attempt.total_marks),
        questions: clientQuestions,
        answers: savedAnswers
    };
}


