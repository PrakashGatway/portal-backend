// controllers/testController.js
import mongoose from 'mongoose';
import { Question } from '../../models/Test series/Questions.js';
import TestSeries from '../../models/Test series/TestSeries.js';
import { UserSession } from '../../models/Test series/UserTestAttempts.js';
import { writingEvaluationService } from '../../services/writingServices.js';

async function getCurrentQuestionId(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);
  const currentSection = testSeries.sections[session.currentSectionIndex];
  return currentSection.questionIds[session.currentQuestionIndex];
}
export const startTest = async (req, res) => {
  try {
    const { testSeriesId } = req.body;

    const userId = req.user._id;

    if (!testSeriesId) {
      return res.status(400).json({
        success: false,
        message: 'Test series ID is required'
      });
    }

    const testSeries = await TestSeries.findById(new mongoose.Types.ObjectId(testSeriesId))
      .populate('sections.sectionId')
      .lean();

    if (!testSeries) {
      return res.status(404).json({
        success: false,
        message: 'Test series not found'
      });
    }

    if (!testSeries.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Test series is not active'
      });
    }

    const existingSession = await UserSession.findOne({
      userId,
      testSeriesId,
      isCompleted: false
    });


    if (existingSession) {
      let currentQuestion = await getCurrentQuestionData(existingSession);
      const progress = await getProgress(existingSession)
      return res.status(200).json({
        success: true,
        message: 'Existing session found',
        sessionId: existingSession._id,
        continueExisting: true,
        lastQuestionIndex: existingSession.lastQuestionIndex,
        currentQuestion: currentQuestion,
        progress: progress,
        timeRemaining: testSeries.duration * 60
      });
    }

    // Create new session
    const session = new UserSession({
      userId,
      testSeriesId,
      startTime: new Date(),
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      lastQuestionIndex: 0
    });

    await session.save();

    // Get first question
    const firstQuestion = await getCurrentQuestionData(session);

    res.status(200).json({
      success: true,
      sessionId: session._id,
      testSeries: {
        title: testSeries.title,
        type: testSeries.type,
        duration: testSeries.duration,
        totalQuestions: testSeries.totalQuestions,
        totalSections: testSeries.sections.length
      },
      currentQuestion: firstQuestion,
      progress: await getProgress(session),
      timeRemaining: testSeries.duration * 60
    });

  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getCurrentQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await validateSession(sessionId, userId);
    if (!session.success) {
      return res.status(session.status).json(session);
    }

    const questionData = await getCurrentQuestionData(session.data);

    if (!questionData) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.status(200).json({
      success: true,
      question: questionData,
      progress: await getProgress(session.data)
    });

  } catch (error) {
    console.error('Get current question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, timeSpent, lastQuestionIndex } = req.body; // answers can be array or single
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;

    const currentQuestion = await getCurrentQuestionForEvaluation(session);

    if (!currentQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Current question not found'
      });
    }

    let processedResults = [];

    if (currentQuestion.isQuestionGroup) {
      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: 'Answers array required for grouped questions'
        });
      }

      processedResults = await processGroupedQuestions(
        currentQuestion,
        answers,
        timeSpent
      );
    } else {
      processedResults = await processSingleQuestion(
        currentQuestion,
        answers,
        timeSpent
      );
    }
    const existingResponseIndex = session.responses.findIndex(
      response => response.questionId.toString() === currentQuestion._id.toString()
    );

    const totalMarksObtained = processedResults?.reduce((sum, result) => sum + result.marksObtained, 0);

    const responseData = {
      sectionType: currentQuestion.questionCategory,
      sectionId: currentQuestion.sectionId,
      questionId: currentQuestion._id,
      questions: processedResults,
      totalScore: totalMarksObtained
    };

    if (existingResponseIndex !== -1) {
      session.responses[existingResponseIndex] = {
        ...session.responses[existingResponseIndex],
        ...responseData,
        updatedAt: new Date()
      };
    } else {
      session.responses.push(responseData);
    }
    session.lastQuestionIndex = lastQuestionIndex
    await session.save();

    await moveToNextQuestion(session);

    const isCompleted = await checkTestCompletion(session);

    if (isCompleted) {
      await finalizeTestSession(session);
      const analysis = await generateTestAnalysis(session._id);

      return res.status(200).json({
        success: true,
        message: 'Test completed successfully',
        isTestCompleted: true,
        analysis
      });
    }

    const nextQuestion = await getCurrentQuestionData(session);
    const currentQuestionId = await getCurrentQuestionId(session);
    const userAnswer = await getUserAnswerForQuestion(session, currentQuestionId);


    res.status(200).json({
      success: true,
      message: 'Answer submitted successfully',
      isTestCompleted: false,
      currentQuestion:nextQuestion,
      progress: await getProgress(session),
      userAnswer: userAnswer ? userAnswer.questions.map(q => {
        return {
          questionGroupId: q.questionGroupId,
          questionId: q.subQuestionId,
          answer: q.answer
        }
      }) : [],
      // submittedResults: processedResults
    });

  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const skipQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;

    // Record skipped question with zero marks
    const currentQuestion = await getCurrentQuestionForEvaluation(session);
    if (currentQuestion) {
      session.responses.push({
        questionId: currentQuestion._id,
        answer: null,
        timeSpent: 0,
        isCorrect: false,
        marksObtained: 0,
        skipped: true
      });
    }

    // Move to next question
    await moveToNextQuestion(session);
    await session.save();

    // Check completion
    const isCompleted = await checkTestCompletion(session);
    if (isCompleted) {
      await finalizeTestSession(session);
      const analysis = await generateTestAnalysis(session._id);

      return res.status(200).json({
        success: true,
        message: 'Test completed successfully',
        isTestCompleted: true,
        analysis
      });
    }

    const nextQuestion = await getCurrentQuestionData(session);

    res.status(200).json({
      success: true,
      message: 'Question skipped',
      nextQuestion,
      progress: await getProgress(session)
    });

  } catch (error) {
    console.error('Skip question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const submitTest = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;

    await finalizeTestSession(session);
    const analysis = await generateTestAnalysis(session._id);

    res.status(200).json({
      success: true,
      message: 'Test submitted successfully',
      analysis
    });

  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getTestAnalysis = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await UserSession.findOne({
      _id: sessionId,
      userId
    }).populate('testSeriesId');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (!session.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Test not completed yet'
      });
    }

    const analysis = await generateTestAnalysis(sessionId);

    res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Get test analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const getPreviousQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;

    // Check if we can go back
    if (session.currentSectionIndex === 0 && session.currentQuestionIndex === 0) {
      return res.status(400).json({
        success: false,
        message: 'This is the first question, cannot go back'
      });
    }

    // Move to previous question
    await moveToPreviousQuestion(session);

    // Get the previous question
    const previousQuestion = await getCurrentQuestionData(session);

    if (!previousQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Previous question not found'
      });
    }
    const currentQuestionId = await getCurrentQuestionId(session);
    const userAnswer = await getUserAnswerForQuestion(session, currentQuestionId);
    res.status(200).json({
      success: true,
      message: 'Moved to previous question',
      question: previousQuestion,
      progress: await getProgress(session),
      userAnswer: userAnswer ? userAnswer.questions.map(q => {
        return {
          questionGroupId: q.questionGroupId,
          questionId: q.subQuestionId,
          answer: q.answer
        }
      }) : [],
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

export const goToQuestion = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionIndex, sectionIndex } = req.body;
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;
    const testSeries = await TestSeries.findById(session.testSeriesId);

    // Validate the requested position
    if (sectionIndex < 0 || sectionIndex >= testSeries.sections.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid section index'
      });
    }

    const targetSection = testSeries.sections[sectionIndex];
    if (questionIndex < 0 || questionIndex >= targetSection.questionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question index'
      });
    }

    // Update session position
    session.currentSectionIndex = sectionIndex;
    session.currentQuestionIndex = questionIndex;
    await session.save();

    // Get the question data
    const questionData = await getCurrentQuestionData(session);

    res.status(200).json({
      success: true,
      message: 'Navigated to question',
      question: questionData,
      progress: await getProgress(session)
    });

  } catch (error) {
    console.error('Go to question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

async function validateSession(sessionId, userId) {
  const session = await UserSession.findById(sessionId);

  if (!session) {
    return {
      success: false,
      status: 404,
      message: 'Session not found'
    };
  }

  if (session.userId.toString() !== userId.toString()) {
    return {
      success: false,
      status: 403,
      message: 'Unauthorized access'
    };
  }

  if (session.isCompleted) {
    return {
      success: false,
      status: 400,
      message: 'Test already completed'
    };
  }

  return { success: true, data: session };
}

async function getCurrentQuestionData(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);

  if (session.currentSectionIndex >= testSeries.sections.length) {
    return null;
  }

  const currentSection = testSeries.sections[session.currentSectionIndex];
  const questionId = currentSection.questionIds[session.currentQuestionIndex];

  if (!questionId) {
    return null;
  }

  const question = await Question.findById(questionId)
    .select('-correctAnswer -options.isCorrect -questionGroup.questions.correctAnswer -questionGroup.questions.options.isCorrect')
    .lean();

  return question;
}

async function getCurrentQuestionForEvaluation(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId)
  const currentSection = testSeries.sections[session.currentSectionIndex];
  const questionId = currentSection.questionIds[session.currentQuestionIndex];

  return await Question.findById(questionId);
}

