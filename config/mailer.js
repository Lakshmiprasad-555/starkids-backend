const nodemailer = require("nodemailer");
let pool = null;
const getTransporter = () => {
  if (pool) return pool;
  pool = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    pool: true, maxConnections: 5, maxMessages: 100,
  });
  console.log("Email pool ready");
  return pool;
};
module.exports = { getTransporter };
