import mongoose from "mongoose";
import { TestTemplate } from "../../models/GGSschema/testTemplate.js";
import { Question } from "../../models/GGSschema/questionSchema.js";
import { TestAttempt } from "../../models/GGSschema/attemptSchema.js";

const { Types } = mongoose;

/**
 * Create sections + question list for a new attempt
 * Handles both fixed and random selection for full/sectional,
 * and quiz-style templates.
 */
const buildSectionsForAttempt = async (template) => {
  const sectionsForAttempt = [];

  // QUIZ TYPE: treat as 1 virtual section
  if (template.testType === "quiz") {
    const cfg = template.quizConfig || {};
    const match = {
      exam: template.exam?._id
    };

    if (cfg.allowedQuestionTypes?.length) {
      match.questionType = { $in: cfg.allowedQuestionTypes };
    }
    if (cfg.difficulties?.length) {
      match.difficulty = { $in: cfg.difficulties };
    }
    if (cfg.tags?.length) {
      match.tags = { $in: cfg.tags };
    }

    const size = cfg.totalQuestions || 0;

    const qs = await Question.aggregate([
      { $match: match },
      { $sample: { size } },
      {
        $project: {
          _id: 1,
        },
      },
    ]);

    const questions = qs.map((q, idx) => ({
      question: q._id,
      order: idx + 1,
      answerOptionIndexes: [],
      answerText: "",
      selections: {},           // Map field – Mongoose will cast
      dropdownSelections: {},   // Map field – Mongoose will cast
      timeSpentSeconds: 0,
      isAnswered: false,
      markedForReview: false,
      isCorrect: false,
      marksAwarded: 0,
    }));

    sectionsForAttempt.push({
      sectionConfigId: null,
      sectionRef: null,
      name: "Quiz",
      durationMinutes: cfg.durationMinutes || template.totalDurationMinutes,
      status: "not_started",
      questions,
    });

    return sectionsForAttempt;
  }

  // FULL / SECTIONAL: use sections[] from template
  for (const secCfg of template.sections || []) {
    const sectionQuestions = [];

    if (secCfg.selectionMode === "fixed") {
      const qIds = (secCfg.questions || []).map((id) => new Types.ObjectId(id));

      qIds.forEach((qId, idx) => {
        sectionQuestions.push({
          question: qId,
          order: idx + 1,
          answerOptionIndexes: [],
          answerText: "",
          selections: {},
          dropdownSelections: {},
          timeSpentSeconds: 0,
          isAnswered: false,
          markedForReview: false,
          isCorrect: false,
          marksAwarded: 0
        });
      });
    } else if (secCfg.selectionMode === "random") {
      const match = {
        exam: template.exam._id,
        section: secCfg.section,
      };

      if (secCfg.randomConfig?.questionTypes?.length) {
        match.questionType = { $in: secCfg.randomConfig.questionTypes };
      }
      if (secCfg.randomConfig?.difficulties?.length) {
        match.difficulty = { $in: secCfg.randomConfig.difficulties };
      }
      if (secCfg.randomConfig?.tags?.length) {
        match.tags = { $in: secCfg.randomConfig.tags };
      }

      const size = secCfg.randomConfig?.questionCount || secCfg.questionCount || 0;

      const qs = await Question.aggregate([
        { $match: match },
        { $sample: { size } },
        { $project: { _id: 1 } },
      ]);

      qs.forEach((q, idx) => {
        sectionQuestions.push({
          question: q._id,
          order: idx + 1,
          answerOptionIndexes: [],
          answerText: "",
          selections: {},
          dropdownSelections: {},
          timeSpentSeconds: 0,
          isAnswered: false,
          markedForReview: false,
          isCorrect: false,
          marksAwarded: 0,
        });
      });
    }

    sectionsForAttempt.push({
      sectionConfigId: secCfg._id,
      sectionRef: secCfg.section || null,
      name: secCfg.customName || secCfg.section?.name || "Section",
      durationMinutes: secCfg.durationMinutes || template.totalDurationMinutes,
      status: "not_started",
      questions: sectionQuestions,
    });
  }

  return sectionsForAttempt;
};

/**
 * Remove correct answers from question docs before sending to frontend.
 */