async function processSingleQuestion(question, answer, timeSpent) {

  let isCorrect = false;
  let marksObtained = 0;
  let evaluation = null;

  const found = answer.find(item => item.questionId == question._id);

  if (!found) {
    return [{
      questionGroupId: question._id,
      subQuestionId: question._id,
      isCorrect,
      timeSpent: timeSpent,
      marksObtained,
      answer: "",
      evaluation: ""
    }];
  }

  if (question.questionType === "writing_task_1_academic" ||
    question.questionType === "writing_task_1_general" ||
    question.questionType === "writing_task_2") {
    const result = await writingEvaluationService.evaluateWritingTask(question, found.answer);
    isCorrect = result.isCorrect;
    marksObtained = result.marksObtained;
    evaluation = result.evaluation;
  } else {
    // Handle other question types if needed
    // const isCorrect = validateAnswer(answer, question.correctAnswer);
    // const marksObtained = isCorrect ? question.marks : 0;
  }
  const { bandScore, ...rest } = evaluation

  return [{
    questionGroupId: question._id,
    subQuestionId: question._id,
    isCorrect,
    timeSpent: timeSpent,
    marksObtained,
    answer: found.answer,
    evaluation: rest
  }]
}

async function processGroupedQuestions(questionGroup, answers, totalTimeSpent) {
  const results = [];

  const timePerAnswer = answers.length > 0 ? Math.floor(totalTimeSpent / answers.length) : 0;

  for (const group of questionGroup.questionGroup) {
    const groupQuestions = group.questions;
    for (const subQuestion of groupQuestions) {
      const userAnswer = answers.find(
        ans => ans.questionId.toString() == subQuestion._id.toString()
      );

      if (userAnswer) {
        const processedResult = processQuestionByType(
          group.type,
          userAnswer.answer,
          subQuestion,
          group,
          questionGroup,
          timePerAnswer
        );

        results.push(processedResult);
      } else {
        const skippedResult = handleSkippedQuestion(
          group.type,
          subQuestion,
          group,
          questionGroup
        );

        results.push(skippedResult);
      }
    }
  }

  return results;
}

