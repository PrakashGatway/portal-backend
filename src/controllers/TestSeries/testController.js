// controllers/testController.js
import mongoose from 'mongoose';
import { Question } from '../../models/Test series/Questions.js';
import TestSeries from '../../models/Test series/TestSeries.js';
import { UserSession } from '../../models/Test series/UserTestAttempts.js';


// Add this function to get question with user's previous answer
export const getCurrentQuestionWithAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const sessionValidation = await validateSession(sessionId, userId);
    if (!sessionValidation.success) {
      return res.status(sessionValidation.status).json(sessionValidation);
    }

    const session = sessionValidation.data;
    const questionData = await getCurrentQuestionData(session);

    if (!questionData) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Get user's previous answer for this question
    const currentQuestionId = await getCurrentQuestionId(session);
    const userAnswer = await getUserAnswerForQuestion(session, currentQuestionId);

    res.status(200).json({
      success: true,
      question: questionData,
      userAnswer: userAnswer ? {
        answer: userAnswer.answer,
        timeSpent: userAnswer.timeSpent,
        isCorrect: userAnswer.isCorrect,
        marksObtained: userAnswer.marksObtained
      } : null,
      progress: await getProgress(session)
    });

  } catch (error) {
    console.error('Get current question with answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

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

    // Validate test series
    const testSeries = await TestSeries.findById(testSeriesId)
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

    // Check for existing active session
    const existingSession = await UserSession.findOne({
      userId,
      testSeriesId,
      isCompleted: false
    });

    if (existingSession) {
      return res.status(200).json({
        success: true,
        message: 'Existing session found',
        sessionId: existingSession._id,
        continueExisting: true
      });
    }

    // Create new session
    const session = new UserSession({
      userId,
      testSeriesId,
      startTime: new Date(),
      currentSectionIndex: 0,
      currentQuestionIndex: 0
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
    const { answers, timeSpent } = req.body; // answers can be array or single
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

    for (const result of processedResults) {
      session.responses.push(result);
      session.totalScore += result.marksObtained;
    }
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

    // Get next question
    const nextQuestion = await getCurrentQuestionData(session);

    res.status(200).json({
      success: true,
      message: 'Answer submitted successfully',
      isTestCompleted: false,
      nextQuestion,
      progress: await getProgress(session),
      submittedResults: processedResults
    });

  } catch (error) {
    console.error('Submit answer error:', error);
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

    res.status(200).json({
      success: true,
      message: 'Moved to previous question',
      question: previousQuestion,
      progress: await getProgress(session)
    });

  } catch (error) {
    console.error('Get previous question error:', error);
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
    return null; // Test completed
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

  return await Question.findById(questionId, "-content");
}

async function processSingleQuestion(question, answer, timeSpent) {
  const isCorrect = validateAnswer(answer, question.correctAnswer);
  const marksObtained = isCorrect ? question.marks : 0;

  const response = {
    questionId: question._id,
    answer,
    timeSpent: timeSpent || 0,
    isCorrect,
    marksObtained,
    evaluatedAt: new Date()
  };

  return [{
    response,
    marksObtained,
    isCorrect
  }];
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
  let processedAnswer = userAnswer;
  let validationDetails = {};

  switch (questionType) {
    case 'matching_information':
      isCorrect = validateMatchingAnswer(userAnswer, subQuestion.correctAnswer);
      console.log(isCorrect)
      marksObtained = isCorrect ? group.marks : 1;
      validationDetails = {
        expected: subQuestion.correctAnswer,
        provided: userAnswer,
        type: 'matching'
      };
      break;

    case 'summary_completion':
      const summaryResult = validateSummaryAnswer(userAnswer, subQuestion.correctAnswer);
      isCorrect = summaryResult.isCorrect;
      marksObtained = isCorrect ? group.marks : 0;
      processedAnswer = summaryResult.processedAnswer;
      validationDetails = summaryResult.details;
      break;

    case 'multiple_choice_multiple':
      const mcqResult = validateMultipleChoiceMultiple(userAnswer, subQuestion.correctAnswer, subQuestion.options);
      isCorrect = mcqResult.isCorrect;
      marksObtained = isCorrect ? group.marks : 0;
      processedAnswer = mcqResult.processedAnswer;
      validationDetails = mcqResult.details;
      break;

    case 'multiple_choice_single':
      // For single choice: compare single option
      const singleChoiceResult = validateMultipleChoiceSingle(userAnswer, subQuestion.correctAnswer, subQuestion.options);
      isCorrect = singleChoiceResult.isCorrect;
      marksObtained = isCorrect ? group.marks : 0;
      processedAnswer = singleChoiceResult.processedAnswer;
      validationDetails = singleChoiceResult.details;
      break;

    case 'true_false_not_given':
    case 'yes_no_not_given':
      // For True/False/Not Given or Yes/No/Not Given
      isCorrect = validateTFNGAnswer(userAnswer, subQuestion.correctAnswer);
      marksObtained = isCorrect ? group.marks : 0;
      validationDetails = {
        expected: subQuestion.correctAnswer,
        provided: userAnswer,
        type: 'true_false_ng'
      };
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
      validationDetails = {
        expected: subQuestion.correctAnswer,
        provided: userAnswer,
        type: 'default'
      };
  }

  const response = {
    questionId: subQuestion._id,
    questionGroupId: questionGroup._id,
    subQuestionId: subQuestion._id,
    groupId: group._id,
    groupTitle: group.title,
    questionType: group.type,
    answer: processedAnswer,
    timeSpent: timeSpent,
    isCorrect,
    marksObtained,
    evaluatedAt: new Date(),
    validationDetails: validationDetails
  };

  return {
    questionId: subQuestion._id,
    questionGroupId: questionGroup._id,
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

function validateMatchingAnswer(userAnswer, correctAnswer) {
  if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
    return userAnswer.toUpperCase().trim() === correctAnswer.toUpperCase().trim();
  }
  return false;
}

function validateSummaryAnswer(userAnswer, correctAnswer) {
  // Handle both array format and object format for summary completion
  let isCorrect = false;
  let processedAnswer = userAnswer;
  let details = {};

  if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
    // Array format: ["energy", "food", "gardening", "obesity"]
    isCorrect = userAnswer.length === correctAnswer.length &&
      userAnswer.every((ans, index) =>
        ans.toLowerCase().trim() === correctAnswer[index].toLowerCase().trim()
      );
    details = {
      expected: correctAnswer,
      provided: userAnswer,
      type: 'summary_array'
    };
  } else if (typeof userAnswer === 'object' && typeof correctAnswer === 'object') {
    // Object format: {1: "energy", 2: "food", 3: "gardening", 4: "obesity"}
    const userKeys = Object.keys(userAnswer).sort();
    const correctKeys = Object.keys(correctAnswer).sort();

    isCorrect = JSON.stringify(userKeys) === JSON.stringify(correctKeys) &&
      userKeys.every(key =>
        userAnswer[key].toLowerCase().trim() === correctAnswer[key].toLowerCase().trim()
      );
    details = {
      expected: correctAnswer,
      provided: userAnswer,
      type: 'summary_object'
    };
  }

  return { isCorrect, processedAnswer, details };
}

function validateMultipleChoiceMultiple(userAnswer, correctAnswer, options) {
  // For multiple choice with multiple answers
  let isCorrect = false;
  let processedAnswer = userAnswer;
  let details = {};

  if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
    // Sort both arrays for comparison
    const sortedUser = [...userAnswer].sort();
    const sortedCorrect = [...correctAnswer].sort();

    isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);

    // Validate that all selected options are valid
    const validOptions = options ? options.map(opt => opt.label) : [];
    const invalidSelections = userAnswer.filter(ans => !validOptions.includes(ans));

    details = {
      expected: correctAnswer,
      provided: userAnswer,
      validOptions: validOptions,
      invalidSelections: invalidSelections,
      type: 'multiple_choice_multiple'
    };
  }

  return { isCorrect, processedAnswer, details };
}

function validateMultipleChoiceSingle(userAnswer, correctAnswer, options) {
  // For single choice questions
  let isCorrect = false;
  let processedAnswer = userAnswer;
  let details = {};

  if (typeof userAnswer === 'string' && typeof correctAnswer === 'string') {
    isCorrect = userAnswer.toUpperCase().trim() === correctAnswer.toUpperCase().trim();

    const validOptions = options ? options.map(opt => opt.label) : [];
    const isValidOption = validOptions.includes(userAnswer);

    details = {
      expected: correctAnswer,
      provided: userAnswer,
      validOptions: validOptions,
      isValidOption: isValidOption,
      type: 'multiple_choice_single'
    };
  }

  return { isCorrect, processedAnswer, details };
}

function validateTFNGAnswer(userAnswer, correctAnswer) {
  // For True/False/Not Given or Yes/No/Not Given
  const validAnswers = ['true', 'false', 'not given', 'yes', 'no', 'not given'];
  const normalizedUser = String(userAnswer).toLowerCase().trim();
  const normalizedCorrect = String(correctAnswer).toLowerCase().trim();

  return validAnswers.includes(normalizedUser) &&
    normalizedUser === normalizedCorrect;
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

// Fallback validation function
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
    .populate('responses.questionId');

  if (!session) {
    throw new Error('Session not found');
  }

  const totalMarks = session.responses.reduce((sum, response) =>
    sum + (response.marksObtained || 0), 0
  );

  const correctAnswers = session.responses.filter(r => r.isCorrect).length;
  const totalQuestions = session.responses.length;

  return {
    summary: {
      totalQuestions,
      correctAnswers,
      incorrectAnswers: totalQuestions - correctAnswers,
      skippedQuestions: session.responses.filter(r => r.skipped).length,
      totalScore: totalMarks,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      timeSpent: session.duration,
      averageTimePerQuestion: totalQuestions > 0 ? session.duration / totalQuestions : 0
    },
    // sectionWiseAnalysis: await getSectionWiseAnalysis(session),
    questionAnalysis: session.responses.map(response => ({
      questionId: response.questionId,
      isCorrect: response.isCorrect,
      marksObtained: response.marksObtained,
      timeSpent: response.timeSpent,
      answer: response.answer || false
    })),
    recommendations: generateRecommendations(session)
  };
}

async function getSectionWiseAnalysis(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId)
    .populate('sections.sectionId');

  return testSeries.sections.map(section => {
    const sectionResponses = session.responses.filter(response =>
      section.questionIds.includes(response.questionId._id.toString())
    );

    const correctInSection = sectionResponses.filter(r => r.isCorrect).length;
    const totalInSection = sectionResponses.length;

    return {
      sectionName: section.sectionId.name,
      totalQuestions: totalInSection,
      correctAnswers: correctInSection,
      accuracy: totalInSection > 0 ? (correctInSection / totalInSection) * 100 : 0,
      totalScore: sectionResponses.reduce((sum, r) => sum + (r.marksObtained || 0), 0)
    };
  });
}

