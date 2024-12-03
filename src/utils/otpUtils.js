const nodemailer = require('nodemailer');
require('dotenv').config();

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.sendOTPEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });
    const mailOptions = {
      from: `"Orderly" <${process.env.EMAIL}>`,
      to: email,
      subject: 'Your OTP for Account Verification',
      html: `
              <h1>Account Verification</h1>
              <p>Your OTP for account verification is</p>
              <h2>${otp}</h2>
              <p>This OTP is valid for 10 minutes.</p>
              <p>If you did not request this, please ignore this email.</p>
            `,
    };
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent successfully' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