function processQuestionByType(questionType, userAnswer, subQuestion, group, questionGroup, timeSpent) {
  let isCorrect = false;
  let marksObtained = 0;
  let validationDetails = {};

  switch (questionType) {
    case 'matching_information':
      isCorrect = userAnswer.toLowerCase() === subQuestion.correctAnswer.toLowerCase();
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = userAnswer
      break;
    case 'matching_features':
      isCorrect = userAnswer.toLowerCase() === subQuestion.correctAnswer.toLowerCase();
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = userAnswer
      break;

    case 'summary_completion':
      const correctArray = subQuestion.correctAnswer
        .split(',')
        .map(item => item.trim());

      let correctCount = 0;

      userAnswer.forEach((ans, index) => {
        if (ans.toLowerCase() === correctArray[index].toLowerCase()) {
          correctCount++;
        }
      });
      marksObtained = group.marks ? correctCount * group.marks : correctCount * 1;
      isCorrect = true;
      validationDetails = userAnswer;
      break;

    case 'multiple_choice_multiple': {
      const correctArray = subQuestion.correctAnswer
        .split(',')
        .map(item => item.trim().toLowerCase());

      let correctCount = 0;
      userAnswer.forEach(ans => {
        if (correctArray.includes(ans.toLowerCase())) {
          correctCount++;
        }
      });
      marksObtained = group.marks ? correctCount * group.marks : correctCount * 1;
      isCorrect = true
      validationDetails = userAnswer;
      break;
    }
    case 'multiple_choice_single':
      isCorrect = userAnswer.toLowerCase() === subQuestion.correctAnswer.toLowerCase();
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = userAnswer;
      break;

    case 'true_false_not_given':
    case 'yes_no_not_given':
      isCorrect = userAnswer.toLowerCase() === subQuestion.correctAnswer.toLowerCase();
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = userAnswer
      break;

    case 'sentence_completion':
    case 'short_answer':
      // For sentence completion and short answers
      const shortAnswerResult = validateShortAnswer(userAnswer, subQuestion.correctAnswer);
      isCorrect = shortAnswerResult.isCorrect;
      marksObtained = isCorrect ? group.marks : 0;
      processedAnswer = shortAnswerResult.processedAnswer;
      validationDetails = shortAnswerResult.details;
      break;

    case 'form_completion':
    case 'note_completion':
    case 'table_completion':
      // For various completion types
      const completionResult = validateCompletionAnswer(userAnswer, subQuestion.correctAnswer);
      isCorrect = completionResult.isCorrect;
      marksObtained = isCorrect ? group.marks : 0;
      processedAnswer = completionResult.processedAnswer;
      validationDetails = completionResult.details;
      break;

    default:
      isCorrect = validateAnswer(userAnswer, subQuestion.correctAnswer);
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = userAnswer
  }

  return {
    questionGroupId: group._id,
    subQuestionId: subQuestion._id,
    isCorrect,
    timeSpent: timeSpent,
    marksObtained,
    answer: validationDetails
  };
}