const sanitizeQuestionsForClient = (questions) =>
  questions.map((q) => {
    const plain = q.toObject ? q.toObject() : q;

    // MCQ: remove isCorrect
    if (plain.options && Array.isArray(plain.options)) {
      plain.options = plain.options.map((opt) => {
        const o = { ...opt };
        delete o.isCorrect;
        return o;
      });
    }

    // Numeric/text: remove correct answer text
    delete plain.correctAnswerText;

    // OPTIONAL: if you follow the dataInsights schema
    if (plain.dataInsights) {
      const di = { ...plain.dataInsights };

      if (di.multiSource?.statements) {
        di.multiSource.statements = di.multiSource.statements.map((s) => {
          const x = { ...s };
          delete x.correct;
          return x;
        });
      }

      if (di.tableAnalysis?.statements) {
        di.tableAnalysis.statements = di.tableAnalysis.statements.map((s) => {
          const x = { ...s };
          delete x.correct;
          return x;
        });
      }

      if (di.graphics?.dropdowns) {
        di.graphics.dropdowns = di.graphics.dropdowns.map((d) => {
          const x = { ...d };
          delete x.correctIndex;
          return x;
        });
      }

      if (di.twoPart?.correctByColumn) {
        // don't send correctByColumn to client
        const { correctByColumn, ...rest } = di.twoPart;
        di.twoPart = rest;
      }

      plain.dataInsights = di;
    }

    return plain;
  });

// req.user._id is assumed from auth middleware

export const startTestAttempt = async (req, res) => {
  try {
    const { testTemplateId } = req.body;
    const userId = req.user._id;

    if (!testTemplateId || !Types.ObjectId.isValid(testTemplateId)) {
      return res.status(400).json({
        success: false,
        message: "testTemplateId is required",
      });
    }

    const template = await TestTemplate.findById(testTemplateId)
      .populate("exam")
      .populate("sections.section")
      .lean();

    if (!template || !template.isActive) {
      return res.status(404).json({
        success: false,
        message: "Test not found or inactive",
      });
    }

    // OPTIONAL: if you want to restrict here:
    // For SAT: template.exam.name === 'SAT', but in general we accept any exam.

    // 1) If user already has an in_progress attempt for this test, resume it
    const existing = await TestAttempt.findOne({
      user: userId,
      testTemplate: testTemplateId,
      status: "in_progress",
    });

    if (existing) {
      return res.json({
        success: true,
        message: "Resuming existing attempt",
        data: existing,
      });
    }

    const sectionsForAttempt = await buildSectionsForAttempt(template);

    const totalQuestions = sectionsForAttempt.reduce(
      (sum, s) => sum + (s.questions?.length || 0),
      0
    );

    const attempt = await TestAttempt.create({
      user: userId,
      exam: template.exam._id,
      testTemplate: template._id,
      testType: template.testType,
      totalDurationMinutes: template.totalDurationMinutes,
      sections: sectionsForAttempt,
      overallStats: {
        totalQuestions,
      }
    });

    return res.status(201).json({
      success: true,
      message: "Test attempt started",
      data: attempt,
    });
  } catch (err) {
    console.error("startTestAttempt error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to start attempt",
      error: err.message,
    });
  }
};

export const setGmatOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { moduleOrder } = req.body; // e.g. [0,2,1]

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid attempt id" });
    }

    if (
      !Array.isArray(moduleOrder) ||
      moduleOrder.length === 0 ||
      !moduleOrder.every((n) => Number.isInteger(n))
    ) {
      return res.status(400).json({
        success: false,
        message: "moduleOrder must be an array of indices",
      });
    }

    const attempt = await TestAttempt.findOne({
      _id: id,
      user: userId,
      status: "in_progress",
    });

    if (!attempt) {
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found" });
    }

    // safety: ensure indices make sense
    const maxIndex = attempt.sections.length - 1;
    if (moduleOrder.some((i) => i < 0 || i > maxIndex)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module indices in moduleOrder",
      });
    }

    const reordered = moduleOrder.map((i) => attempt.sections[i]);
    attempt.sections = reordered;

    attempt.gmatMeta = {
      orderChosen: true,
      moduleOrder,
      phase: "section_instructions",
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      onBreak: false,
      breakExpiresAt: null,
    };

    await attempt.save();

    return res.json({
      success: true,
      message: "GMAT module order set",
      data: attempt,
    });
  } catch (err) {
    console.error("setGmatOrder error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to set GMAT order",
      error: err.message,
    });
  }
};



