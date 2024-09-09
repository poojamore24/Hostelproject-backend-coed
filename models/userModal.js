import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  isApproved: { type: Boolean, default: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, refPath: "role" },
  lastLogin: { type: Date },
  lastLogout: { type: Date },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  resetPasswordOTP: String,
  resetPasswordOTPExpires: Date,
  otp: String,
  otpExpires: Date,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  newEmail: {
    type: String,
    validate: {
      validator: function (v) {
        return v === null || v.length > 0;
      },
      message: "New email cannot be empty",
    },
  },
  emailOtp: String,
  emailOtpExpires: Date,
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);
export default User;
