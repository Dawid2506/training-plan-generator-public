import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendRegistrationEmail = async (to: string, username: string) => {
  await transporter.sendMail({
    from: `"DTstandard" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Registration completed successfully',
    text: `Hi ${username},\nYour registration was successful!`,
  });
};