import mongoose from "mongoose";

import ieltsTest from "../../models/ielts/ieltsTest.js";
import ieltsQuestion from "../../models/ielts/Questions.js";
import ieltsAttempt from "../../models/ielts/ieltsAttempt.js";
import ieltsGroupQuestion from "../../models/ielts/Grouped.js";

const { Types } = mongoose;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) => Types.ObjectId.isValid(id);

const toObjectId = (id) => new Types.ObjectId(id);

/**
 * Get sections in the actual order defined by the test.
 */
const getOrderedSections = (test) => {
  return [...(test.sections || [])].sort((a, b) => a.order - b.order);
};

/**
 * Find a section inside test.
 */
const getTestSection = (test, sectionName) => {
  return test.sections.find((section) => section.section === sectionName);
};

/**
 * Get next section based on test order.
 *
 * If current section is "reading" and actual order is:
 * listening -> reading -> writing -> speaking
 *
 * next = writing
 */
const getNextSection = (test, currentSection) => {
  const sections = getOrderedSections(test);

  const currentIndex = sections.findIndex(
    (section) => section.section === currentSection,
  );

  if (currentIndex === -1) {
    return null;
  }

  return sections[currentIndex + 1] || null;
};

/**
 * Get previous section.
 */
const getPreviousSection = (test, currentSection) => {
  const sections = getOrderedSections(test);

  const currentIndex = sections.findIndex(
    (section) => section.section === currentSection,
  );

  if (currentIndex <= 0) {
    return null;
  }

  return sections[currentIndex - 1];
};

/**
 * Find attempt section.
 */
const getAttemptSection = (attempt, sectionName) => {
  return attempt.sections.find((section) => section.section === sectionName);
};

/**
 * Find attempt group.
 */
const getAttemptGroup = (attemptSection, groupId) => {
  return attemptSection.groups.find(
    (group) => group.group.toString() === groupId.toString(),
  );
};

/**
 * Find attempt question set.
 */
const getAttemptQuestionSet = (attemptGroup, questionSetId) => {
  return attemptGroup.questionSets.find(
    (set) => set.questionSetId.toString() === questionSetId.toString(),
  );
};

/**
 * Get question from database.
 */
const getQuestionMap = async (questionIds) => {
  if (!questionIds.length) {
    return new Map();
  }

  const questions = await ieltsQuestion
    .find({
      _id: { $in: questionIds },
    })
    .lean();

  return new Map(
    questions.map((question) => [question._id.toString(), question]),
  );
};

/**
 * Check answer against current question.
 *
 * This supports your current question structure:
 *
 * correctAnswer
 * correctChoiceLabel
 * choices[].isCorrect
 */