// Handle skipped questions based on type
function handleSkippedQuestion(questionType, subQuestion, group, questionGroup) {
  const response = {
    questionId: subQuestion._id,
    questionGroupId: questionGroup._id,
    groupId: group._id,
    groupTitle: group.title,
    questionType: questionType,
    answer: null,
    timeSpent: 0,
    isCorrect: false,
    marksObtained: 0,
    evaluatedAt: new Date(),
    skipped: true,
    validationDetails: { type: 'skipped' }
  };

  return {
    questionId: subQuestion._id,
    questionGroupId: questionGroup._id,
    marksObtained: 0,
    isCorrect: false,
    questionType: questionType,
    skipped: true
  };
}

function validateShortAnswer(userAnswer, correctAnswer) {
  // For short answer questions - allow for minor variations
  let isCorrect = false;
  let processedAnswer = userAnswer;
  let details = {};

  if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
    // Basic normalization for comparison
    const normalizedUser = userAnswer.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedCorrect = correctAnswer.toLowerCase().trim().replace(/\s+/g, ' ');

    isCorrect = normalizedUser === normalizedCorrect;

    details = {
      expected: correctAnswer,
      provided: userAnswer,
      normalizedExpected: normalizedCorrect,
      normalizedProvided: normalizedUser,
      type: 'short_answer'
    };
  }

  return { isCorrect, processedAnswer, details };
}

function validateCompletionAnswer(userAnswer, correctAnswer) {
  // For form/note/table completion
  let isCorrect = false;
  let processedAnswer = userAnswer;
  let details = {};

  if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
    // More flexible matching for completion questions
    const normalizedUser = userAnswer.toLowerCase().trim();
    const normalizedCorrect = correctAnswer.toLowerCase().trim();

    isCorrect = normalizedUser === normalizedCorrect;

    details = {
      expected: correctAnswer,
      provided: userAnswer,
      type: 'completion'
    };
  } else if (typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
    // For multiple completion fields
    isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    details = {
      expected: correctAnswer,
      provided: userAnswer,
      type: 'completion_object'
    };
  }

  return { isCorrect, processedAnswer, details };
}

function validateAnswer(userAnswer, correctAnswer) {
  if (userAnswer === null || userAnswer === undefined) {
    return false;
  }

  if (Array.isArray(correctAnswer) && Array.isArray(userAnswer)) {
    return JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort());
  }

  if (typeof correctAnswer === 'string' && typeof userAnswer === 'string') {
    return correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }

  return userAnswer === correctAnswer;
}

async function moveToNextQuestion(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);
  const currentSection = testSeries.sections[session.currentSectionIndex];

  session.currentQuestionIndex++;

  if (session.currentQuestionIndex >= currentSection.questionIds.length) {
    session.currentSectionIndex++;
    session.currentQuestionIndex = 0;
  }

  await session.save();
}

