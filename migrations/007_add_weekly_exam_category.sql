-- Migration 007: Support 'weekly' exam_category in training_exam_sets for Weekly Simulations
-- Enables explicit DB-level tagging of training sets as "weekly" for self-assessed fill_blank interaction.

ALTER TABLE training_exam_sets DROP CONSTRAINT IF EXISTS check_exam_year;
ALTER TABLE training_exam_sets DROP CONSTRAINT IF EXISTS training_exam_sets_exam_category_check;

ALTER TABLE training_exam_sets 
  ADD CONSTRAINT training_exam_sets_exam_category_check 
  CHECK (exam_category IN ('general', 'year', 'weekly'));

ALTER TABLE training_exam_sets 
  ADD CONSTRAINT check_exam_year CHECK (
    ((exam_category IN ('general', 'weekly')) AND exam_year IS NULL) OR
    (exam_category = 'year' AND exam_year IS NOT NULL)
  );
