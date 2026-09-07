import nodemailer from "nodemailer";
import { sendMeetingMail } from "./EmailTempletes.js";

export const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
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
  try {
    if (!to) {
      throw new Error("Recipient email is required");
    }

    if (!meetingUrl) {
      throw new Error("Meeting URL is required");
    }

    const formatDate = (date) => {
      if (!date) return "";

      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
    };

    const formatTime = (date) => {
      if (!date) return "";

      return new Date(date).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    };

    const getSessionDuration = (start, end) => {
      if (!start || !end) return "";

      const durationMs = new Date(end).getTime() - new Date(start).getTime();

      const totalMinutes = Math.floor(durationMs / (1000 * 60));

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours && minutes) {
        return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`;
      }

      if (hours) {
        return `${hours} hour${hours > 1 ? "s" : ""}`;
      }

      return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    };

    // Format the payload values
    const sessionDate = formatDate(session_start_time);

    const sessionStartTime = formatTime(session_start_time);

    const sessionEndTime = formatTime(session_end_time);

    const sessionDuration = getSessionDuration(
      session_start_time,
      session_end_time,
    );

    // Replace template placeholders
    const html = sendMeetingMail
      .replace(/{{student_name}}/g, student_name || "there")
      .replace(/{{session_date}}/g, sessionDate)
      .replace(/{{session_start_time}}/g, sessionStartTime)
      .replace(/{{session_end_time}}/g, sessionEndTime)
      .replace(/{{time_zone}}/g, "Asia/Kolkata")
      .replace(/{{session_duration}}/g, sessionDuration)
      .replace(/{{session_mode}}/g, "Online")
      .replace(/{{instructor_name}}/g, instructor_name || "")
      .replace(/{{meetingUrl}}/g, meetingUrl)
      .replace(/{{sender_name}}/g, process.env.MAIL_FROM_NAME || "Support Team")
      .replace(/{{sender_title}}/g, "Support Team")
      .replace(/{{sender_contact}}/g, process.env.MAIL_USER || "");

    const subject = `Session Reminder: ${title || "Upcoming Session"}`;

    const mailOptions = {
      from: `"${process.env.MAIL_FROM_NAME || "Support Team"}" <${process.env.MAIL_USER}>`,

      to,

      subject,

      text: `
Hi ${student_name || "there"},

${title || "You are invited to an upcoming session."}

Date: ${sessionDate}
Time: ${sessionStartTime} - ${sessionEndTime} (Asia/Kolkata)
Duration: ${sessionDuration}

Instructor: ${instructor_name || ""}

Join Class:
${meetingUrl}

Regards,
${process.env.MAIL_FROM_NAME || "Support Team"}
      `.trim(),

      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(info.messageId);

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
