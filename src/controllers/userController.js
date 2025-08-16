import User from '../models/User.js';
import Course from '../models/Course.js';

export const getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const { role, search, isActive, isVerified, subscriptionType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'lastActive'];
    const sortKey = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const pipeline = [];

    const matchStage = {};

    if (role) matchStage.role = role;
    // if (isActive !== undefined) matchStage.isActive = isActive === 'true';
    if (isVerified !== undefined) matchStage.isVerified = isVerified === 'true';
    if (subscriptionType) matchStage['subscription.type'] = subscriptionType;

    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.bio': { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({
      $lookup: {
        from: "Courses", // Use collection name safely
        localField: 'courses.course',
        foreignField: '_id',
        as: 'courseDetails'
      }
    });

    pipeline.push({
      $project: {
        refreshTokens: 0,
        __v: 0
      }
    });

    pipeline.push({
      $addFields: {
        courses: {
          $map: {
            input: '$courses',
            as: 'enrollment',
            in: {
              course: {
                $mergeObjects: [
                  '$$enrollment.course',
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$courseDetails',
                          cond: { $eq: ['$$this._id', '$$enrollment.course'] }
                        }
                      },
                      0
                    ]
                  }
                ]
              },
              enrolledAt: '$$enrollment.enrolledAt',
              progress: '$$enrollment.progress',
              completedLessons: '$$enrollment.completedLessons'
            }
          }
        }
      }
    });
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        role: 1,
        phoneNumber: 1,
        address: 1,
        profile: 1,
        subscription: 1,
        achievements: 1,
        lastActive: 1,
        isVerified: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,

        courses: {
          course: { _id: 1, title: 1 }, // Only include _id and title (expand if needed)
          enrolledAt: 1,
          progress: 1,
          completedLessons: 1
        },

        enrolledCoursesCount: { $size: '$courses' },
        fullAddress: {
          $cond: {
            if: '$address',
            then: {
              $concat: [
                { $ifNull: ['$address.street', ''] },
                ' ',
                { $ifNull: ['$address.city', ''] },
                ', ',
                { $ifNull: ['$address.state', ''] },
                ', ',
                { $ifNull: ['$address.country', ''] },
                ' ',
                { $ifNull: ['$address.zipCode', ''] }
              ]
            },
            else: ''
          }
        }
      }
    });

    pipeline.push({ $sort: { [sortKey]: sortDirection } });

    const totalCountPipeline = [...pipeline, { $count: 'total' }];
    const totalCountResult = await User.aggregate(totalCountPipeline).exec();
    const total = totalCountResult[0]?.total || 0;
    const pages = Math.ceil(total / limit);

    const finalPipeline = [
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ];

    const users = await User.aggregate(finalPipeline).exec();

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasPrevPage: page > 1,
          hasNextPage: page < pages
        }
      }
    });

  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens')
      .populate('courses.course', 'title thumbnail instructor');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user can view this profile (self, admin, or teacher for their students)
    if (req.user.id !== req.params.id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check authorization
    if (req.user.id !== id && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }

    const updateData = { ...req.body };
    
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.refreshTokens;
    delete updateData.resetPasswordToken;
    delete updateData.resetPasswordExpires;

    // Only admins can change roles
    if (updateData.role && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      delete updateData.role;
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Enroll user in course
// @route   POST /api/users/:id/enroll
// @access  Private
export const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.params.id;

    // Check authorization
    if (req.user.id !== userId && 
        req.user.role !== 'admin' && 
        req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const [user, course] = await Promise.all([
      User.findById(userId),
      Course.findById(courseId)
    ]);

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: 'User or course not found'
      });
    }

    // Check if already enrolled
    const isEnrolled = user.courses.some(c => c.course.toString() === courseId);
    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Enroll user
    user.courses.push({
      course: courseId,
      enrolledAt: new Date(),
      progress: 0
    });

    // Update course student count
    course.studentsCount += 1;

    await Promise.all([user.save(), course.save()]);

    // Send notification
    if (req.io) {
      req.io.to(`user_${userId}`).emit('notification', {
        type: 'course_enrollment',
        title: 'Course Enrollment',
        message: `Successfully enrolled in ${course.title}`,
        data: { courseId, courseName: course.title }
      });
    }

    res.json({
      success: true,
      message: 'Successfully enrolled in course'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's enrolled courses
// @route   GET /api/users/:id/courses
// @access  Private
export const getUserCourses = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'courses.course',
        populate: {
          path: 'instructor',
          select: 'name avatar'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};