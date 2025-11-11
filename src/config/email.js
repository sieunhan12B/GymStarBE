// file cấu hình email
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 465,
  secure: true, // true cho cổng 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Kiểm tra kết nối khi khởi động
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Transporter configuration error:', error.message);
  } else {
    console.log('✅ Transporter is ready to send emails');
  }
});

export default transporter;
