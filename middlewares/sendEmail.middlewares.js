import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const { email_service, user, pass } = process.env;

const transporter = nodemailer.createTransport({
  service: process.env.email_service,
  auth: {
    user: user,
    pass: pass,
  },
});

export const sendEmail = (mailOptions) => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};
