
import ieltsAttempt from "../../models/ielts/ieltsAttempt.js";
import ieltsQuestion from "../../models/ielts/Questions.js";

export const calculateReadingBand = (
  rawScore
) => {
  const score = Number(rawScore);

  if (score >= 39) return 9;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8;
  if (score >= 33) return 7.5;
  if (score >= 30) return 7;
  if (score >= 27) return 6.5;
  if (score >= 23) return 6;
  if (score >= 19) return 5.5;
  if (score >= 15) return 5;
  if (score >= 13) return 4.5;
  if (score >= 10) return 4;

  return 0;
};

export const calculateListeningBand = (
  rawScore
) => {
  const score = Number(rawScore);

  if (score >= 39) return 9;
  if (score >= 37) return 8.5;
  if (score >= 35) return 8;
  if (score >= 32) return 7.5;
  if (score >= 30) return 7;
  if (score >= 26) return 6.5;
  if (score >= 23) return 6;
  if (score >= 18) return 5.5;
  if (score >= 16) return 5;
  if (score >= 13) return 4.5;
  if (score >= 11) return 4;

  return 0;
};

export const calculateOverallBand = ({
  reading,
  listening,
  writing,
  speaking,
}) => {
  const scores = [
    reading,
    listening,
    writing,
    speaking,
  ].filter(
    (score) =>
      typeof score === "number" &&
      score > 0
  );

  /*
   * Don't calculate final overall band
   * until all four sections have scores.
   */
  if (scores.length !== 4) {
    return null;
  }

  const average =
    scores.reduce(
      (sum, score) => sum + score,
      0
    ) / 4;

  const floor = Math.floor(average);
  const decimal =
    Number((average - floor).toFixed(2));

  if (decimal < 0.25) {
    return floor;
  }

  if (decimal < 0.75) {
    return floor + 0.5;
  }

  return floor + 1;
};

const normalizeAnswer = (answer) => {
  if (Array.isArray(answer)) {
    return answer
      .map((item) =>
        String(item)
          .trim()
          .toLowerCase()
      )
      .sort();
  }

  return String(answer ?? "")
    .trim()
    .toLowerCase();
};

const answersEqual = (userAnswer, correctAnswer) => {
  const user = normalizeAnswer(userAnswer);

  const correct =
    normalizeAnswer(correctAnswer);

  return JSON.stringify(user) ===
    JSON.stringify(correct);
};

