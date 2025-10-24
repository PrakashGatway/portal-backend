{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  testSeriesId: { type: ObjectId, ref: 'TestSeries', required: true },
  examId: { type: ObjectId, ref: 'Exam', required: true },
  startTime: { type: Date, required: true },
  endTime: Date, // When user submitted
  status: { 
    type: String, 
    enum: ['started', 'paused', 'submitted', 'timed_out'], 
    default: 'started' 
  },
  isCompleted: { type: Boolean, default: false },
  totalScore: Number,
  sectionScores: [{
    sectionName: String,
    score: Number,
    maxScore: Number
  }],
  timeTaken: Number, // In seconds
  answers: [{ // User's responses
    questionId: ObjectId,
    selectedOptions: [Mixed], // Array of selected options (for MCQs) or answer text
    timeSpent: Number, // Time spent on this question in seconds
    isCorrect: Boolean,
    marksAwarded: Number
  }],
  feedback: {
    overall: String,
    strengths: [String],
    weaknesses: [String],
    improvementTips: [String]
  },
  createdAt: { type: Date, default: Date.now }
}