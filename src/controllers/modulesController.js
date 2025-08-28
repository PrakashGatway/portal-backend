import mongoose from 'mongoose';
import Module from '../models/Modules.js';
import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';


const getModules = asyncHandler(async (req, res, next) => {
  const match = {};
  
  if (req.query.course) {
    if (mongoose.Types.ObjectId.isValid(req.query.course)) {
      match.course = mongoose.Types.ObjectId(req.query.course);
    }
  }
  
  if (req.query.isPublished !== undefined) {
    match.isPublished = req.query.isPublished === 'true';
  }
  
  if (req.query.search) {
    match.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Date range filters
  if (req.query.publishedFrom || req.query.publishedTo) {
    match.publishedAt = {};
    if (req.query.publishedFrom) {
      match.publishedAt.$gte = new Date(req.query.publishedFrom);
    }
    if (req.query.publishedTo) {
      match.publishedAt.$lte = new Date(req.query.publishedTo);
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
        from: 'contents',
        localField: '_id',
        foreignField: 'module',
        as: 'contentDetails'
      }
    },
    {
      $addFields: {
        courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
        contentCount: { $size: '$contentDetails' },
        liveClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'LiveClasses'] }
            }
          }
        },
        recordedClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'RecordedClasses'] }
            }
          }
        },
        testsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'Tests'] }
            }
          }
        },
        studyMaterialsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'StudyMaterial'] }
            }
          }
        }
      }
    },
    {
      $project: {
        courseDetails: 0,
        contentDetails: 0
      }
    },
    { $sort: sort }
  ];

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  pipeline.push({ $skip: startIndex });
  pipeline.push({ $limit: limit });

  // Execute aggregation
  const modules = await Module.aggregate(pipeline);

  // Get total count for pagination
  const totalPipeline = [
    { $match: match },
    { $count: 'total' }
  ];
  const totalCount = await Module.aggregate(totalPipeline);
  const total = totalCount.length > 0 ? totalCount[0].total : 0;

  res.status(200).json({
    success: true,
    count: modules.length,
    total,
    data: modules
  });
});