export const evaluateIeltsAttempt = async (
  attemptId
) => {
  const attempt =
    await ieltsAttempt.findById(attemptId);

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  /*
   * Get all questions used by attempt
   */
  const questionIds = [];

  for (const section of attempt.sections) {
    for (const group of section.groups) {
      for (const question of group.questions) {
        questionIds.push(question.question);
      }
    }
  }

  const questions =
    await ieltsQuestion.find({
      _id: {
        $in: questionIds,
      },
    })
      .select(
        "_id section questionType correctAnswer marks"
      )
      .lean();

  const questionMap = new Map(
    questions.map((question) => [
      String(question._id),
      question,
    ])
  );

  /*
   * Overall counters
   */
  let overallTotal = 0;
  let overallAttempted = 0;
  let overallCorrect = 0;
  let overallIncorrect = 0;
  let overallSkipped = 0;
  let overallTime = 0;

  /*
   * Evaluate each section
   */
  for (const section of attempt.sections) {
    let totalQuestions = 0;
    let attemptedQuestions = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let skippedQuestions = 0;
    let rawScore = 0;
    let timeSpent = 0;

    const isObjective =
      section.section === "reading" ||
      section.section === "listening";

    for (const group of section.groups) {
      for (const questionAttempt of group.questions) {
        totalQuestions++;

        timeSpent +=
          questionAttempt.timeSpent || 0;

        const question =
          questionMap.get(
            String(questionAttempt.question)
          );

        if (!question) {
          continue;
        }

        const hasAnswer =
          questionAttempt.answer !== null &&
          questionAttempt.answer !== undefined &&
          questionAttempt.answer !== "" &&
          !(
            Array.isArray(questionAttempt.answer) &&
            questionAttempt.answer.length === 0
          );

        questionAttempt.skipped = !hasAnswer;

        if (!hasAnswer) {
          skippedQuestions++;

          questionAttempt.isCorrect =
            false;

          questionAttempt.obtainedMarks = 0;

          continue;
        }

        attemptedQuestions++;

        if (isObjective) {
          const correct =
            answersEqual(
              questionAttempt.answer,
              question.correctAnswer
            );

          questionAttempt.isCorrect =
            correct;

          questionAttempt.obtainedMarks =
            correct
              ? question.marks || 1
              : 0;

          if (correct) {
            correctAnswers++;
            rawScore +=
              questionAttempt.obtainedMarks;
          } else {
            incorrectAnswers++;
          }
        }

        else {
          questionAttempt.isCorrect = null;
        }
      }
    }

    const accuracy =
      attemptedQuestions > 0
        ? Number(
            (
              (correctAnswers /
                attemptedQuestions) *
              100
            ).toFixed(2)
          )
        : 0;

    const averageTimePerQuestion =
      totalQuestions > 0
        ? Math.round(
            timeSpent / totalQuestions
          )
        : 0;

    /*
     * Section analysis
     */
    section.analysis = {
      rawScore,

      totalQuestions,

      attemptedQuestions,

      correctAnswers,

      incorrectAnswers,

      skippedQuestions,

      accuracy,

      timeSpent,

      averageTimePerQuestion,

      aiScore:
        section.analysis?.aiScore ?? null,

      feedback:
        section.analysis?.feedback ?? null,

      strengths:
        section.analysis?.strengths,

      weaknesses:
        section.analysis?.weaknesses,
    };

    /*
     * Band score
     */
    if (section.section === "reading") {
      section.analysis.bandScore =
        calculateReadingBand(rawScore);
    }

    if (section.section === "listening") {
      section.analysis.bandScore =
        calculateListeningBand(rawScore);
    }

    /*
     * Overall counters
     */
    overallTotal += totalQuestions;
    overallAttempted += attemptedQuestions;
    overallCorrect += correctAnswers;
    overallIncorrect += incorrectAnswers;
    overallSkipped += skippedQuestions;
    overallTime += timeSpent;
  }

  /*
   * Section bands
   */
  const readingSection =
    attempt.sections.find(
      (section) =>
        section.section === "reading"
    );

  const listeningSection =
    attempt.sections.find(
      (section) =>
        section.section === "listening"
    );

  const writingSection =
    attempt.sections.find(
      (section) =>
        section.section === "writing"
    );

  const speakingSection =
    attempt.sections.find(
      (section) =>
        section.section === "speaking"
    );

  attempt.score.reading =
    readingSection?.analysis?.bandScore ??
    null;

  attempt.score.listening =
    listeningSection?.analysis?.bandScore ??
    null;

  attempt.score.writing =
    writingSection?.analysis?.bandScore ??
    null;

  attempt.score.speaking =
    speakingSection?.analysis?.bandScore ??
    null;

  /*
   * Overall band
   *
   * If Writing/Speaking are not evaluated yet,
   * overall will remain null.
   */
  attempt.score.overall =
    calculateOverallBand({
      reading: attempt.score.reading,
      listening: attempt.score.listening,
      writing: attempt.score.writing,
      speaking: attempt.score.speaking,
    });

  /*
   * Overall analysis
   */
  attempt.analysis = {
    totalQuestions: overallTotal,

    attemptedQuestions: overallAttempted,

    correctAnswers: overallCorrect,

    incorrectAnswers: overallIncorrect,

    skippedQuestions: overallSkipped,

    accuracy:
      overallAttempted > 0
        ? Number(
            (
              (overallCorrect /
                overallAttempted) *
              100
            ).toFixed(2)
          )
        : 0,

    totalTimeSpent: overallTime,

    averageTimePerQuestion:
      overallTotal > 0
        ? Math.round(
            overallTime / overallTotal
          )
        : 0,

    readingBand: attempt.score.reading,

    listeningBand: attempt.score.listening,

    writingBand: attempt.score.writing,

    speakingBand: attempt.score.speaking,

    overallBand: attempt.score.overall,

    summary:
      attempt.analysis?.summary ?? null,

    strengths:
      attempt.analysis?.strengths,

    weaknesses:
      attempt.analysis?.weaknesses,

    recommendations:
      attempt.analysis?.recommendations,
  };

  attempt.status = "completed";

  attempt.completedAt = new Date();

  attempt.lastActivityAt = new Date();

  await attempt.save();

  return attempt;
};