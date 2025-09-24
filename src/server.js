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

import chatController from "./controllers/chatController.js"

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
import promoRoutes from './routes/promoRoutes.js';


import submissionRoutes from './routes/submissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);
app.use("/uploads", express.static("uploads"));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  credentials: true
});

io.use(socketAuth);

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

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use('/api/v1/page', pageRoutes);
app.use('/api/v1/entities', entityRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/promo-codes',promoRoutes);

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



io.on('connection', (socket) => {
  socket.on('joinClass', (joinData) => {
    chatController.handleJoinClass(socket, io, joinData);
  });

  socket.on('message', chatController.handleMessage(socket, io));

  socket.on('typing', chatController.handleTyping(socket));

  socket.on('adminAction', chatController.handleAdminAction(socket, io));

  socket.on('disconnect', chatController.handleDisconnect(socket, io));
});


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;