function generateRecommendations(session) {
  const recommendations = [];

  const weakAreas = session.responses
    .filter(r => !r.isCorrect && !r.skipped)
    .reduce((acc, response) => {
      const type = response.questionId;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

  Object.entries(weakAreas)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([type, count]) => {
      recommendations.push(`Focus on improving your ${type.replace(/_/g, ' ')} skills`);
    });

  const avgTime = session.duration / session.responses.length;
  if (avgTime > 90) {
    recommendations.push('Practice time management to improve your speed');
  }

  if (session.responses.filter(r => r.skipped).length > 5) {
    recommendations.push('Avoid skipping questions; attempt all questions');
  }

  return recommendations;
}


// Add these helper functions to your existing helpers

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

// Enhanced getProgress function to include navigation info
// async function getProgress(session) {
//   const testSeries = await TestSeries.findById(session.testSeriesId);
  
//   let questionsAnswered = 0;
//   let totalQuestions = 0;
//   let questionList = [];

//   // Build question list for navigation
//   testSeries.sections.forEach((section, sectionIndex) => {
//     totalQuestions += section.questionIds.length;
    
//     section.questionIds.forEach((questionId, questionIndex) => {
//       const isCurrent = sectionIndex === session.currentSectionIndex && 
//                        questionIndex === session.currentQuestionIndex;
//       const isAnswered = session.responses.some(response => 
//         response.questionId.toString() === questionId.toString()
//       );
      
//       questionList.push({
//         sectionIndex,
//         questionIndex,
//         questionId,
//         isCurrent,
//         isAnswered,
//         canNavigate: true // You can add logic to restrict navigation if needed
//       });
      
//       if (sectionIndex < session.currentSectionIndex || 
//           (sectionIndex === session.currentSectionIndex && questionIndex < session.currentQuestionIndex)) {
//         questionsAnswered++;
//       }
//     });
//   });

//   // Count current question if answered
//   const currentQuestionId = testSeries.sections[session.currentSectionIndex]?.questionIds[session.currentQuestionIndex];
//   if (currentQuestionId && session.responses.some(response => 
//     response.questionId.toString() === currentQuestionId.toString()
//   )) {
//     questionsAnswered++;
//   }

//   return {
//     currentSection: session.currentSectionIndex + 1,
//     totalSections: testSeries.sections.length,
//     currentQuestion: session.currentQuestionIndex + 1,
//     questionsAnswered,
//     totalQuestions,
//     completionPercentage: Math.round((questionsAnswered / totalQuestions) * 100),
//     canGoBack: session.currentSectionIndex > 0 || session.currentQuestionIndex > 0,
//     canGoForward: await canGoForward(session),
//     questionList // For detailed navigation
//   };
// }

async function canGoForward(session) {
  const testSeries = await TestSeries.findById(session.testSeriesId);
  
  const currentSection = testSeries.sections[session.currentSectionIndex];
  const hasNextInSection = session.currentQuestionIndex < currentSection.questionIds.length - 1;
  const hasNextSection = session.currentSectionIndex < testSeries.sections.length - 1;
  
  return hasNextInSection || hasNextSection;
}

// Enhanced function to get user's previous answer for a question
async function getUserAnswerForQuestion(session, questionId) {
  const response = session.responses.find(resp => 
    resp.questionId.toString() === questionId.toString()
  );
  
  return response || null;
}