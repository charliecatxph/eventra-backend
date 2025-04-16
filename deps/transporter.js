require("dotenv").config();
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "mail.smtp2go.com",
  port: process.env.MODE === "PRODUCTION" ? 465 : 2525, // 465 ssl
  secure: process.env.MODE === "PRODUCTION",
  auth: {
    user: process.env.TRANSPORTER_EMAIL,
    pass: process.env.TRANSPORTER_PW,
  },
});

module.exports = transporter;
