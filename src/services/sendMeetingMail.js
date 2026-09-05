import nodemailer from "nodemailer";
import { sendMeetingMail } from "./EmailTempletes.js";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.hostinger.com",
  port: Number(process.env.MAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendMeetingUrlMail = async ({
  to,
  student_name,
  session_start_time,
  session_end_time,
  instructor_name,
  meetingUrl,
  title,
}) => {
  console.log(
    to,
    student_name,
    session_start_time,
    session_end_time,
    instructor_name,
    meetingUrl,
    title,
  );
  return;
  try {
    if (!to) {
      throw new Error("Recipient email is required");
    }

    if (!meetingUrl) {
      throw new Error("Meeting URL is required");
    }

    const subject = meetingTitle
      ? `Meeting Invitation - ${meetingTitle}`
      : "Meeting Invitation";

    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || "Support Team"}" <${process.env.MAIL_USER}>`,
      to,
      subject,

      text: `
Hi ${userName || "there"},

${
  meetingTitle
    ? `You are invited to: ${meetingTitle}`
    : "You are invited to a meeting."
}

${meetingDate ? `Date: ${meetingDate}` : ""}
${meetingTime ? `Time: ${meetingTime}` : ""}

Join Meeting:
${meetingUrl}

Please join the meeting using the link above.

Regards,
${process.env.MAIL_FROM_NAME || "Support Team"}
      `.trim(),

      html: sendMeetingMail,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Meeting invitation email sent successfully",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Meeting mail error:", error);

    return {
      success: false,
      message: error.message || "Failed to send meeting invitation email",
    };
  }
};

export { sendMeetingUrlMail };
