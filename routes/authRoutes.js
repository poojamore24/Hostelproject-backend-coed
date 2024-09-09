import express from "express";
import multer from "multer";
import {
  register,
  logout,
  generateAndSendOTP,
  verifyRegistrationOtp,
  login,
} from "../controllers/authcontroller.js";

import crypto from "crypto";

import nodemailer from "nodemailer";
import User from "../models/userModal.js";
import { token } from "morgan";
import { checkPermission } from "../middlewares/permissionMiddleware.js";
import { determineRole } from "../middlewares/determinrole.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
router.post(
  "/register",
  upload.fields([
    { name: "passportPhoto", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
  ]),
  register
);

router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/login", determineRole, checkPermission("login", "write"), login);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", generateAndSendOTP);

// Send OTP to Email
router.post("/send-email-otp", async (req, res) => {
  try {
    const { profileId, newEmail } = req.body;
    const user = await User.findOne({ profileId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if the new email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.emailOtp = otp;
    user.emailOtpExpires = Date.now() + 300000; // 5 minutes
    user.newEmail = newEmail; // Store the new email temporarily
    await user.save();

    // Send OTP to the new email using Nodemailer
    const mailOptions = {
      to: newEmail,
      from: "noreply@stayhomehostels.com",
      subject: "Email Change OTP",
      text: `Your OTP for email change is ${otp}. It will expire in 5 minutes.`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "OTP sent to new email successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

router.post("/verify-email-otp", async (req, res) => {
  try {
    const { profileId, otp } = req.body;
    const user = await User.findOne({ profileId });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.emailOtp !== otp) {
      return res.status(401).json({ success: false, error: "Invalid OTP" });
    }

    if (user.emailOtpExpires < Date.now()) {
      return res.status(401).json({ success: false, error: "OTP has expired" });
    }

    if (!user.newEmail) {
      return res
        .status(400)
        .json({ success: false, error: "No new email address found" });
    }

    // Change email
    user.email = user.newEmail;

    // Clear OTP and temporary fields
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    user.newEmail = undefined;

    try {
      await user.save();
      res.json({ success: true, message: "Email changed successfully" });
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      if (saveError.name === "ValidationError") {
        return res
          .status(400)
          .json({ success: false, error: saveError.message });
      }
      throw saveError; // re-throw if it's not a validation error
    }
  } catch (error) {
    console.error("Error in verify-email-otp:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: user.email,
      from: "noreply@stayhomehostels.com",
      subject: "Stay Home Hostels Password Reset",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        https://hostelbackend-tzrj.onrender.com/reset?token=${resetToken}
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset email sent", token });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to handle password reset token verification
router.get("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired" });
    }

    // If token is valid, send a response to display the password reset form
    res.json({ message: "Token is valid" }); // You might want to handle this in a more user-friendly manner
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to handle new password submission
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired" });
    }

    // Set new password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password has been updated" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