export const getTestAttemptById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid attempt id" });
    }

    const attempt = await TestAttempt.findOne({
      _id: id,
      user: userId, // ensure user only sees own attempt
    })
      .populate("exam", "name description")
      .populate("testTemplate", "title description testType")
      .lean();

    if (!attempt) {
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found" });
    }

    // Load question docs for all question IDs in this attempt
    const allQuestionIds = [];
    for (const section of attempt.sections || []) {
      for (const q of section.questions || []) {
        allQuestionIds.push(String(q.question));
      }
    }

    const questionDocs = await Question.find({
      _id: { $in: allQuestionIds },
    }).lean();

    const sanitized = sanitizeQuestionsForClient(questionDocs);
    const questionMap = {};
    sanitized.forEach((q) => {
      questionMap[String(q._id)] = q;
    });

    const sectionsWithQuestions = (attempt.sections || []).map((sec) => {
      const qWithDetails = (sec.questions || []).map((aq) => {
        const qDoc = questionMap[String(aq.question)] || null;
        return {
          ...aq,
          questionDoc: qDoc,
        };
      });

      return {
        ...sec,
        questions: qWithDetails,
      };
    });

    return res.json({
      success: true,
      data: {
        ...attempt,
        sections: sectionsWithQuestions,
      },
    });
  } catch (err) {
    console.error("getTestAttemptById error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load attempt",
      error: err.message,
    });
  }
};


export const saveTestProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { updates, totalTimeUsedSeconds, gmatPhase,
      currentSectionIndex,
      currentQuestionIndex,
      reviewEditsUsed, } = req.body;
    // updates: [{ sectionIndex, questionIndex, answerOptionIndexes, answerText, isAnswered, markedForReview, timeSpentSeconds }]

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid attempt id" });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "updates[] is required",
      });
    }

    const attempt = await TestAttempt.findOne({
      _id: id,
      user: userId,
      status: "in_progress",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found or already finished",
      });
    }

    for (const u of updates) {
      const sIdx = u.sectionIndex;
      const qIdx = u.questionIndex;
      if (
        sIdx == null ||
        qIdx == null ||
        !attempt.sections[sIdx] ||
        !attempt.sections[sIdx].questions[qIdx]
      ) {
        continue;
      }

      const aq = attempt.sections[sIdx].questions[qIdx];
      attempt.sections[sIdx].status = "in_progress";

      if (Array.isArray(u.answerOptionIndexes)) {
        aq.answerOptionIndexes = u.answerOptionIndexes;
      }
      if (typeof u.answerText === "string") {
        aq.answerText = u.answerText;
      }
      if (u.selections && typeof u.selections === "object") {
        if (!aq.selections) aq.selections = new Map();
        Object.entries(u.selections).forEach(([key, value]) => {
          aq.selections.set(key, value);
        });
      }
      if (u.dropdownSelections && typeof u.dropdownSelections === "object") {
        if (!aq.dropdownSelections) aq.dropdownSelections = new Map();
        Object.entries(u.dropdownSelections).forEach(([key, value]) => {
          aq.dropdownSelections.set(key, Number(value));
        });
      }

      if (typeof u.isAnswered === "boolean") {
        aq.isAnswered = u.isAnswered;
      }
      if (typeof u.markedForReview === "boolean") {
        aq.markedForReview = u.markedForReview;
      }
      if (typeof u.timeSpentSeconds === "number") {
        aq.timeSpentSeconds = u.timeSpentSeconds;
      }
    }

    if (typeof totalTimeUsedSeconds === "number") {
      attempt.totalTimeUsedSeconds = totalTimeUsedSeconds;
    }

    if (!attempt.gmatMeta) attempt.gmatMeta = {};

    if (gmatPhase) {
      attempt.gmatMeta.phase = gmatPhase; // "in_section" | "review" | "break" etc
    }
    if (Number.isInteger(currentSectionIndex)) {
      attempt.gmatMeta.currentSectionIndex = currentSectionIndex;
    }
    if (Number.isInteger(currentQuestionIndex)) {
      attempt.gmatMeta.currentQuestionIndex = currentQuestionIndex;
    }


    await attempt.save();

    return res.json({
      success: true,
      message: "Progress saved",
    });
  } catch (err) {
    console.error("saveTestProgress error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save progress",
      error: err.message,
    });
  }
};