const getModule = asyncHandler(async (req, res, next) => {
  const pipeline = [
    {
      $match: {
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(req.params.id) ? new mongoose.Types.ObjectId(req.params.id) : null }
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
        from: 'contents',
        localField: '_id',
        foreignField: 'module',
        as: 'contentDetails'
      }
    },
    {
      $addFields: {
        courseInfo: { $arrayElemAt: ['$courseDetails', 0] },
        contentCount: { $size: '$contentDetails' },
        liveClasses: {
          $filter: {
            input: '$contentDetails',
            cond: { $eq: ['$$this.__t', 'LiveClass'] }
          }
        },
        recordedClasses: {
          $filter: {
            input: '$contentDetails',
            cond: { $eq: ['$$this.__t', 'RecordedClass'] }
          }
        },
        tests: {
          $filter: {
            input: '$contentDetails',
            cond: { $eq: ['$$this.__t', 'Test'] }
          }
        },
        studyMaterials: {
          $filter: {
            input: '$contentDetails',
            cond: { $eq: ['$$this.__t', 'StudyMaterial'] }
          }
        },
        liveClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'LiveClass'] }
            }
          }
        },
        recordedClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'RecordedClass'] }
            }
          }
        },
        testsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'Test'] }
            }
          }
        },
        studyMaterialsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'StudyMaterial'] }
            }
          }
        }
      }
    },
    {
      $project: {
        courseDetails: 0,
        contentDetails: 0
      }
    }
  ];

  const modules = await Module.aggregate(pipeline);

  if (!modules || modules.length === 0) {
    return next(new ErrorResponse(`Module not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    module: modules[0]
  });
});

const createModule = asyncHandler(async (req, res, next) => {
  const { title, course, order } = req.body;
  
  const errors = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Module title is required');
  }
  
  if (!course) {
    errors.push('Course is required');
  } else if (!mongoose.Types.ObjectId.isValid(course)) {
    errors.push('Invalid course ID');
  }
  
  if (order === undefined || typeof order !== 'number' || order < 0) {
    errors.push('Order must be a positive number');
  }
  
  if (errors.length > 0) {
    return next(new ErrorResponse(errors.join(', '), 400));
  }

  const existingModule = await Module.findOne({ course, order });
  if (existingModule) {
    return next(new ErrorResponse(`Module with order ${order} already exists for this course`, 400));
  }

  const module = await Module.create(req.body);

  const populatedModule = await Module.findById(module._id)
    .populate('course', 'title code');

  res.status(201).json({
    success: true,
     populatedModule
  });
});


const updateModule = asyncHandler(async (req, res, next) => {
  let module = await Module.findById(req.params.id);

  if (!module) {
    return next(new ErrorResponse(`Module not found with id ${req.params.id}`, 404));
  }

  const { title, course, order } = req.body;
  
  // Validation
  const errors = [];
  
  if (title && title.trim().length === 0) {
    errors.push('Module title cannot be empty');
  }
  
  if (course && !mongoose.Types.ObjectId.isValid(course)) {
    errors.push('Invalid course ID');
  }
  
  if (order !== undefined && (typeof order !== 'number' || order < 0)) {
    errors.push('Order must be a positive number');
  }
  
  if (errors.length > 0) {
    return next(new ErrorResponse(errors.join(', '), 400));
  }

  module = await Module.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  const populatedModule = await Module.findById(module._id)
    .populate('course', 'title code');

  res.status(200).json({
    success: true,
     populatedModule
  });
});


const deleteModule = asyncHandler(async (req, res, next) => {
  const module = await Module.findById(req.params.id);

  if (!module) {
    return next(new ErrorResponse(`Module not found with id ${req.params.id}`, 404));
  }

  const contentCountPipeline = [
    {
      $match: {
        module: mongoose.Types.ObjectId(req.params.id)
      }
    },
    {
      $count: 'total'
    }
  ];
  
  const contentCountResult = await mongoose.connection.collection('contents').aggregate(contentCountPipeline).toArray();
  const contentCount = contentCountResult.length > 0 ? contentCountResult[0].total : 0;
  
  if (contentCount > 0) {
    return next(new ErrorResponse(`Cannot delete module with ${contentCount} associated content items. Delete content first.`, 400));
  }

  await module.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});


const getModuleStats = asyncHandler(async (req, res, next) => {
  const match = {};
  
  if (req.query.course) {
    match.course = mongoose.Types.ObjectId(req.query.course);
  }

  const statsPipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        totalModules: { $sum: 1 },
        publishedModules: {
          $sum: {
            $cond: [{ $eq: ['$isPublished', true] }, 1, 0]
          }
        },
        avgDuration: { $avg: '$duration' },
        avgOrder: { $avg: '$order' },
        totalDuration: { $sum: '$duration' }
      }
    },
    {
      $project: {
        _id: 0,
        totalModules: 1,
        publishedModules: 1,
        unpublishedModules: { $subtract: ['$totalModules', '$publishedModules'] },
        avgDuration: { $round: ['$avgDuration', 2] },
        avgOrder: { $round: ['$avgOrder', 2] },
        totalDuration: 1
      }
    }
  ];

  const stats = await Module.aggregate(statsPipeline);

  res.status(200).json({
    success: true,
    data: stats.length > 0 ? stats[0] : {}
  });
});


const getModulesByCourse = asyncHandler(async (req, res, next) => {
  const courseId = req.params.courseId;
  
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return next(new ErrorResponse('Invalid course ID', 400));
  }

  const pipeline = [
    {
      $match: {
        course:new mongoose.Types.ObjectId(courseId),
        ...(req.query.isPublished === 'true' && { isPublished: true })
      }
    },
    {
      $lookup: {
        from: 'contents',
        localField: '_id',
        foreignField: 'module',
        as: 'contentDetails'
      }
    },
    {
      $addFields: {
        contentCount: { $size: '$contentDetails' },
        liveClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'LiveClass'] }
            }
          }
        },
        recordedClassesCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'RecordedClass'] }
            }
          }
        },
        testsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'Test'] }
            }
          }
        },
        studyMaterialsCount: {
          $size: {
            $filter: {
              input: '$contentDetails',
              cond: { $eq: ['$$this.__t', 'StudyMaterial'] }
            }
          }
        }
      }
    },
    {
      $project: {
        contentDetails: 0
      }
    },
    { $sort: { order: 1 } }
  ];

  const modules = await Module.aggregate(pipeline);

  res.status(200).json({
    success: true,
    count: modules.length,
    data: modules
  });
});


const getModuleContentStructure = asyncHandler(async (req, res, next) => {
  const moduleId = req.params.id;
  
  if (!mongoose.Types.ObjectId.isValid(moduleId)) {
    return next(new ErrorResponse('Invalid module ID', 400));
  }

  const module = await Module.findById(moduleId);
  if (!module) {
    return next(new ErrorResponse(`Module not found with id ${moduleId}`, 404));
  }

  const pipeline = [
    {
      $match: {
        module:new mongoose.Types.ObjectId(moduleId)
      }
    },
    {
      $sort: { order: 1, createdAt: -1 }
    },
    {
      $group: {
        _id: '$__t',
        content: {
          $push: {
            _id: '$_id',
            title: '$title',
            order: '$order',
            duration: '$duration',
            status: '$status',
            isFree: '$isFree'
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        contentType: '$_id',
        content: 1,
        count: 1,
        _id: 0
      }
    }
  ];

  const contentStructure = await mongoose.connection.collection('contents').aggregate(pipeline).toArray();

  res.status(200).json({
    success: true,
    module: {
      _id: module._id,
      title: module.title,
      order: module.order
    },
    contentStructure
  });
});

export {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  getModuleStats,
  getModulesByCourse,
  getModuleContentStructure
};