async function checkTestCompletion(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);

  if (session.currentSectionIndex >= testSeries.sections.length) {
    return true;
  }

  const currentSection = testSeries.sections[session.currentSectionIndex];
  return session.currentQuestionIndex >= currentSection.questionIds.length;
}

async function finalizeTestSession(session) {
  session.isCompleted = true;
  session.endTime = new Date();
  session.duration = Math.floor((session.endTime - session.startTime) / 1000);
  await session.save();
}

async function getProgress(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);

  let questionsAnswered = 0;
  let totalQuestions = 0;

  testSeries.sections.forEach((section, index) => {
    totalQuestions += section.questionIds.length;
    if (index < session.currentSectionIndex) {
      questionsAnswered += section.questionIds.length;
    } else if (index === session.currentSectionIndex) {
      questionsAnswered += session.currentQuestionIndex;
    }
  });

  return {
    currentSection: session.currentSectionIndex + 1,
    totalSections: testSeries.sections.length,
    currentQuestion: session.currentQuestionIndex + 1,
    questionsAnswered,
    totalQuestions,
    completionPercentage: Math.round((questionsAnswered / totalQuestions) * 100)
  };
}

async function generateTestAnalysis(sessionId) {
  const session = await UserSession.findById(sessionId)
    .populate('testSeriesId')
    .lean();

  if (!session) {
    throw new Error('Session not found');
  }

  // Flatten all sub-question responses across sections
  const allResponses = session.responses.flatMap(section =>
    (section.questions || []).map(q => ({
      ...q,
      sectionType: section.sectionType,
      sectionId: section.sectionId,
      questionId: section.questionId
    }))
  );

  // Compute overall stats
  const totalMarks = allResponses.reduce(
    (sum, r) => sum + (parseFloat(r.marksObtained) || 0),
    0
  );

  const correctAnswers = allResponses.filter(r => r.isCorrect).length;
  const totalQuestions = allResponses.length;
  const skippedQuestions = allResponses.filter(r => !r.answer || r.answer === '').length;

  const duration = session.duration || (
    session.endTime && session.startTime
      ? (session.endTime - session.startTime) / 1000 // in seconds
      : 0
  );

  const analysis = {
    summary: {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers - skippedQuestions,
      skippedQuestions,
      totalScore: totalMarks,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      timeSpent: duration,
      averageTimePerQuestion: totalQuestions > 0 ? duration / totalQuestions : 0
    },
    questionAnalysis: allResponses.map(r => ({
      sectionType: r.sectionType,
      sectionId: r.sectionId,
      questionGroupId: r.questionGroupId,
      subQuestionId: r.subQuestionId,
      isCorrect: r.isCorrect || false,
      marksObtained: r.marksObtained ? parseFloat(r.marksObtained) : 0,
      timeSpent: r.timeSpent || 0,
      answer: r.answer || null,
      evaluation: r.evaluation || null
    })),
    // Add per-section stats
    sectionWiseAnalysis: session.responses.map(section => {
      const questions = section.questions || [];
      const totalMarks = questions.reduce(
        (sum, q) => sum + (parseFloat(q.marksObtained) || 0),
        0
      );
      const correct = questions.filter(q => q.isCorrect).length;
      return {
        sectionType: section.sectionType,
        sectionId: section.sectionId,
        totalQuestions: questions.length,
        correctAnswers: correct,
        accuracy: questions.length > 0 ? (correct / questions.length) * 100 : 0,
        score: totalMarks
      };
    }),
    // recommendations: generateRecommendations(allResponses)
  };

  return analysis;
}

async function moveToPreviousQuestion(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);

  // Move back within current section
  if (session.currentQuestionIndex > 0) {
    session.currentQuestionIndex--;
  }
  // Move to previous section
  else if (session.currentSectionIndex > 0) {
    session.currentSectionIndex--;
    const previousSection = testSeries.sections[session.currentSectionIndex];
    session.currentQuestionIndex = previousSection.questionIds.length - 1;
  }

  await session.save();
}
async function getUserAnswerForQuestion(session, questionId) {
  const response = session.responses.find(resp =>
    resp.questionId.toString() === questionId.toString()
  );

  return response || null;
}