export const submitTestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid attempt id" });
    }

    const attempt = await TestAttempt.findOne({
      _id: id,
      user: userId,
      status: "in_progress",
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found or already submitted",
      });
    }

    // 1) collect all question ids
    const allQuestionIds = [];
    attempt.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        allQuestionIds.push(q.question);
      });
    });

    const questionDocs = await Question.find({
      _id: { $in: allQuestionIds },
    }).lean();

    const questionMap = {};
    questionDocs.forEach((q) => {
      questionMap[String(q._id)] = q;
    });

    // 2) scoring per section
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    let totalAttempted = 0;
    let totalRawScore = 0;

    for (const sec of attempt.sections) {
      let secCorrect = 0;
      let secIncorrect = 0;
      let secSkipped = 0;
      let secRawScore = 0;

      for (const aq of sec.questions) {
        const qDoc = questionMap[String(aq.question)];
        if (!qDoc) continue;

        totalQuestions += 1;

        // Determine if user answered
        const hasSelections =
          aq.selections && aq.selections.size
            ? aq.selections.size > 0
            : false;
        const hasDropdowns =
          aq.dropdownSelections && aq.dropdownSelections.size
            ? aq.dropdownSelections.size > 0
            : false;
        const answered =
          (aq.answerOptionIndexes && aq.answerOptionIndexes.length > 0) ||
          (typeof aq.answerText === "string" && aq.answerText.trim().length > 0) ||
          hasSelections ||
          hasDropdowns;

        if (!answered) {
          secSkipped += 1;
          totalSkipped += 1;
          aq.isCorrect = false;
          aq.marksAwarded = 0;
          continue;
        }

        totalAttempted += 1;

        // Determine correct answers for MCQ from qDoc.options
        let isCorrect = false;
        let marks = qDoc.marks ?? 1;
        let negative = qDoc.negativeMarks ?? 0;

        if (qDoc.questionType === "gmat_data_insights" && qDoc.dataInsights) {
          const di = qDoc.dataInsights;

          switch (di.subtype) {
            case "multi_source_reasoning": {
              // each statement id → "yes"/"no"
              isCorrect = di.multiSource.statements.every((st) => {
                const sel =
                  aq.selections && aq.selections.get
                    ? aq.selections.get(st.id)
                    : aq.selections?.[st.id];
                return sel === st.correct;
              });
              break;
            }

            case "two_part_analysis": {
              const correctMap = di.twoPart.correctByColumn || {};
              isCorrect = Object.entries(correctMap).every(
                ([colId, correctOptId]) => {
                  const sel =
                    aq.selections && aq.selections.get
                      ? aq.selections.get(colId)
                      : aq.selections?.[colId];
                  return sel === correctOptId;
                }
              );
              break;
            }

            case "table_analysis": {
              isCorrect = di.tableAnalysis.statements.every((st) => {
                const sel =
                  aq.selections && aq.selections.get
                    ? aq.selections.get(st.id)
                    : aq.selections?.[st.id];
                return sel === st.correct;
              });
              break;
            }

            case "graphics_interpretation": {
              isCorrect = di.graphics.dropdowns.every((dd) => {
                const sel =
                  aq.dropdownSelections && aq.dropdownSelections.get
                    ? aq.dropdownSelections.get(dd.id)
                    : aq.dropdownSelections?.[dd.id];
                return typeof sel === "number" && sel === dd.correctIndex;
              });
              break;
            }

            default:
              isCorrect = false;
          }
        } else if (qDoc.options && qDoc.options.length) {
          const correctIndexes = [];
          qDoc.options.forEach((opt, idx) => {
            if (opt.isCorrect) correctIndexes.push(idx);
          });

          const userIndexSet = new Set(aq.answerOptionIndexes || []);
          const correctSet = new Set(correctIndexes);

          if (
            userIndexSet.size === correctSet.size &&
            [...userIndexSet].every((idx) => correctSet.has(idx))
          ) {
            isCorrect = true;
          } else {
            isCorrect = false;
          }
        } else {
          // Non-MCQ (e.g., numeric/text) – simple normalized comparison
          const correct = (qDoc.correctAnswerText || "").trim().toLowerCase();
          const user = (aq.answerText || "").trim().toLowerCase();
          isCorrect = correct && user && correct === user;
        }

        if (isCorrect) {
          secCorrect += 1;
          totalCorrect += 1;
          secRawScore += marks;
          totalRawScore += marks;
          aq.isCorrect = true;
          aq.marksAwarded = marks;
        } else {
          secIncorrect += 1;
          totalIncorrect += 1;
          secRawScore -= negative;
          totalRawScore -= negative;
          aq.isCorrect = false;
          aq.marksAwarded = -negative;
        }
      }

      sec.stats = {
        correct: secCorrect,
        incorrect: secIncorrect,
        skipped: secSkipped,
        rawScore: secRawScore,
      };
      sec.status = "completed";
      sec.endedAt = new Date();
    }

    attempt.status = "completed";
    attempt.completedAt = new Date();
    attempt.overallStats = {
      totalQuestions,
      totalAttempted,
      totalCorrect,
      totalIncorrect,
      totalSkipped,
      rawScore: totalRawScore,
    };

    await attempt.save();

    return res.json({
      success: true,
      message: "Test submitted",
      data: attempt,
    });
  } catch (err) {
    console.error("submitTestAttempt error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to submit test",
      error: err.message,
    });
  }
};