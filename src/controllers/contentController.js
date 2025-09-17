// controllers/contentController.js
import mongoose from 'mongoose';
import { Content, LiveClass, RecordedClass, Test, StudyMaterial } from '../models/Content.js';
import asyncHandler from '../middleware/async.js';
import Modules from '../models/Modules.js';
import ErrorResponse from '../utils/errorResponse.js';

// Validation middleware for content creation
const validateContentInput = (req, res, next) => {
  const { title, course, instructor } = req.body;
  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  }

  req.body.slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-')     // replace spaces with -
    .replace(/-+/g, '-');     // remove duplicate -

  if (!course) {
    errors.push('Course is required');
  }

  if (!instructor) {
    errors.push('Instructor is required');
  }

  if (errors.length > 0) {
    return next(new ErrorResponse(errors.join(', '), 400));
  }

  next();
};

const getAllContent = asyncHandler(async (req, res, next) => {
  const match = {};

  if (req.query.course) {
    if (mongoose.Types.ObjectId.isValid(req.query.course)) {
      match.course = new mongoose.Types.ObjectId(req.query.course);
    }
  }

  if (req.query.instructor) {
    if (mongoose.Types.ObjectId.isValid(req.query.instructor)) {
      match.instructor = new mongoose.Types.ObjectId(req.query.instructor);
    }
  }

  if (req.query.status) match.status = req.query.status;
  if (req.query.contentType) match.__t = req.query.contentType;
  if (req.query.isFree !== undefined) match.isFree = req.query.isFree === 'true';

  if (req.query.publishedFrom || req.query.publishedTo) {
    match.publishedAt = {};
    if (req.query.publishedFrom) {
      match.publishedAt.$gte = new Date(req.query.publishedFrom);
    }
    if (req.query.publishedTo) {
      match.publishedAt.$lte = new Date(req.query.publishedTo);
    }
  }

  if (req.query.search) {
    match.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { tags: { $in: [req.query.search] } }
    ];
  }

  let sort = {};
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',');
    sortBy.forEach(field => {
      if (field.startsWith('-')) {
        sort[field.substring(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });
  } else {
    sort = { order: 1, createdAt: -1 };
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructor',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $lookup: {
        from: 'modules',
        localField: 'module',
        foreignField: '_id',
        as: 'moduleDetails'
      }
    },
    {
      $addFields: {
        courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
        instructorInfo: { $arrayElemAt: ['$instructorDetails', 0] },
        moduleInfo: { $arrayElemAt: ['$moduleDetails', 0] },
        isLive: {
          $cond: {
            if: { $eq: ["$__t", "LiveClass"] },
            then: true,
            else: false
          }
        },
        isRecorded: {
          $cond: {
            if: { $eq: ["$__t", "RecordedClass"] },
            then: true,
            else: false
          }
        },
        isTest: {
          $cond: {
            if: { $eq: ["$__t", "Test"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        courseDetails: 0,
        instructorDetails: 0,
        moduleDetails: 0
      }
    },
    { $sort: sort }
  ];

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  // Execute aggregation
  const content = await Content.aggregate(pipeline);

  // Get total count for pagination
  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await Content.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;


  res.status(200).json({
    success: true,
    count: content.length,
    total,
    data: content
  });
});


const getContentByType = asyncHandler(async (req, res, next) => {
  const { type } = req.params;
  const match = { __t: type };

  // Add common filters
  if (req.query.course) {
    if (mongoose.Types.ObjectId.isValid(req.query.course)) {
      match.course = mongoose.Types.ObjectId(req.query.course);
    }
  }

  if (req.query.status) match.status = req.query.status;
  if (req.query.isFree !== undefined) match.isFree = req.query.isFree === 'true';

  // Type-specific filters
  switch (type) {
    case 'LiveClass':
      if (req.query.liveStatus) match.liveStatus = req.query.liveStatus;
      if (req.query.upcoming === 'true') {
        match.scheduledStart = { $gte: new Date() };
        match.liveStatus = 'scheduled';
      }
      break;
    case 'RecordedClass':
      if (req.query.minDuration) match['video.duration'].$gte = parseInt(req.query.minDuration);
      if (req.query.maxDuration) match['video.duration'].$lte = parseInt(req.query.maxDuration);
      break;
    case 'Test':
      if (req.query.testType) match.testType = req.query.testType;
      if (req.query.available === 'true') {
        match['availability.published'] = true;
        match['availability.startDate'] = { $lte: new Date() };
        const orConditions = [
          { 'availability.endDate': { $exists: false } },
          { 'availability.endDate': { $gte: new Date() } }
        ];
        match.$or = orConditions;
      }
      break;
    case 'StudyMaterial':
      if (req.query.materialType) match.materialType = req.query.materialType;
      break;
  }

  // Build sort
  let sort = {};
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',');
    sortBy.forEach(field => {
      if (field.startsWith('-')) {
        sort[field.substring(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });
  } else {
    sort = { order: 1, createdAt: -1 };
  }

  // Build pipeline based on content type
  let pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructor',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $lookup: {
        from: 'modules',
        localField: 'module',
        foreignField: '_id',
        as: 'moduleDetails'
      }
    }
  ];

  // Add type-specific lookups
  switch (type) {
    case 'LiveClass':
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'attendees',
          foreignField: '_id',
          as: 'attendeeDetails'
        }
      });
      pipeline.push({
        $addFields: {
          attendeesCount: { $size: '$attendees' }
        }
      });
      break;
    case 'RecordedClass':
      pipeline.push({
        $addFields: {
          formattedDuration: {
            $concat: [
              { $toString: { $floor: { $divide: ['$video.duration', 60] } } },
              ":",
              {
                $substr: [
                  {
                    $concat: [
                      "0",
                      { $toString: { $mod: ['$video.duration', 60] } }
                    ]
                  },
                  -2,
                  2
                ]
              }
            ]
          }
        }
      });
      break;
    case 'Test':
      pipeline.push({
        $addFields: {
          questionsCount: { $size: '$questions' },
          hasTimeLimit: { $cond: [{ $gt: ['$settings.timeLimit', 0] }, true, false] }
        }
      });
      break;
  }

  // Add common projections
  pipeline.push({
    $addFields: {
      courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
      instructorInfo: { $arrayElemAt: ['$instructorDetails', 0] },
      moduleInfo: { $arrayElemAt: ['$moduleDetails', 0] }
    }
  });

  pipeline.push({
    $project: {
      courseDetails: 0,
      instructorDetails: 0,
      moduleDetails: 0
    }
  });

  pipeline.push({ $sort: sort });

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  // Execute aggregation
  const content = await Content.aggregate(pipeline);

  // Get total count
  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await Content.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;

  res.status(200).json({
    success: true,
    count: content.length,
    total,
    type,
    data: content
  });
});

