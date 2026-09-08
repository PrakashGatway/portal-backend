import dotenv from 'dotenv';
import { transporter } from '../services/sendMeetingMail.js';

dotenv.config();


export const sendEmail = async (options) => {
  
  const mailOptions = {
    from: `Ooshas Prep`,
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

export const welcomeEmailTemplate = (user) => {
  return `

    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Ooshas Prep</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
      ">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="padding: 40px 20px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width: 550px;
                  background: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                "
              >

                <!-- Header -->
                <tr>
                  <td style="
                    background-color: #F36D45;
                    padding: 20px;
                    text-align: center;
                  ">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 25px;
                    ">
                      Ooshas Prep
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">

                    <h2 style="
                      margin: 0 0 15px;
                      color: #222222;
                      font-size: 24px;
                    ">
                      Welcome, ${user.name}! 🎉
                    </h2>

                    <p style="
                      margin: 0 0 18px;
                      color: #555555;
                      font-size: 15px;
                      line-height: 1.6;
                    ">
                      We're excited to have you join
                      <strong>Ooshas Prep</strong>.
                    </p>

                    <p style="
                      margin: 0 0 25px;
                      color: #555555;
                      font-size: 15px;
                      line-height: 1.6;
                    ">
                      Your account has been successfully created.
                      You can now access your courses, practice tests,
                      study materials, and start your learning journey.
                    </p>

                    <!-- Button -->
                    <div style="
                      text-align: center;
                      margin: 30px 0;
                    ">
                      <a
                        href="https://dashboard.ooshasprep.com"
                        style="
                          display: inline-block;
                          background-color: #4f46e5;
                          color: #ffffff;
                          padding: 13px 28px;
                          text-decoration: none;
                          border-radius: 7px;
                          font-size: 15px;
                          font-weight: bold;
                        "
                      >
                        Go to Dashboard
                      </a>
                    </div>

                    <p style="
                      margin: 25px 0 0;
                      color: #777777;
                      font-size: 13px;
                      line-height: 1.5;
                    ">
                      If you have any questions or need help getting started,
                      feel free to contact our support team.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="
                    padding: 20px;
                    background-color: #f9fafb;
                    text-align: center;
                  ">
                    <p style="
                      margin: 0 0 5px;
                      color: #999999;
                      font-size: 12px;
                    ">
                      © ${new Date().getFullYear()} Ooshas Prep.
                      All rights reserved.
                    </p>

                    <p style="
                      margin: 0;
                      color: #999999;
                      font-size: 12px;
                    ">
                      Happy Learning! 📚
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
 
  `;
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


export const otpEmailTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Ooshas Prep OTP</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fb;
        font-family: Arial, Helvetica, sans-serif;
      ">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="padding: 40px 20px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width: 550px;
                  background: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
                "
              >

                <!-- Header -->
                <tr>
                  <td style="
                    background-color:#F36D45;
                    padding: 20px;
                    text-align: center;
                  ">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 26px;
                    ">
                      Ooshas Prep
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 35px 30px;">

                    <h2 style="
                      margin: 0 0 15px;
                      color: #222222;
                      font-size: 22px;
                    ">
                      Login Verification
                    </h2>

                    <p style="
                      margin: 0 0 20px;
                      color: #555555;
                      font-size: 15px;
                      line-height: 1.6;
                    ">
                      Use the following One-Time Password (OTP) to complete
                      your login to Ooshas Prep.
                    </p>

                    <!-- OTP -->
                    <div style="
                      text-align: center;
                      margin: 30px 0;
                    ">
                      <div style="
                        display: inline-block;
                        padding: 15px 30px;
                        background-color: #f3f4f6;
                        border: 1px dashed #4f46e5;
                        border-radius: 8px;
                      ">
                        <span style="
                          font-size: 32px;
                          font-weight: bold;
                          letter-spacing: 8px;
                          color: #4f46e5;
                        ">
                          ${otp}
                        </span>
                      </div>
                    </div>

                    <p style="
                      margin: 0 0 10px;
                      color: #555555;
                      font-size: 14px;
                      text-align: center;
                    ">
                      This OTP will expire in
                      <strong>5 minutes</strong>.
                    </p>

                    <p style="
                      margin: 25px 0 0;
                      color: #777777;
                      font-size: 13px;
                      line-height: 1.5;
                    ">
                      If you did not request this OTP, please ignore this
                      email. Do not share your OTP with anyone.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="
                    padding: 20px;
                    background-color: #f9fafb;
                    text-align: center;
                  ">
                    <p style="
                      margin: 0;
                      color: #999999;
                      font-size: 12px;
                    ">
                      © ${new Date().getFullYear()} Ooshas Prep. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};