const { getTransporter } = require("../config/mailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    await getTransporter().sendMail({
      from: `"${process.env.SCHOOL_NAME}" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    console.log("Email sent:", to);
  } catch (e) { console.error("Email error:", e.message); }
};

const tpl = {
  parentWelcome: (parentName, studentName, email, password) => ({
    subject: `Welcome — ${process.env.SCHOOL_NAME}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:auto">
      <div style="background:#1A237E;padding:20px;text-align:center">
        <h2 style="color:#FFD700;margin:0">Star Kids Connect</h2>
        <p style="color:#fff;margin:4px 0">${process.env.SCHOOL_NAME}</p>
      </div>
      <div style="padding:20px">
        <p>Dear <b>${parentName}</b>,</p>
        <p>Your child <b>${studentName}</b> has been enrolled successfully.</p>
        <p>Your login details:</p>
        <div style="background:#f5f5f5;padding:12px;border-radius:6px">
          <p><b>Email:</b> ${email}</p><p><b>Password:</b> ${password}</p>
        </div>
        <p style="color:red"><b>Please change your password after first login.</b></p>
      </div>
      <div style="background:#1A237E;padding:10px;text-align:center">
        <p style="color:#FFD700;margin:0">"${process.env.SCHOOL_TAGLINE}"</p>
      </div></div>`,
  }),

  teacherWelcome: (name, email, password, cls) => ({
    subject: `Teacher Account — ${process.env.SCHOOL_NAME}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2>Welcome ${name}!</h2>
      <p>You are assigned to <b>Class ${cls}</b>.</p>
      <div style="background:#f5f5f5;padding:12px;border-radius:6px">
        <p><b>Email:</b> ${email}</p><p><b>Password:</b> ${password}</p>
      </div>
      <p style="color:red"><b>Change password after first login.</b></p></div>`,
  }),

  feeReminder: (parentName, studentName, amount, month) => ({
    subject: `Fee Reminder — ${month} | ${process.env.SCHOOL_NAME}`,
    html: `<div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
      <h2 style="color:#E65100">Fee Reminder</h2>
      <p>Dear ${parentName}, fee for <b>${studentName}</b> of <b>Rs.${amount}</b>
      for <b>${month}</b> is pending.</p>
      <p>Please pay at school at the earliest.</p></div>`,
  }),
};

module.exports = { sendEmail, tpl };