const getContent = asyncHandler(async (req, res, next) => {
  const pipeline = [
    {
      $match: {
        $or: [
          mongoose.Types.ObjectId.isValid(req.params.id)
            ? { _id: new mongoose.Types.ObjectId(req.params.id) }
            : { slug: req.params.id }
        ]
      }
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    },
    {
      $lookup: {
        from: 'users', // Assuming your user collection is 'users'
        localField: 'instructor',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $lookup: {
        from: 'modules',
        localField: 'module',
        foreignField: '_id',
        as: 'moduleDetails'
      }
    },
    {
      $addFields: {
        courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
        instructorInfo: { $arrayElemAt: ['$instructorDetails', 0] },
        moduleInfo: { $arrayElemAt: ['$moduleDetails', 0] },
        contentType: '$__t'
      }
    },
    {
      $project: {
        // Content basic details (common fields)
        title: 1,
        description: 1,
        status: 1,
        isFree: 1,
        order: 1,
        duration: 1,
        thumbnailPic: 1, // Include thumbnail if it exists on the base content model
        slug: 1,
        tags: 1,
        createdAt: 1,
        updatedAt: 1,
        publishedAt: 1,
        contentType: 1, // From $addFields
        scheduledStart: 1,
        scheduledEnd: 1,
        meetingUrl: 1,
        maxParticipants: 1,
        liveStatus: 1,
        video: 1, // This will include url, duration, publicId
        testType: 1,
        meetingId:1,
        materialType: 1,
        file: 1, // This will include url, publicId, size, mimeType

        courseInfo: {
          _id: 1,
          title: 1,
          description: 1,
          thumbnail: 1, // Include course thumbnail
          slug: 1
        },
        instructorInfo: {
          _id: 1,
          name: 1,
          email: 1,
        },
        moduleInfo: {
          _id: 1,
          title: 1,
          description: 1,
          icon: 1, // Include module icon
          isPublished: 1
        },
      }
    }
  ];

  // Add type-specific lookups
  pipeline.push({
    $lookup: {
      from: 'progresses',
      localField: '_id',
      foreignField: 'content',
      as: 'progressDetails'
    }
  });

  pipeline.push({
    $addFields: {
      progressCount: { $size: '$progressDetails' }
    }
  });

  pipeline.push({
    $project: {
      courseDetails: 0,
      instructorDetails: 0,
      moduleDetails: 0,
      progressDetails: 0
    }
  });

  const content = await Content.aggregate(pipeline);

  if (!content || content.length === 0) {
    return next(new ErrorResponse(`Content not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: content[0]
  });
});

const createLiveClass = [
  validateContentInput,
  asyncHandler(async (req, res, next) => {
    const { scheduledStart, scheduledEnd, course, module, order } = req.body;

    if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
      return next(new ErrorResponse('End time must be after start time', 400));
    }

    if (new Date(scheduledStart) <= new Date()) {
      return next(new ErrorResponse('Scheduled start time must be in the future', 400));
    }

    if (!course || !mongoose.Types.ObjectId.isValid(course)) {
      return next(new ErrorResponse('Valid course ID is required', 400));
    }

    if (!module || !mongoose.Types.ObjectId.isValid(module)) {
      return next(new ErrorResponse('Valid module ID is required', 400));
    }

    const moduleDoc = await Modules.findById(module);
    if (!moduleDoc) {
      return next(new ErrorResponse('Module not found', 404));
    }

    if (moduleDoc.course.toString() !== course) {
      return next(new ErrorResponse('Module does not belong to the specified course', 400));
    }

    let finalOrder = order;

    if (order === undefined || order === null) {
      const maxOrderContent = await Content.findOne({ module })
        .sort({ order: -1 })
        .select('order');

      finalOrder = maxOrderContent ? maxOrderContent.order + 1 : 1;
    } else {
      if (typeof order !== 'number' || order < 0) {
        return next(new ErrorResponse('Order must be a positive number', 400));
      }
    }

    const duration = Math.round(
      (new Date(scheduledEnd) - new Date(scheduledStart)) / (1000 * 60)
    );

    const liveClass = await LiveClass.create({
      ...req.body,
      __t: 'LiveClasses',
      order: finalOrder,
      duration: duration,
      liveStatus: 'scheduled'
    });

    // const populatedLiveClass = await LiveClass.findById(liveClass._id)
    //   .populate('course', 'title code description')
    //   .populate('instructor', 'name email avatar')
    //   .populate('module', 'title order');

    res.status(201).json({
      success: true,
    });
  })
];

const createRecordedClass = [
  validateContentInput,
  asyncHandler(async (req, res, next) => {
    const { video, course, module, order } = req.body;
    if (!course || !mongoose.Types.ObjectId.isValid(course)) {
      return next(new ErrorResponse('Valid course ID is required', 400));
    }
    if (!module || !mongoose.Types.ObjectId.isValid(module)) {
      return next(new ErrorResponse('Valid module ID is required', 400));
    }
    const moduleDoc = await Modules.findById(module);
    if (!moduleDoc) {
      return next(new ErrorResponse('Module not found', 404));
    }
    if (moduleDoc.course.toString() !== course) {
      return next(new ErrorResponse('Module does not belong to the specified course', 400));
    }
    let finalOrder = typeof order === 'number' ? order : 0;
    if (finalOrder <= 0) {
      const maxOrderContent = await Content.findOne({ module })
        .sort({ order: -1 })
        .select('order');
      finalOrder = maxOrderContent && maxOrderContent.order > 0
        ? maxOrderContent.order + 1
        : 1;
    }
    const recordedClass = await RecordedClass.create({
      ...req.body,
      __t: 'RecordedClasses', // Fixed: was 'RecordedClasses'
      order: finalOrder,
    });

    res.status(201).json({
      success: true,
      message: 'Recorded class created successfully',
    });
  })
];


const createTest = [
  validateContentInput,
  asyncHandler(async (req, res, next) => {
    const { questions, settings } = req.body;

    if (!questions || questions.length === 0) {
      return next(new ErrorResponse('At least one question is required', 400));
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question || !question.type) {
        return next(new ErrorResponse(`Question ${i + 1} must have question text and type`, 400));
      }

      if (question.type === 'multiple-choice' && (!question.options || question.options.length < 2)) {
        return next(new ErrorResponse(`Multiple choice question ${i + 1} must have at least 2 options`, 400));
      }
    }
    const test = await Test.create({
      ...req.body,
      __t: 'Tests'
    });

    const populatedTest = await Test.findById(test._id)
      .populate('course', 'title code')
      .populate('instructor', 'name email')
      .populate('module', 'title');

    res.status(201).json({
      success: true,
      data: populatedTest
    });
  })
];

const createStudyMaterial = [
  validateContentInput,
  asyncHandler(async (req, res, next) => {
    const { materialType, file, externalLink } = req.body;

    if (!materialType) {
      return next(new ErrorResponse('Material type is required', 400));
    }

    if (materialType !== 'link' && !file && !externalLink) {
      return next(new ErrorResponse('File or external link is required for this material type', 400));
    }

    const studyMaterial = await StudyMaterial.create({
      ...req.body,
      __t: 'StudyMaterials'
    });

    // Populate related data for response
    const populatedStudyMaterial = await StudyMaterial.findById(studyMaterial._id)
      .populate('course', 'title code')
      .populate('instructor', 'name email')
      .populate('module', 'title');

    res.status(201).json({
      success: true,
      data: populatedStudyMaterial
    });
  })
];

const updateContent = [
  validateContentInput,
  asyncHandler(async (req, res, next) => {
    let content = await Content.findById(req.params.id);

    if (!content) {
      return next(new ErrorResponse(`Content not found with id ${req.params.id}`, 404));
    }


    if (content.__t === 'LiveClasses') {
      const { scheduledStart, scheduledEnd } = req.body;
      if (scheduledStart && scheduledEnd && new Date(scheduledStart) >= new Date(scheduledEnd)) {
        return next(new ErrorResponse('End time must be after start time', 400));
      }
    } else if (content.__t === 'Tests') {
      if (questions) {
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          if (question.type === 'multiple-choice' && question.options && question.options.length < 2) {
            return next(new ErrorResponse(`Multiple choice question ${i + 1} must have at least 2 options`, 400));
          }
        }
      }
    }
    if (content.__t === 'LiveClasses') {
      await LiveClass.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );
    }
    if (content.__t === 'RecordedClasses') {
      await RecordedClass.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      )
    };

    // const populatedContent = await Content.findById(content._id)
    //   .populate('course', 'title code')
    //   .populate('instructor', 'name email')
    //   .populate('module', 'title');

    res.status(200).json({
      success: true
    });
  })
];

const deleteContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return next(new ErrorResponse(`Content not found with id ${req.params.id}`, 404));
  }

  await content.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

const getContentStats = asyncHandler(async (req, res, next) => {
  const match = {};

  if (req.query.course) {
    match.course = mongoose.Types.ObjectId(req.query.course);
  }

  if (req.query.instructor) {
    match.instructor = mongoose.Types.ObjectId(req.query.instructor);
  }

  const statsPipeline = [
    { $match: match },
    {
      $group: {
        _id: '$__t',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        avgOrder: { $avg: '$order' }
      }
    },
    {
      $project: {
        contentType: '$_id',
        count: 1,
        totalDuration: 1,
        avgOrder: { $round: ['$avgOrder', 2] },
        _id: 0
      }
    }
  ];

  const stats = await Content.aggregate(statsPipeline);

  const statusPipeline = [
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        _id: 0
      }
    }
  ];

  const statusStats = await Content.aggregate(statusPipeline);

  res.status(200).json({
    success: true,
    data: {
      contentTypes: stats,
      statusDistribution: statusStats
    }
  });
});


const getUpcomingLiveClasses = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const match = {
    __t: 'LiveClass',
    scheduledStart: { $gte: now },
    liveStatus: 'scheduled'
  };

  if (req.query.course) {
    match.course = mongoose.Types.ObjectId(req.query.course);
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructor',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
        instructorInfo: { $arrayElemAt: ['$instructorDetails', 0] },
        daysUntilStart: {
          $divide: [
            { $subtract: ['$scheduledStart', now] },
            1000 * 60 * 60 * 24
          ]
        },
        hoursUntilStart: {
          $divide: [
            { $subtract: ['$scheduledStart', now] },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $project: {
        courseDetails: 0,
        instructorDetails: 0
      }
    },
    { $sort: { scheduledStart: 1 } }
  ];

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  const liveClasses = await LiveClass.aggregate(pipeline);

  // Get total count
  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await LiveClass.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;

  res.status(200).json({
    success: true,
    count: liveClasses.length,
    total,
    data: liveClasses
  });
});


const getCourseContentStructure = asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new ErrorResponse('Invalid course ID', 400));
  }

  const pipeline = [
    {
      $match: {
        course: new mongoose.Types.ObjectId(courseId),
        status: 'published'
      }
    },
    {
      $lookup: {
        from: 'modules',
        localField: 'module',
        foreignField: '_id',
        as: 'moduleDetails'
      }
    },
    {
      $addFields: {
        moduleInfo: { $arrayElemAt: ['$moduleDetails', 0] },
        moduleName: { $ifNull: [{ $arrayElemAt: ['$moduleDetails.title', 0] }, 'No Module'] },
        moduleId: { $ifNull: ['$module', null] }
      }
    },
    {
      $group: {
        _id: '$moduleId',
        moduleName: { $first: '$moduleName' },
        content: {
          $push: {
            _id: '$_id',
            title: '$title',
            type: '$__t',
            order: '$order',
            duration: '$duration',
            isFree: '$isFree'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: {
        'moduleInfo.order': 1,
        'content.order': 1
      }
    }
  ];

  const structure = await Content.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: structure.length,
    data: structure
  });
});

export {
  getAllContent,
  getContentByType,
  getContent,
  createLiveClass,
  createRecordedClass,
  createTest,
  createStudyMaterial,
  updateContent,
  deleteContent,
  getContentStats,
  getUpcomingLiveClasses,
  getCourseContentStructure
};