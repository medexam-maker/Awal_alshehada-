/**
 * IndexedDB Local Storage for Sudan Secondary Certificate Exams
 * Complies with PD-002 and C5 §62 (Rule 4):
 * - Guarantees zero-request local answer persistence.
 * - Survives page refreshes, tab closures, and network drops.
 * - Ensures local answers are never lost upon network or auth failure.
 */

export interface StoredAttempt {
  attemptId: string;
  subjectId: string;
  subjectSlug?: string;
  subjectNameAr?: string;
  examMode: 'training' | 'simulator';
  bankType: 'comprehensive' | 'training';
  trainingSubMode?: 'yearly' | 'curriculum_review' | 'weekly';
  isWeeklySimulation?: boolean;
  examYear?: number;
  questions: any[];
  expiresAt: string | null;
  startedAt: string;
  totalQuestions: number;
  totalPoints: number;
  answers: Record<string, any>;
  lastSavedAt: string;
}

const DB_NAME = 'FirstCertificate_ExamDB';
const DB_VERSION = 1;
const STORE_ATTEMPTS = 'attempts';
const STORE_METADATA = 'metadata';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this browser environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        db.createObjectStore(STORE_ATTEMPTS, { keyPath: 'attemptId' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const examStorage = {
  async saveLocalAttempt(attempt: StoredAttempt): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_ATTEMPTS, STORE_METADATA], 'readwrite');
      const attemptStore = tx.objectStore(STORE_ATTEMPTS);
      const metaStore = tx.objectStore(STORE_METADATA);

      attemptStore.put(attempt);
      metaStore.put({ key: 'active_attempt_id', value: attempt.attemptId });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getLocalAttempt(attemptId: string): Promise<StoredAttempt | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const request = store.get(attemptId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async getActiveAttemptId(): Promise<string | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const request = store.get('active_attempt_id');

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveAnswer(attemptId: string, questionId: string, answer: any): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
      const store = tx.objectStore(STORE_ATTEMPTS);
      const getReq = store.get(attemptId);

      getReq.onsuccess = () => {
        const attempt = getReq.result as StoredAttempt | undefined;
        if (attempt) {
          attempt.answers = attempt.answers || {};
          attempt.answers[questionId] = answer;
          attempt.lastSavedAt = new Date().toISOString();
          store.put(attempt);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearActiveAttempt(attemptId: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_ATTEMPTS, STORE_METADATA], 'readwrite');
      tx.objectStore(STORE_ATTEMPTS).delete(attemptId);
      tx.objectStore(STORE_METADATA).delete('active_attempt_id');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
