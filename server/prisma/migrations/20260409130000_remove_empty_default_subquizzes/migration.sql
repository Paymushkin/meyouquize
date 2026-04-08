-- Удаляем пустые сабквизы с дефолтным названием (старый createRoom, INSERT из nested_subquizzes, дефолт Prisma).
DELETE FROM "SubQuiz" sq
WHERE sq."title" IN ('Квиз 1', 'Квиз')
  AND NOT EXISTS (
    SELECT 1 FROM "Question" q WHERE q."subQuizId" = sq."id"
  );