const evaluateAnswer = (question, answer) => {
  if (answer === null || answer === undefined || answer === "") {
    return {
      isCorrect: false,
      obtainedMarks: 0,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | MCQ / choice based
  |--------------------------------------------------------------------------
  */

  if (
    question.correctChoiceLabel !== null &&
    question.correctChoiceLabel !== undefined
  ) {
    if (Array.isArray(answer)) {
      const submitted = [...answer].map(String).sort();

      const correct =
        question.choices
          ?.filter((choice) => choice.isCorrect)
          .map((choice) => choice.label)
          .sort() || [];

      const isCorrect =
        submitted.length === correct.length &&
        submitted.every((value, index) => value === correct[index]);

      return {
        isCorrect,
        obtainedMarks: isCorrect ? question.marks || 1 : 0,
      };
    }

    const isCorrect = String(answer) === String(question.correctChoiceLabel);

    return {
      isCorrect,
      obtainedMarks: isCorrect ? question.marks || 1 : 0,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | correctAnswer based
  |--------------------------------------------------------------------------
  */

  if (Array.isArray(question.correctAnswer)) {
    const submitted = Array.isArray(answer)
      ? answer.map(String).sort()
      : [String(answer)];

    const correct = question.correctAnswer.map(String).sort();

    const isCorrect =
      submitted.length === correct.length &&
      submitted.every((value, index) => value === correct[index]);

    return {
      isCorrect,
      obtainedMarks: isCorrect ? question.marks || 1 : 0,
    };
  }

  if (question.correctAnswer !== null && question.correctAnswer !== undefined) {
    const submitted = String(answer).trim().toLowerCase();

    const correct = String(question.correctAnswer).trim().toLowerCase();

    const isCorrect = submitted === correct;

    return {
      isCorrect,
      obtainedMarks: isCorrect ? question.marks || 1 : 0,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Writing / Speaking
  |--------------------------------------------------------------------------
  |
  | These should normally be evaluated later by AI/manual.
  */

  return {
    isCorrect: null,
    obtainedMarks: 0,
  };
};

/**
 * Recalculate section statistics.
 */
const calculateSectionAnalysis = (sectionAttempt) => {
  const questions = [];

  for (const group of sectionAttempt.groups || []) {
    for (const questionSet of group.questionSets || []) {
      questions.push(...(questionSet.questions || []));
    }
  }

  const totalQuestions = questions.length;

  const attemptedQuestions = questions.filter(
    (question) =>
      question.answer !== null &&
      question.answer !== undefined &&
      question.answer !== "",
  ).length;

  const skippedQuestions = questions.filter(
    (question) => question.skipped,
  ).length;

  const correctAnswers = questions.filter(
    (question) => question.isCorrect === true,
  ).length;

  const incorrectAnswers = questions.filter(
    (question) => question.isCorrect === false && !question.skipped,
  ).length;

  const rawScore = questions.reduce(
    (total, question) => total + (question.obtainedMarks || 0),
    0,
  );

  const timeSpent = sectionAttempt.groups.reduce(
    (total, group) => total + (group.timeSpent || 0),
    0,
  );

  const accuracy =
    attemptedQuestions > 0
      ? Number(((correctAnswers / attemptedQuestions) * 100).toFixed(2))
      : 0;

  const averageTimePerQuestion =
    totalQuestions > 0 ? Number((timeSpent / totalQuestions).toFixed(2)) : 0;

  sectionAttempt.analysis = {
    ...sectionAttempt.analysis?.toObject?.(),
    rawScore,
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    skippedQuestions,
    accuracy,
    timeSpent,
    averageTimePerQuestion,
  };

  return sectionAttempt;
};

/**
 * Recalculate overall statistics.
 */
const calculateOverallAnalysis = (attempt) => {
  const sections = attempt.sections || [];

  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let skippedQuestions = 0;
  let totalTimeSpent = 0;

  for (const section of sections) {
    const analysis = section.analysis || {};

    totalQuestions += analysis.totalQuestions || 0;
    attemptedQuestions += analysis.attemptedQuestions || 0;

    correctAnswers += analysis.correctAnswers || 0;

    incorrectAnswers += analysis.incorrectAnswers || 0;

    skippedQuestions += analysis.skippedQuestions || 0;

    totalTimeSpent += analysis.timeSpent || 0;
  }

  const accuracy =
    attemptedQuestions > 0
      ? Number(((correctAnswers / attemptedQuestions) * 100).toFixed(2))
      : 0;

  const averageTimePerQuestion =
    totalQuestions > 0
      ? Number((totalTimeSpent / totalQuestions).toFixed(2))
      : 0;

  attempt.analysis = {
    ...attempt.analysis?.toObject?.(),

    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    skippedQuestions,
    accuracy,
    totalTimeSpent,
    averageTimePerQuestion,
  };

  return attempt;
};

/**
 * Build attempt structure from current test references.
 *
 * IMPORTANT:
 * We don't copy questions, choices, instructions etc.
 * We only store IDs.
 */
const initializeAttemptSections = (test) => {
  const orderedSections = getOrderedSections(test);

  return orderedSections.map((testSection) => ({
    section: testSection.section,
    order: testSection.order,
    duration: testSection.duration || 0,
    startedAt: null,
    completedAt: null,
    timeSpent: 0,
    status: "not_started",

    groups: (testSection.groups || [])
      .sort((a, b) => a.order - b.order)
      .map((groupReference) => ({
        group: groupReference.group,
        order: groupReference.order,
        startedAt: null,
        completedAt: null,
        timeSpent: 0,
        questionSets: [],
      })),

    analysis: {},
  }));
};

/**
 * Initialize one group from the current group document.
 *
 * Questions are NOT copied.
 * Only question IDs are stored.
 */
const initializeGroupQuestionSets = async (attemptGroup, group) => {
  attemptGroup.questionSets = (group.questionSets || []).map(
    (questionSet, index) => ({
      questionSetId: questionSet._id,
      order: index + 1,

      startedAt: null,
      completedAt: null,
      timeSpent: 0,

      questions: (questionSet.questions || []).map(
        (questionId, questionIndex) => ({
          question: questionId,
          order: questionIndex + 1,

          answer: null,
          isCorrect: null,
          obtainedMarks: 0,

          skipped: false,
          flagged: false,

          timeSpent: 0,
          answeredAt: null,

          evaluation: {},
        }),
      ),
    }),
  );

  return attemptGroup;
};

/*
|--------------------------------------------------------------------------
| 1. START TEST
|--------------------------------------------------------------------------
|
| User can:
|
| mode = "flow"
|    -> first section according to test order
|
| mode = "section"
| section = "reading"
|    -> directly start reading
|
|--------------------------------------------------------------------------
*/

export const startIeltsTest = async (req, res) => {
  try {
    const userId = req.user._id;

    const { testId, mode = "flow", section } = req.body;

    if (!isValidObjectId(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID",
      });
    }

    const test = await ieltsTest.findById(testId).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    if (test.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Test is not published",
      });
    }

    const orderedSections = getOrderedSections(test);

    if (!orderedSections.length) {
      return res.status(400).json({
        success: false,
        message: "Test has no sections",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine starting section
    |--------------------------------------------------------------------------
    */

    let startSection;

    if (mode === "section") {
      if (!section) {
        return res.status(400).json({
          success: false,
          message: "section is required when mode is section",
        });
      }

      startSection = orderedSections.find((item) => item.section === section);

      if (!startSection) {
        return res.status(400).json({
          success: false,
          message: `Section '${section}' does not exist in this test`,
        });
      }
    } else {
      startSection = orderedSections[0];
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate active attempts
    |--------------------------------------------------------------------------
    */

    let attempt = await ieltsAttempt.findOne({
      user: userId,
      test: testId,
      status: {
        $in: ["not_started", "in_progress", "paused"],
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Resume existing attempt
    |--------------------------------------------------------------------------
    */

    if (attempt) {
      attempt.currentSection = startSection.section;

      attempt.currentSectionIndex = orderedSections.findIndex(
        (item) => item.section === startSection.section,
      );

      attempt.lastActivityAt = new Date();

      if (attempt.status === "not_started") {
        attempt.status = "in_progress";
        attempt.startedAt = new Date();
      }

      await attempt.save();

      return res.status(200).json({
        success: true,
        message: "Existing attempt resumed",
        data: {
          attemptId: attempt._id,
          status: attempt.status,
          currentSection: attempt.currentSection,
          currentSectionIndex: attempt.currentSectionIndex,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create new attempt
    |--------------------------------------------------------------------------
    */

    const sections = initializeAttemptSections(test);

    const startSectionIndex = orderedSections.findIndex(
      (item) => item.section === startSection.section,
    );

    attempt = await ieltsAttempt.create({
      user: userId,
      test: testId,

      status: "in_progress",

      startedAt: new Date(),
      lastActivityAt: new Date(),
      lastSavedAt: new Date(),

      currentSection: startSection.section,

      currentSectionIndex: startSectionIndex,

      currentGroupIndex: 0,
      currentQuestionSetIndex: 0,
      currentQuestionIndex: 0,

      sections,
    });

    return res.status(201).json({
      success: true,
      message: "IELTS test started",
      data: {
        attemptId: attempt._id,
        testId,
        mode,
        currentSection: startSection.section,
        currentSectionIndex: startSectionIndex,
        totalSections: orderedSections.length,
      },
    });
  } catch (error) {
    console.error("startIeltsTest error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start IELTS test",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 2. GET CURRENT SECTION
|--------------------------------------------------------------------------
|
| Returns LIVE content from DB.
|
| No question snapshot.
|
|--------------------------------------------------------------------------
*/

export const getCurrentIeltsSection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID",
      });
    }

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    const test = await ieltsTest.findById(attempt.test).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const testSection = getTestSection(test, attempt.currentSection);

    if (!testSection) {
      return res.status(404).json({
        success: false,
        message: "Current section not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get groups LIVE from database
    |--------------------------------------------------------------------------
    */

    const groupIds = testSection.groups.map((item) => item.group);

    const groups = await ieltsGroupQuestion
      .find({
        _id: { $in: groupIds },
        isActive: true,
      })
      .populate({
        path: "passage",
      })
      .populate({
        path: "questionSets.questions",
        model: "ieltsQuestion",
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Preserve test group order
    |--------------------------------------------------------------------------
    */

    const groupMap = new Map(
      groups.map((group) => [group._id.toString(), group]),
    );

    const orderedGroups = testSection.groups
      .sort((a, b) => a.order - b.order)
      .map((reference) => {
        const group = groupMap.get(reference.group.toString());

        if (!group) return null;

        return {
          ...group,
          order: reference.order,
        };
      })
      .filter(Boolean);

    attempt.lastActivityAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,

        test: {
          _id: test._id,
          title: test.title,
          slug: test.slug,
        },

        section: {
          name: testSection.section,
          order: testSection.order,
          duration: testSection.duration,
          questionCount: testSection.questionCount,
        },

        currentGroupIndex: attempt.currentGroupIndex,

        currentQuestionSetIndex: attempt.currentQuestionSetIndex,

        currentQuestionIndex: attempt.currentQuestionIndex,

        groups: orderedGroups,
      },
    });
  } catch (error) {
    console.error("getCurrentIeltsSection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get current section",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 3. START SECTION
|--------------------------------------------------------------------------
|
| User can jump directly to:
|
| reading
| listening
| writing
| speaking
|
|--------------------------------------------------------------------------
*/

export const startIeltsSection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;
    const { section } = req.body;

    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID",
      });
    }

    if (!section) {
      return res.status(400).json({
        success: false,
        message: "Section is required",
      });
    }

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    if (["submitted", "completed", "abandoned"].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: "This attempt can no longer be modified",
      });
    }

    const test = await ieltsTest.findById(attempt.test).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const orderedSections = getOrderedSections(test);

    const sectionIndex = orderedSections.findIndex(
      (item) => item.section === section,
    );

    if (sectionIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "This section does not exist in this test",
      });
    }

    const attemptSection = getAttemptSection(attempt, section);

    if (!attemptSection) {
      return res.status(400).json({
        success: false,
        message: "Section is not initialized in attempt",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Start section
    |--------------------------------------------------------------------------
    */

    if (!attemptSection.startedAt) {
      attemptSection.startedAt = new Date();
    }

    attemptSection.status = "in_progress";

    attempt.currentSection = section;
    attempt.currentSectionIndex = sectionIndex;

    attempt.currentGroupIndex = 0;
    attempt.currentQuestionSetIndex = 0;
    attempt.currentQuestionIndex = 0;

    attempt.status = "in_progress";
    attempt.lastActivityAt = new Date();
    attempt.lastSavedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: `${section} section started`,
      data: {
        attemptId: attempt._id,
        section,
        sectionIndex,
        duration: orderedSections[sectionIndex].duration || 0,
        status: attemptSection.status,
      },
    });
  } catch (error) {
    console.error("startIeltsSection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start section",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 4. GET GROUP
|--------------------------------------------------------------------------
|
| Important:
| Content comes LIVE from group/question collections.
|
|--------------------------------------------------------------------------
*/

export const getIeltsGroup = async (req, res) => {
  try {
    const userId = req.user._id;

    const { attemptId, groupId } = req.params;

    if (!isValidObjectId(attemptId) || !isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    const group = await ieltsGroupQuestion
      .findById(groupId)
      .populate({
        path: "passage",
      })
      .populate({
        path: "questionSets.questions",
        model: "ieltsQuestion",
      })
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const sectionAttempt = getAttemptSection(attempt, attempt.currentSection);

    if (!sectionAttempt) {
      return res.status(400).json({
        success: false,
        message: "Current section not found in attempt",
      });
    }

    const attemptGroup = getAttemptGroup(sectionAttempt, groupId);

    if (!attemptGroup) {
      return res.status(400).json({
        success: false,
        message: "Group does not belong to current section",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Initialize question sets if not already initialized.
    |--------------------------------------------------------------------------
    */

    if (!attemptGroup.questionSets || attemptGroup.questionSets.length === 0) {
      await initializeGroupQuestionSets(attemptGroup, group);

      await attempt.save();
    }

    attemptGroup.startedAt = attemptGroup.startedAt || new Date();

    attempt.lastActivityAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        section: attempt.currentSection,

        group: {
          ...group,

          /*
          |--------------------------------------------------------------------------
          | User attempt information
          |--------------------------------------------------------------------------
          */

          attempt: {
            groupAttemptId: attemptGroup._id,

            startedAt: attemptGroup.startedAt,

            completedAt: attemptGroup.completedAt,

            timeSpent: attemptGroup.timeSpent,

            questionSets: attemptGroup.questionSets,
          },
        },
      },
    });
  } catch (error) {
    console.error("getIeltsGroup error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get group",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 5. SUBMIT GROUP
|--------------------------------------------------------------------------
|
| THIS IS THE MAIN SUBMISSION API.
|
| Client sends ALL answers for one group.
|
| Example:
|
| {
|   "groupId": "...",
|   "timeSpent": 420,
|   "answers": [
|     {
|       "questionId": "...",
|       "answer": "B",
|       "timeSpent": 20,
|       "flagged": false,
|       "skipped": false
|     }
|   ]
| }
|
|--------------------------------------------------------------------------
*/

export const submitIeltsGroup = async (req, res) => {
  try {
    const userId = req.user._id;

    const { attemptId, groupId } = req.params;

    const { answers = [], timeSpent = 0 } = req.body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!isValidObjectId(attemptId) || !isValidObjectId(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt or group ID",
      });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "answers must be an array",
      });
    }

    // --------------------------------------------------
    // LOAD ATTEMPT
    // --------------------------------------------------

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // --------------------------------------------------
    // CHECK ATTEMPT STATUS
    // --------------------------------------------------

    if (["submitted", "completed", "abandoned"].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: "Attempt cannot be modified",
      });
    }

    // --------------------------------------------------
    // GET CURRENT SECTION
    // --------------------------------------------------

    if (!attempt.currentSection) {
      return res.status(400).json({
        success: false,
        message: "No active section in this attempt",
      });
    }

    const sectionAttempt = getAttemptSection(attempt, attempt.currentSection);

    if (!sectionAttempt) {
      return res.status(400).json({
        success: false,
        message: `Section '${attempt.currentSection}' not found in attempt`,
      });
    }

    // --------------------------------------------------
    // LOAD LIVE GROUP
    // --------------------------------------------------

    const group = await ieltsGroupQuestion.findById(groupId).lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // --------------------------------------------------
    // VERIFY GROUP BELONGS TO CURRENT SECTION
    // --------------------------------------------------

    const attemptGroup = getAttemptGroup(sectionAttempt, groupId);

    if (!attemptGroup) {
      return res.status(400).json({
        success: false,
        message: "Group does not belong to current section",
      });
    }

    // --------------------------------------------------
    // INITIALIZE GROUP QUESTION SETS
    //
    // Only stores references to question sets/questions.
    // No question snapshot is created.
    // --------------------------------------------------

    if (!attemptGroup.questionSets || attemptGroup.questionSets.length === 0) {
      await initializeGroupQuestionSets(attemptGroup, group);
    }

    // --------------------------------------------------
    // GET LIVE QUESTIONS FROM CURRENT GROUP
    // --------------------------------------------------

    const questionIds = [];

    for (const questionSet of group.questionSets || []) {
      for (const questionId of questionSet.questions || []) {
        questionIds.push(questionId.toString());
      }
    }

    const questionMap = await getQuestionMap(questionIds);

    // --------------------------------------------------
    // CREATE ANSWER MAP
    //
    // Makes lookup O(1) instead of searching answers
    // for every question.
    // --------------------------------------------------

    const answerMap = new Map();

    for (const item of answers) {
      if (!item?.questionId) {
        continue;
      }

      answerMap.set(item.questionId.toString(), item);
    }

    // --------------------------------------------------
    // GROUP STATISTICS
    // --------------------------------------------------

    let groupCorrect = 0;
    let groupIncorrect = 0;
    let groupSkipped = 0;
    let groupAttempted = 0;
    let groupMarks = 0;

    // --------------------------------------------------
    // PROCESS ALL QUESTIONS IN GROUP
    //
    // Everything is updated in memory and saved once
    // at the end.
    // --------------------------------------------------

    for (const questionSet of attemptGroup.questionSets) {
      for (const questionAttempt of questionSet.questions) {
        const questionId = questionAttempt.question.toString();

        const question = questionMap.get(questionId);

        // Question was removed from DB
        if (!question) {
          continue;
        }

        const submitted = answerMap.get(questionId);

        // ------------------------------------------------
        // NO ANSWER SUBMITTED
        // ------------------------------------------------

        if (!submitted) {
          questionAttempt.answer = null;
          questionAttempt.skipped = true;
          questionAttempt.flagged = false;
          questionAttempt.isCorrect = false;
          questionAttempt.obtainedMarks = 0;
          questionAttempt.answeredAt = null;

          groupSkipped++;

          continue;
        }

        // ------------------------------------------------
        // SAVE USER ANSWER
        // ------------------------------------------------

        questionAttempt.answer = submitted.answer ?? null;

        questionAttempt.skipped = Boolean(submitted.skipped);

        questionAttempt.flagged = Boolean(submitted.flagged);

        questionAttempt.timeSpent = Number(submitted.timeSpent || 0);

        questionAttempt.answeredAt = new Date();

        // ------------------------------------------------
        // EXPLICITLY SKIPPED
        // ------------------------------------------------

        if (submitted.skipped) {
          questionAttempt.isCorrect = false;
          questionAttempt.obtainedMarks = 0;

          groupSkipped++;

          continue;
        }

        // ------------------------------------------------
        // EMPTY ANSWER
        // ------------------------------------------------

        const isEmptyAnswer =
          submitted.answer === null ||
          submitted.answer === undefined ||
          submitted.answer === "";

        if (isEmptyAnswer) {
          questionAttempt.isCorrect = false;
          questionAttempt.obtainedMarks = 0;
          questionAttempt.skipped = true;

          groupSkipped++;

          continue;
        }

        // ------------------------------------------------
        // EVALUATE ANSWER
        // ------------------------------------------------

        const result = evaluateAnswer(question, submitted.answer);

        questionAttempt.isCorrect = result.isCorrect;

        questionAttempt.obtainedMarks = result.obtainedMarks || 0;

        // ------------------------------------------------
        // STATISTICS
        // ------------------------------------------------

        groupAttempted++;

        groupMarks += result.obtainedMarks || 0;

        if (result.isCorrect === true) {
          groupCorrect++;
        } else {
          groupIncorrect++;
        }
      }

      // ------------------------------------------------
      // QUESTION SET TIMING
      // ------------------------------------------------

      questionSet.completedAt = new Date();

      questionSet.timeSpent = questionSet.questions.reduce(
        (total, question) => total + (question.timeSpent || 0),
        0,
      );
    }

    // --------------------------------------------------
    // GROUP COMPLETED
    // --------------------------------------------------

    attemptGroup.completedAt = new Date();

    attemptGroup.timeSpent = Number(timeSpent || 0);

    // If you added status to groupAttemptSchema
    // then keep this line.
    if ("status" in attemptGroup) {
      attemptGroup.status = "completed";
    }

    // --------------------------------------------------
    // GROUP ANALYSIS
    //
    // If group analysis exists in your schema,
    // store the calculated stats there.
    // --------------------------------------------------

    if (attemptGroup.analysis) {
      attemptGroup.analysis.totalQuestions = questionIds.length;

      attemptGroup.analysis.attemptedQuestions = groupAttempted;

      attemptGroup.analysis.correctAnswers = groupCorrect;

      attemptGroup.analysis.incorrectAnswers = groupIncorrect;

      attemptGroup.analysis.skippedQuestions = groupSkipped;

      attemptGroup.analysis.rawScore = groupMarks;

      attemptGroup.analysis.accuracy =
        groupAttempted > 0
          ? Number(((groupCorrect / groupAttempted) * 100).toFixed(2))
          : 0;

      attemptGroup.analysis.timeSpent = attemptGroup.timeSpent;

      attemptGroup.analysis.averageTimePerQuestion =
        questionIds.length > 0
          ? Number((attemptGroup.timeSpent / questionIds.length).toFixed(2))
          : 0;
    }

    // --------------------------------------------------
    // CHECK WHETHER ALL GROUPS ARE COMPLETED
    // --------------------------------------------------

    const allGroupsCompleted =
      sectionAttempt.groups.length > 0 &&
      sectionAttempt.groups.every((groupItem) => groupItem.completedAt);

    // --------------------------------------------------
    // SECTION COMPLETION
    // --------------------------------------------------

    if (allGroupsCompleted) {
      sectionAttempt.completedAt = new Date();

      sectionAttempt.status = "completed";
    } else {
      sectionAttempt.status = "in_progress";
    }

    // --------------------------------------------------
    // SECTION TIME
    // --------------------------------------------------

    sectionAttempt.timeSpent = sectionAttempt.groups.reduce(
      (total, groupItem) => total + (groupItem.timeSpent || 0),
      0,
    );

    // --------------------------------------------------
    // SECTION ANALYSIS
    // --------------------------------------------------

    calculateSectionAnalysis(sectionAttempt);

    // --------------------------------------------------
    // OVERALL ANALYSIS
    // --------------------------------------------------

    calculateOverallAnalysis(attempt);

    // --------------------------------------------------
    // GET ORDERED GROUPS
    // --------------------------------------------------

    const orderedGroups = [...sectionAttempt.groups].sort(
      (a, b) => a.order - b.order,
    );

    const currentGroupIndex = orderedGroups.findIndex(
      (item) => item.group.toString() === groupId.toString(),
    );

    // --------------------------------------------------
    // FIND NEXT GROUP
    // --------------------------------------------------

    const nextGroup = orderedGroups[currentGroupIndex + 1] || null;

    // --------------------------------------------------
    // FIND NEXT SECTION
    //
    // IMPORTANT:
    // We only calculate the next section here.
    // We do NOT automatically start it.
    // --------------------------------------------------

    let nextSection = null;

    if (allGroupsCompleted) {
      const test = await ieltsTest.findById(attempt.test).lean();

      if (test) {
        nextSection = getNextSection(test, attempt.currentSection);
      }
    }

    // --------------------------------------------------
    // UPDATE CURSOR
    // --------------------------------------------------

    if (nextGroup) {
      // Continue inside same section

      attempt.currentGroupIndex = currentGroupIndex + 1;

      attempt.currentQuestionSetIndex = 0;
      attempt.currentQuestionIndex = 0;
    } else if (allGroupsCompleted) {
      // ------------------------------------------------
      // CURRENT SECTION FINISHED
      // ------------------------------------------------

      if (nextSection) {
        const nextSectionIndex = attempt.sections.findIndex(
          (sectionItem) => sectionItem.section === nextSection.section,
        );

        /*
         * IMPORTANT:
         *
         * We update the cursor but do not mark
         * the next section as started.
         *
         * Frontend can ask user:
         *
         * "Continue with Listening?"
         *
         * or allow them to choose another section.
         */

        attempt.currentSection = nextSection.section;

        attempt.currentSectionIndex = nextSectionIndex;

        attempt.currentGroupIndex = 0;
        attempt.currentQuestionSetIndex = 0;
        attempt.currentQuestionIndex = 0;
      } else {
        // ------------------------------------------------
        // ALL SECTIONS COMPLETED
        // ------------------------------------------------

        attempt.currentSection = null;

        attempt.currentSectionIndex = -1;

        attempt.currentGroupIndex = 0;

        attempt.currentQuestionSetIndex = 0;

        attempt.currentQuestionIndex = 0;
      }
    }

    // --------------------------------------------------
    // ATTEMPT ACTIVITY
    // --------------------------------------------------

    attempt.lastActivityAt = new Date();

    attempt.lastSavedAt = new Date();

    // If attempt was not started yet,
    // mark it as in progress.
    if (attempt.status === "not_started") {
      attempt.status = "in_progress";

      if (!attempt.startedAt) {
        attempt.startedAt = new Date();
      }
    }

    // --------------------------------------------------
    // SAVE ONCE
    // --------------------------------------------------

    await attempt.save();

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,

      message: "IELTS group submitted successfully",

      data: {
        attemptId: attempt._id,

        group: {
          groupId,

          totalQuestions: questionIds.length,

          attemptedQuestions: groupAttempted,

          correctAnswers: groupCorrect,

          incorrectAnswers: groupIncorrect,

          skippedQuestions: groupSkipped,

          rawScore: groupMarks,

          timeSpent: attemptGroup.timeSpent,
        },

        section: {
          section: sectionAttempt.section,

          status: sectionAttempt.status,

          completed: allGroupsCompleted,

          analysis: sectionAttempt.analysis,
        },

        next: {
          group: nextGroup
            ? {
                groupId: nextGroup.group,

                order: nextGroup.order,
              }
            : null,

          section: nextSection
            ? {
                section: nextSection.section,

                order: nextSection.order,
              }
            : null,

          sectionCompleted: allGroupsCompleted,

          testCompleted: !nextGroup && !nextSection,
        },

        overall: {
          score: attempt.score,

          analysis: attempt.analysis,
        },
      },
    });
  } catch (error) {
    console.error("submitIeltsGroup error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit IELTS group",
      error: error.message,
    });
  }
};
/*
|--------------------------------------------------------------------------
| 6. START NEXT SECTION
|--------------------------------------------------------------------------
|
| Used after completing a section.
|
|--------------------------------------------------------------------------
*/

export const startNextIeltsSection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID",
      });
    }

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    const test = await ieltsTest.findById(attempt.test).lean();

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const nextSection = getNextSection(test, attempt.currentSection);

    if (!nextSection) {
      return res.status(400).json({
        success: false,
        message: "There is no next section",
        testCompleted: true,
      });
    }

    const nextSectionIndex = getOrderedSections(test).findIndex(
      (section) => section.section === nextSection.section,
    );

    const attemptSection = getAttemptSection(attempt, nextSection.section);

    if (!attemptSection) {
      return res.status(400).json({
        success: false,
        message: "Next section is missing from attempt",
      });
    }

    attemptSection.startedAt = attemptSection.startedAt || new Date();

    attemptSection.status = "in_progress";

    attempt.currentSection = nextSection.section;

    attempt.currentSectionIndex = nextSectionIndex;

    attempt.currentGroupIndex = 0;
    attempt.currentQuestionSetIndex = 0;
    attempt.currentQuestionIndex = 0;

    attempt.status = "in_progress";
    attempt.lastActivityAt = new Date();
    attempt.lastSavedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: `${nextSection.section} section started`,

      data: {
        section: nextSection.section,

        sectionIndex: nextSectionIndex,

        duration: nextSection.duration || 0,
      },
    });
  } catch (error) {
    console.error("startNextIeltsSection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start next section",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 7. SUBMIT SECTION
|--------------------------------------------------------------------------
|
| Normally section is already marked completed
| automatically when its last group is submitted.
|
| This endpoint explicitly closes a section.
|
|--------------------------------------------------------------------------
*/

export const submitIeltsSection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    const section = getAttemptSection(attempt, attempt.currentSection);

    if (!section) {
      return res.status(400).json({
        success: false,
        message: "Current section not found",
      });
    }

    section.completedAt = section.completedAt || new Date();

    section.status = "completed";

    section.timeSpent = section.groups.reduce(
      (total, group) => total + (group.timeSpent || 0),
      0,
    );

    calculateSectionAnalysis(section);

    calculateOverallAnalysis(attempt);

    attempt.lastActivityAt = new Date();

    attempt.lastSavedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Section submitted successfully",

      data: {
        section: attempt.currentSection,

        analysis: section.analysis,
      },
    });
  } catch (error) {
    console.error("submitIeltsSection error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit section",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 8. SUBMIT COMPLETE TEST
|--------------------------------------------------------------------------
*/

export const submitIeltsTest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    calculateOverallAnalysis(attempt);

    attempt.status = "submitted";

    attempt.submittedAt = new Date();

    attempt.lastActivityAt = new Date();

    attempt.lastSavedAt = new Date();

    /*
    |--------------------------------------------------------------------------
    | If Reading/Listening can be calculated automatically,
    | calculate their band here.
    |
    | Writing/Speaking can remain null until AI evaluation.
    |--------------------------------------------------------------------------
    */

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "IELTS test submitted successfully",

      data: {
        attemptId: attempt._id,

        status: attempt.status,

        score: attempt.score,

        analysis: attempt.analysis,
      },
    });
  } catch (error) {
    console.error("submitIeltsTest error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit IELTS test",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 9. GET ATTEMPT
|--------------------------------------------------------------------------
*/

export const getIeltsAttempt = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    if (!isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID",
      });
    }

    const attempt = await ieltsAttempt
      .findOne({
        _id: attemptId,
        user: userId,
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    const test = await ieltsTest.findById(attempt.test).lean();

    return res.status(200).json({
      success: true,
      data: {
        attempt,
        test,
      },
    });
  } catch (error) {
    console.error("getIeltsAttempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get attempt",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 10. PAUSE ATTEMPT
|--------------------------------------------------------------------------
*/

export const pauseIeltsAttempt = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Attempt is not in progress",
      });
    }

    attempt.status = "paused";
    attempt.pausedAt = new Date();
    attempt.lastActivityAt = new Date();
    attempt.lastSavedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Attempt paused successfully",
    });
  } catch (error) {
    console.error("pauseIeltsAttempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to pause attempt",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 11. RESUME ATTEMPT
|--------------------------------------------------------------------------
*/

export const resumeIeltsAttempt = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    if (attempt.status !== "paused") {
      return res.status(400).json({
        success: false,
        message: "Attempt is not paused",
      });
    }

    attempt.status = "in_progress";

    attempt.pausedAt = null;

    attempt.lastActivityAt = new Date();

    attempt.lastSavedAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Attempt resumed successfully",

      data: {
        currentSection: attempt.currentSection,

        currentSectionIndex: attempt.currentSectionIndex,

        currentGroupIndex: attempt.currentGroupIndex,

        currentQuestionSetIndex: attempt.currentQuestionSetIndex,

        currentQuestionIndex: attempt.currentQuestionIndex,
      },
    });
  } catch (error) {
    console.error("resumeIeltsAttempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resume attempt",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| 12. ABANDON ATTEMPT
|--------------------------------------------------------------------------
*/

export const abandonIeltsAttempt = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    const attempt = await ieltsAttempt.findOne({
      _id: attemptId,
      user: userId,
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    attempt.status = "abandoned";

    attempt.lastActivityAt = new Date();

    await attempt.save();

    return res.status(200).json({
      success: true,
      message: "Attempt abandoned successfully",
    });
  } catch (error) {
    console.error("abandonIeltsAttempt error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to abandon attempt",
      error: error.message,
    });
  }
};
