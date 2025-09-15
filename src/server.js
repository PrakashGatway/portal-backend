import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";

import connectDB from './config/database.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { socketAuth } from './middleware/socketMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import pageRoutes from './routes/pagesRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import entityRoutes from './routes/entitiesRoutes.js';
import categoryRoutes from './routes/categoriesRoutes.js';
import moduleRoutes from './routes/modulesRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js'
import vimeoRoutes from './routes/vimeoRoutes.js';


import submissionRoutes from './routes/submissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// import lessonRoutes from './routes/lessonRoutes.js';
// TkzTQIDkPlGcxM3zT5zHWdButSOpzoXtBvmy6E3s3yY   secret key
// accessky DO009PW6TG7GCDBUX3YX

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);
app.use("/uploads", express.static("uploads"));

// const io = new Server(server, {
//   cors: {
//     origin: process.env.FRONTEND_URL || "http://localhost:3000",
//     methods: ["GET", "POST"]
//   }
// });

// io.use(socketAuth);

app.use(helmet());

const allowedOrigins = [
  "https://www.gatewayabroadeducations.com",
  "https://uat.gatewayabroadeducations.com",
  "https://portal.gatewayabroadeducations.com",
  "https://gatewayabroadeducations.com",
  "https://dashboard.gatewayabroadeducations.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://6dtmqkkr-5173.inc1.devtunnels.ms",
  "https://portal-virid-eta.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
// app.use('/api/', limiter);

app.use((req, res, next) => {
  // req.io = io;
  next();
});
app.get('/api/:videoId', (req, res) => {
  const videoId = req.params.videoId;
  
  // Set headers to prevent caching and hide source
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Redirect to YouTube embed with branding disabled
  res.redirect(302, `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`);
});
// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use('/api/v1/page', pageRoutes);
app.use('/api/v1/entities', entityRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/tokens', tokenRoutes);
app.use('/api/v1/live', vimeoRoutes); // For live class auth tokens

app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// io.on('connection', (socket) => {
//   console.log(`User connected: ${socket.user.id}`);

//   // Join user to their personal room
//   socket.join(`user_${socket.user.id}`);

//   // Handle joining live classes
//   socket.on('join_class', (classId) => {
//     socket.join(`class_${classId}`);
//     socket.to(`class_${classId}`).emit('user_joined', {
//       userId: socket.user.id,
//       username: socket.user.name
//     });
//   });

//   // Handle leaving live classes
//   socket.on('leave_class', (classId) => {
//     socket.leave(`class_${classId}`);
//     socket.to(`class_${classId}`).emit('user_left', {
//       userId: socket.user.id,
//       username: socket.user.name
//     });
//   });

//   // Handle chat messages in live classes
//   socket.on('class_message', (data) => {
//     const { classId, message } = data;
//     socket.to(`class_${classId}`).emit('class_message', {
//       userId: socket.user.id,
//       username: socket.user.name,
//       message,
//       timestamp: new Date()
//     });
//   });

//   // Handle screen sharing
//   socket.on('start_screen_share', (classId) => {
//     socket.to(`class_${classId}`).emit('screen_share_started', {
//       userId: socket.user.id,
//       username: socket.user.name
//     });
//   });

//   socket.on('stop_screen_share', (classId) => {
//     socket.to(`class_${classId}`).emit('screen_share_stopped', {
//       userId: socket.user.id
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log(`User disconnected: ${socket.user.id}`);
//   });
// });

// Error handling middleware

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;