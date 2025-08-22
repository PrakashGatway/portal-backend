import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.yandex.com",
    port: 587,         
    secure: false,
    service: 'yandex.com',
    auth: {
      user: 'jaipur@gatewayabroad.in',
      pass: "ixwtxrgjfbyemdsp"
    }
  });
};

console.log(process.env.EMAIL_USER)

export const sendEmail = async (options) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"Study Platform" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || options.message
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const sendWelcomeEmail = async (user) => {
  const html = `
    <h2>Welcome to Gateway abroad!</h2>
    <p>Hi ${user.name},</p>
    <p>Welcome to our learning platform. We're excited to have you on board!</p>
    <p>You can now access thousands of courses and start your learning journey.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
  `;

  return await sendEmail({
    email: user.email,
    subject: 'Welcome to Study Platform',
    html
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${user.name},</p>
    <p>You have requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="background: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return await sendEmail({
    email: user.email,
    subject: 'Password Reset Request',
    html
  });
};