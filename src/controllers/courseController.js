import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Category from '../models/Category.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Modules from '../models/Modules.js';

const validateCourseInput = (req, res, next) => {
  const {
    title,
    code,
    description,
    category,
    instructors,
    level,
    schedule,
    pricing,
    mode,
    schedule_pattern
  } = req.body;

  const errors = [];

  // Validate required fields
  if (!title || title.trim().length === 0) {
    errors.push('Course title is required');
  }

  if (!code || code.trim().length === 0) {
    errors.push('Course code is required');
  }

  if (!description || description.trim().length === 0) {
    errors.push('Course description is required');
  }

  if (!category) {
    errors.push('Category is required');
  } else if (!mongoose.Types.ObjectId.isValid(category)) {
    errors.push('Invalid category ID');
  }

  if (!instructors || instructors.length === 0) {
    errors.push('At least one instructor is required');
  } else {
    instructors.forEach(instructor => {
      if (!mongoose.Types.ObjectId.isValid(instructor)) {
        errors.push('Invalid instructor ID');
      }
    });
  }

  // Validate schedule
  if (!schedule) {
    errors.push('Schedule is required');
  } else {
    if (!schedule.startDate) {
      errors.push('Schedule start date is required');
    }
    if (!schedule.endDate) {
      errors.push('Schedule end date is required');
    }
    if (schedule.startDate && schedule.endDate && new Date(schedule.startDate) >= new Date(schedule.endDate)) {
      errors.push('End date must be after start date');
    }
  }

  // Validate pricing
  if (!pricing) {
    errors.push('Pricing is required');
  } else {
    if (pricing.amount === undefined || pricing.amount < 0) {
      errors.push('Pricing amount is required and must be non-negative');
    }
  }

  // Validate level
  if (level && !['beginner', 'intermediate', 'advanced'].includes(level)) {
    errors.push('Invalid level. Must be beginner, intermediate, or advanced');
  }

  // Validate mode
  if (!mode) {
    errors.push('Course mode is required');
  } else if (!['online', 'offline', 'hybrid'].includes(mode)) {
    errors.push('Invalid mode. Must be online, offline, or hybrid');
  }

  // Validate schedule pattern
  if (schedule_pattern) {
    if (schedule_pattern.frequency && !['daily', 'weekly', 'biweekly', 'monthly', 'custom'].includes(schedule_pattern.frequency)) {
      errors.push('Invalid schedule frequency');
    }

    if (schedule_pattern.days) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      schedule_pattern.days.forEach(day => {
        if (!validDays.includes(day.toLowerCase())) {
          errors.push(`Invalid day: ${day}`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return next(new ErrorResponse(errors.join(', '), 400));
  }

  next();
};

const getCourses = asyncHandler(async (req, res, next) => {
  const match = {};

  if (req.query.search) {
    match.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { subtitle: { $regex: req.query.search, $options: 'i' } },
      { code: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { shortDescription: { $regex: req.query.search, $options: 'i' } },
      { tags: { $in: [new RegExp(req.query.search, 'i')] } }
    ];
  }

  if (req.query.category) {
    if (mongoose.Types.ObjectId.isValid(req.query.category)) {
      match.category = mongoose.Types.ObjectId(req.query.category);
    } else {
      const category = await Category.findOne({ slug: req.query.category });
      if (category) {
        match.category = category._id;
      }
    }
  }

  if (req.query.subcategory) {
    if (mongoose.Types.ObjectId.isValid(req.query.subcategory)) {
      match.subcategory = mongoose.Types.ObjectId(req.query.subcategory);
    }
  }

  if (req.query.status) {
    match.status = req.query.status;
  }

  if (req.query.level) {
    match.level = req.query.level;
  }

  if (req.query.mode) {
    match.mode = req.query.mode;
  }

  if (req.query.featured !== undefined) {
    match.featured = req.query.featured === 'true';
  }

  if (req.query.language) {
    match.language = req.query.language;
  }

  if (req.query.startDate || req.query.endDate) {
    match['schedule.startDate'] = {};
    if (req.query.startDate) {
      match['schedule.startDate'].$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      match['schedule.startDate'].$lte = new Date(req.query.endDate);
    }
  }

  if (req.query.minPrice || req.query.maxPrice) {
    match['pricing.amount'] = {};
    if (req.query.minPrice) {
      match['pricing.amount'].$gte = parseFloat(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      match['pricing.amount'].$lte = parseFloat(req.query.maxPrice);
    }
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
    sort = { createdAt: -1 };
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'subcategory',
        foreignField: '_id',
        as: 'subcategoryDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructors',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryDetails', 0] },
        subcategoryInfo: { $arrayElemAt: ['$subcategoryDetails', 0] },
        instructorNames: {
          $map: {
            input: '$instructorDetails',
            as: 'instructor',
            in: {
              _id: '$$instructor._id',
              name: '$$instructor.name',
              email: '$$instructor.email'
            }
          }
        }
      }
    },
    {
      $project: {
        categoryDetails: 0,
        subcategoryDetails: 0,
        instructorDetails: 0
      }
    },
    { $sort: sort }
  ];

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  const courses = await Course.aggregate(pipeline);

  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await Course.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    data: courses
  });
});

const getCourse = asyncHandler(async (req, res, next) => {
  const pipeline = [
    {
      $match: {
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null },
          { slug: req.params.id },
          { code: req.params.id.toUpperCase() }
        ]
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'subcategory',
        foreignField: '_id',
        as: 'subcategoryDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructors',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryDetails', 0] },
        subcategoryInfo: { $arrayElemAt: ['$subcategoryDetails', 0] },
        instructorNames: {
          $map: {
            input: '$instructorDetails',
            as: 'instructor',
            in: {
              _id: '$$instructor._id',
              name: '$$instructor.name',
              email: '$$instructor.email',
              profilePic: '$$instructor.profilePic',
              profile: '$$instructor.profile',
              experience: '$$instructor.experience',
            }
          }
        }
      }
    },
    {
      $project: {
        categoryDetails: 0,
        subcategoryDetails: 0,
        instructorDetails: 0
      }
    }
  ];

  const courses = await Course.aggregate(pipeline);

  if (!courses || courses.length === 0) {
    return next(
      new ErrorResponse(`Course not found with id, slug, or code of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: courses[0]
  });
});


const createCourse = [
  validateCourseInput,
  asyncHandler(async (req, res, next) => {
    const {
      title,
      code,
      description,
      shortDescription,
      category,
      subcategory,
      instructors,
      level,
      language,
      thumbnail,
      schedule,
      pricing,
      preview,
      mode,
      schedule_pattern,
      features,
      requirements,
      objectives,
      targetAudience,
      tags,
      slug,
      status,
      featured,
      extraFields
    } = req.body;

    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    const existingTitleCourse = await Course.findOne({ title: title.trim() });
    if (existingTitleCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this title already exists'
      });
    }

    const course = await Course.create({
      title: title.trim(),
      code: code.toUpperCase(),
      description,
      shortDescription,
      slug,
      category,
      subcategory: subcategory ? subcategory : null,
      instructors,
      level: level || 'beginner',
      language: language || 'English',
      thumbnail,
      schedule,
      pricing,
      preview,
      mode,
      schedule_pattern,
      features,
      requirements,
      objectives,
      targetAudience,
      tags,
      status: status || 'upcoming',
      featured: featured || false,
      extraFields
    });

    res.status(201).json({
      success: true,
      data: course
    });
  })
];

const updateCourse = [
  validateCourseInput,
  asyncHandler(async (req, res, next) => {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course not found with id of ${req.params.id}`
      });
    }

    const {
      title,
      code,
      description,
      shortDescription,
      category,
      subcategory,
      instructors,
      level,
      language,
      thumbnail,
      schedule,
      pricing,
      preview,
      mode,
      schedule_pattern,
      features,
      requirements,
      objectives,
      targetAudience,
      tags,
      status,
      featured,
      extraFields,
      slug
    } = req.body;

    if (code && code.toUpperCase() !== course.code) {
      const existingCourse = await Course.findOne({
        code: code.toUpperCase(),
        _id: { $ne: course._id }
      });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: 'Course with this code already exists'
        });
      }
    }

    if (title && title.trim() !== course.title) {
      const existingTitleCourse = await Course.findOne({
        title: title.trim(),
        _id: { $ne: course._id }
      });
      if (existingTitleCourse) {
        return res.status(400).json({
          success: false,
          message: 'Course with this title already exists'
        });
      }
    }
    if (slug && slug !== course.slug) {
      course.slug = slug.toLowerCase();
    }

    const updateData = {
      ...(title && { title: title.trim() }),
      ...(code && { code: code.toUpperCase() }),
      ...(description && { description }),
      ...(shortDescription !== undefined && { shortDescription }),
      slug,
      ...(category && { category }),
      ...(subcategory !== undefined && { subcategory }),
      ...(instructors && { instructors }),
      ...(level && { level }),
      ...(language && { language }),
      ...(thumbnail && { thumbnail }),
      ...(schedule && { schedule }),
      ...(pricing && { pricing }),
      ...(preview && { preview }),
      ...(mode && { mode }),
      ...(schedule_pattern && { schedule_pattern }),
      ...(features && { features }),
      ...(requirements && { requirements }),
      ...(objectives && { objectives }),
      ...(targetAudience && { targetAudience }),
      ...(tags && { tags }),
      ...(status && { status }),
      ...(featured !== undefined && { featured }),
      ...(extraFields && { extraFields })
    };

    course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: course
    });
  })
];


const deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course not found with id of ${req.params.id}`
    });
  }

  await course.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});


const getCoursesByCategory = asyncHandler(async (req, res, next) => {
  const match = {};

  let category;
  if (mongoose.Types.ObjectId.isValid(req.params.categoryId)) {
    category = await Category.findById(req.params.categoryId);
  } else {
    category = await Category.findOne({ slug: req.params.categoryId });
  }

  if (!category) {
    return res.status(404).json({
      success: false,
      message: `Category not found with id or slug of ${req.params.categoryId}`
    });
  }

  match.category = category._id;

  // Add other filters from query params
  if (req.query.level) match.level = req.query.level;
  if (req.query.mode) match.mode = req.query.mode;
  if (req.query.status) match.status = req.query.status;
  if (req.query.featured !== undefined) match.featured = req.query.featured === 'true';

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructors',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryDetails', 0] },
        instructorNames: {
          $map: {
            input: '$instructorDetails',
            as: 'instructor',
            in: {
              _id: '$$instructor._id',
              name: '$$instructor.name'
            }
          }
        }
      }
    },
    {
      $project: {
        categoryDetails: 0,
        instructorDetails: 0
      }
    },
    { $sort: { createdAt: -1 } }
  ];

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  const courses = await Course.aggregate(pipeline);

  // Get total count
  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await Course.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    categoryId: category._id,
    categoryName: category.name,
    data: courses
  });
});


const getFeaturedCourses = asyncHandler(async (req, res, next) => {
  const pipeline = [
    { $match: { featured: true, status: { $ne: 'cancelled' } } },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructors',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryDetails', 0] },
        instructorNames: {
          $map: {
            input: '$instructorDetails',
            as: 'instructor',
            in: {
              _id: '$$instructor._id',
              name: '$$instructor.name'
            }
          }
        }
      }
    },
    {
      $project: {
        categoryDetails: 0,
        instructorDetails: 0
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: parseInt(req.query.limit) || 10 }
  ];

  const courses = await Course.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses
  });
});


const getUpcomingCourses = asyncHandler(async (req, res, next) => {
  const today = new Date();

  const pipeline = [
    {
      $match: {
        status: 'upcoming',
        // 'schedule.startDate': { $gte: today }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryDetails'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'instructors',
        foreignField: '_id',
        as: 'instructorDetails'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryDetails', 0] },
        instructorNames: {
          $map: {
            input: '$instructorDetails',
            as: 'instructor',
            in: {
              _id: '$$instructor._id',
              name: '$$instructor.name'
            }
          }
        },
        daysUntilStart: {
          $divide: [
            { $subtract: ['$schedule.startDate', today] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $project: {
        categoryDetails: 0,
        instructorDetails: 0
      }
    },
    { $sort: { 'schedule.startDate': 1 } },
    { $limit: parseInt(req.query.limit) || 10 }
  ];

  const courses = await Course.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses
  });
});

const getCourseCurriculum = async (req, res) => {
  try {
    const { courseId } = req.params;
    const hasPurchased = req.hasPurchasedCourse || false;

    const curriculum = await Modules.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      { $sort: { order: 1 } },
      {
        $lookup: {
          from: 'contents',
          localField: '_id',
          foreignField: 'module',
          as: 'items',
          pipeline: [
            {
              $match: {
                status: { $nin: ['draft', 'deleted'] },
                __t: { $in: ['LiveClasses', 'RecordedClasses'] }
              }
            },
            { $sort: { order: 1 } },
            {
              $project: {
                _id: 1,
                title: 1,
                __t: 1,
                isFree: 1,
                duration: 1,
                questions: 1,
                'content.pages': 1,
                testType: 1
              }
            }
          ]
        }
      },
      {
        $addFields: {
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                _id: '$$item._id',
                title: '$$item.title',
                type: {
                  $switch: {
                    branches: [
                      { case: { $in: ['$$item.__t', ['LiveClasses', 'RecordedClasses']] }, then: 'video' },
                      { case: { $eq: ['$$item.__t', 'StudyMaterials'] }, then: 'document' },
                      { case: { $eq: ['$$item.__t', 'Tests'] }, then: { $cond: { if: { $eq: ['$$item.testType', 'assignment'] }, then: 'assignment', else: 'quiz' } } }
                    ],
                    default: 'document'
                  }
                },
                duration: {
                  $switch: {
                    branches: [
                      {
                        case: { $in: ['$$item.__t', ['LiveClasses', 'RecordedClasses']] },
                        then: {
                          $concat: [
                            { $toString: { $ceil: { $divide: [{ $ifNull: ['$$item.duration', 0] }, 60] } } },
                            ' min'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$$item.__t', 'Tests'] },
                        then: {
                          $concat: [
                            { $toString: { $size: { $ifNull: ['$$item.questions', []] } } },
                            ' ',
                            {
                              $cond: {
                                if: { $eq: [{ $size: { $ifNull: ['$$item.questions', []] } }, 1] },
                                then: 'question',
                                else: 'questions'
                              }
                            }
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$$item.__t', 'StudyMaterials'] },
                        then: {
                          $let: {
                            vars: { pages: { $ifNull: ['$$item.content.pages', 0] } },
                            in: {
                              $cond: {
                                if: { $gt: ['$$pages', 0] },
                                then: { $concat: [{ $toString: '$$pages' }, ' ', { $cond: { if: { $eq: ['$$pages', 1] }, then: 'page', else: 'pages' } }] },
                                else: 'Document'
                              }
                            }
                          }
                        }
                      }
                    ],
                    default: '—'
                  }
                },
                isPreview: '$$item.isFree',
                isLocked: {
                  $and: [
                    { $ne: ['$$item.isFree', true] },
                    { $not: [hasPurchased] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          items: 1
        }
      }
    ]);
    res.json({ curriculum });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load curriculum' });
  }
};

export {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursesByCategory,
  getFeaturedCourses,
  getUpcomingCourses,
  getCourseCurriculum
};