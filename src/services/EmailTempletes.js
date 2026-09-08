export const sendMeetingMail = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<!--[if gte mso 9]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Session Confirmation - Ooshas Prep</title>
<style type="text/css">
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
  @media only screen and (max-width:620px) {
    .email-container { width:100% !important; }
    .stack { display:block !important; width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:20px !important; }
    .detail-label { width:38% !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#EEF1F5; font-family:'Segoe UI', Helvetica, Arial, sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Your 1:1 session with {{instructor_name}} is confirmed for {{session_date}} at {{session_start_time}}.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EEF1F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(19,38,58,0.06);">

          <!-- Header / Logo band -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#0B5E7A,#0879A1); padding:28px 24px;">
              <img src="https://www.ooshasprep.com/image/logo.png" width="140" alt="Ooshas Prep" style="display:block; width:140px; max-width:60%; height:auto;">
            </td>
          </tr>

          <!-- Ribbon strip -->
          <tr>
            <td style="background-color:#F4A61A; height:5px; line-height:5px; font-size:0;">&nbsp;</td>
          </tr>

          <!-- Title -->
          <tr>
            <td class="px" style="padding:32px 40px 8px 40px;">
              <p style="margin:0; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#0879A1;">Session Confirmed</p>
              <h1 class="h1" style="margin:6px 0 0 0; font-size:24px; line-height:1.3; color:#13263A; font-weight:700;">Your 1:1 session is scheduled</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td class="px" style="padding:16px 40px 0 40px; font-size:15px; line-height:1.6; color:#3C4A5C;">
              <p style="margin:0;">Hi {{student_name}},</p>
              <p style="margin:12px 0 0 0;">This is to confirm your upcoming 1:1 session has been scheduled. Full details are below — please review and let us know right away if anything needs to change.</p>
            </td>
          </tr>

          <!-- Session Details Card -->
          <tr>
            <td class="px" style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F9FB; border:1px solid #E1EBF0; border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px 12px 24px;">
                    <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#0879A1;">Session Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#13263A;">
                      <tr>
                        <td class="detail-label" style="padding:6px 0; width:34%; color:#6B7A8D; vertical-align:top;">Date</td>
                        <td style="padding:6px 0; font-weight:600;">{{session_date}}</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:6px 0; width:34%; color:#6B7A8D; vertical-align:top;">Time</td>
                        <td style="padding:6px 0; font-weight:600;">{{session_start_time}} &ndash; {{session_end_time}} ({{time_zone}})</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:6px 0; width:34%; color:#6B7A8D; vertical-align:top;">Duration</td>
                        <td style="padding:6px 0; font-weight:600;">{{session_duration}}</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:6px 0; width:34%; color:#6B7A8D; vertical-align:top;">Mode</td>
                        <td style="padding:6px 0; font-weight:600;">{{session_mode}}</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:6px 0; width:34%; color:#6B7A8D; vertical-align:top;">Instructor</td>
                        <td style="padding:6px 0; font-weight:600;">{{instructor_name}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:32px 40px 8px 40px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{meetingUrl}}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="#0879A1">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;">Join Class</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="{{meetingUrl}}" target="_blank" style="display:inline-block; background-color:#0879A1; color:#FFFFFF; font-size:16px; font-weight:700; text-decoration:none; padding:15px 42px; border-radius:8px; box-shadow:0 3px 8px rgba(8,121,161,0.35);">
                Join Class
              </a>
              <!--<![endif]-->
              <p style="margin:14px 0 0 0; font-size:12px; color:#8A96A3;">Save this link — it will work at your scheduled time.</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <div style="border-top:1px solid #EDEFF2;"></div>
            </td>
          </tr>

          <!-- Agenda -->
          <tr>
            <td class="px" style="padding:24px 40px 0 40px;">
              <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#13263A;">Agenda for this session</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#3C4A5C; line-height:1.6;">
                <tr><td style="padding:4px 0; vertical-align:top; width:20px; color:#0879A1;">&#8226;</td><td style="padding:4px 0;">Review of progress since last session</td></tr>
                <tr><td style="padding:4px 0; vertical-align:top; width:20px; color:#0879A1;">&#8226;</td><td style="padding:4px 0;">Current challenges or blockers</td></tr>
                <tr><td style="padding:4px 0; vertical-align:top; width:20px; color:#0879A1;">&#8226;</td><td style="padding:4px 0;">Goals and priorities going forward</td></tr>
                <tr><td style="padding:4px 0; vertical-align:top; width:20px; color:#0879A1;">&#8226;</td><td style="padding:4px 0;">Open discussion / feedback</td></tr>
              </table>
            </td>
          </tr>

          <!-- Closing note -->
          <tr>
            <td class="px" style="padding:20px 40px 0 40px; font-size:14px; line-height:1.6; color:#3C4A5C;">
              <p style="margin:0;">Please come prepared with any updates or topics you'd like to discuss. If this time doesn't work for you, let us know as soon as possible so we can reschedule.</p>
              <p style="margin:16px 0 0 0;">Looking forward to your conversation.</p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td class="px" style="padding:20px 40px 0 40px; font-size:14px; line-height:1.5; color:#13263A;">
              <p style="margin:0; font-weight:700;">{{sender_name}}</p>
              <p style="margin:2px 0 0 0; color:#6B7A8D;">{{sender_title}}</p>
              <p style="margin:2px 0 0 0; color:#6B7A8D;">{{sender_contact}}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <div style="border-top:1px solid #EDEFF2;"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 40px 32px 40px;">
              <p style="margin:0 0 4px 0; font-size:15px; font-weight:700; color:#0B5E7A; letter-spacing:0.02em;">Ooshas Prep</p>
              <p style="margin:0; font-size:12px; color:#8A96A3; line-height:1.6;">
                Questions? Reply to this email or call us at <a href="tel:+918302092630" style="color:#8A96A3; text-decoration:underline;">+91-8302092630</a>.<br>
                We are always here to help.
              </p>
            </td>
          </tr>

        </table>

        <!-- Sub-footer outside card -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px;">
          <tr>
            <td align="center" style="padding:20px 24px; font-size:11px; color:#9AA5B1; line-height:1.6;">
              &copy; 2026 Ooshas Prep. All rights reserved.<br>
              You're receiving this email because you have an active session scheduled with Ooshas Prep.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
