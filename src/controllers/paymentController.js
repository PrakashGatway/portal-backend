import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Notification from '../models/Notification.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create payment intent
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
  try {
    const { courseId, amount, currency = 'USD' } = req.body;

    // Validate course if provided
    let course = null;
    if (courseId) {
      course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user is already enrolled
      const user = await User.findById(req.user.id);
      const isEnrolled = user.courses.some(c => c.course.toString() === courseId);
      
      if (isEnrolled) {
        return res.status(400).json({
          success: false,
          message: 'Already enrolled in this course'
        });
      }
    }

    // Get or create Stripe customer
    let customer;
    const user = await User.findById(req.user.id);
    
    if (user.subscription.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.subscription.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      user.subscription.stripeCustomerId = customer.id;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customer.id,
      metadata: {
        userId: req.user.id,
        courseId: courseId || '',
        type: courseId ? 'course_purchase' : 'other'
      }
    });

    // Create payment record
    const payment = await Payment.create({
      user: req.user.id,
      course: courseId,
      type: courseId ? 'course_purchase' : 'other',
      amount,
      currency,
      status: 'pending',
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: customer.id
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Confirm payment
// @route   POST /api/payments/confirm
// @access  Private
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Find and update payment record
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
      user: req.user.id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    payment.status = 'completed';
    payment.transactionId = paymentIntent.id;
    await payment.save();

    // If it's a course purchase, enroll the user
    if (payment.course && payment.type === 'course_purchase') {
      const user = await User.findById(req.user.id);
      const course = await Course.findById(payment.course);

      // Enroll user in course
      user.courses.push({
        course: payment.course,
        enrolledAt: new Date(),
        progress: 0
      });

      // Update course student count
      course.studentsCount += 1;

      await Promise.all([user.save(), course.save()]);

      // Send enrollment notification
      await Notification.create({
        recipient: req.user.id,
        title: 'Course Enrollment Successful',
        message: `You have been successfully enrolled in "${course.title}"`,
        type: 'course_enrollment',
        data: {
          courseId: course._id,
          courseName: course.title
        }
      });

      // Send real-time notification
      if (req.io) {
        req.io.to(`user_${req.user.id}`).emit('notification', {
          type: 'course_enrollment',
          title: 'Course Enrollment Successful',
          message: `You have been successfully enrolled in "${course.title}"`,
          data: { courseId: course._id }
        });
      }
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { status, type } = req.query;

    // Build filter
    let filter = {};
    
    if (req.user.role === 'student') {
      filter.user = req.user.id;
    } else if (req.user.role === 'teacher') {
      // Teachers can see payments for their courses
      const teacherCourses = await Course.find({ instructor: req.user.id }, '_id');
      const courseIds = teacherCourses.map(course => course._id);
      filter.course = { $in: courseIds };
    }
    // Admins can see all payments (no additional filter)

    if (status) filter.status = status;
    if (type) filter.type = type;

    const payments = await Payment.find(filter)
      .populate('user', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Refund payment
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
export const refundPayment = async (req, res) => {
  try {
    const { reason, amount } = req.body;
    
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'name email')
      .populate('course', 'title');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: 'requested_by_customer',
      metadata: {
        reason: reason || 'Admin refund'
      }
    });

    // Update payment record
    payment.status = 'refunded';
    payment.refund = {
      amount: refund.amount / 100,
      reason: reason || 'Admin refund',
      refundedAt: new Date(),
      stripeRefundId: refund.id
    };

    await payment.save();

    // If it was a course purchase, remove enrollment
    if (payment.course && payment.type === 'course_purchase') {
      const user = await User.findById(payment.user._id);
      user.courses = user.courses.filter(
        c => c.course.toString() !== payment.course._id.toString()
      );
      
      const course = await Course.findById(payment.course._id);
      course.studentsCount = Math.max(0, course.studentsCount - 1);
      
      await Promise.all([user.save(), course.save()]);
    }

    // Notify user
    await Notification.create({
      recipient: payment.user._id,
      title: 'Payment Refunded',
      message: `Your payment for "${payment.course?.title || 'purchase'}" has been refunded`,
      type: 'payment',
      data: {
        paymentId: payment._id,
        amount: payment.refund.amount,
        reason: payment.refund.reason
      }
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Handle Stripe webhooks
// @route   POST /api/payments/webhook
// @access  Public
export const webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        // Update payment status
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { 
            status: 'completed',
            transactionId: paymentIntent.id
          }
        );
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: failedPayment.id },
          { status: 'failed' }
        );
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};