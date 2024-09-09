import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  date: { type: Date, default: Date.now },
});

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  description: String,
  isAnonymous: Boolean,
  images: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["open", "noticed", "resolved"],
    default: "open",
  },
  complaintType: {
    type: String,
    enum: ["Rooms", "Washroom", "Wi-Fi", "Cleanliness", "Food"],
    required: false,
  },
});
const rentStructureSchema = new mongoose.Schema({
  studentsPerRoom: { type: Number, required: true },
  rentPerStudent: { type: Number, required: true },
});
const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "Owner", required: true },
  number: { type: String, required: true },
  address: { type: String, required: true },
  hostelType: {
    type: String,
    enum: ["boys", "girls", "cowed"],
    required: true,
  },
  beds: { type: Number, required: true, default: 0 },
  studentsPerRoom: { type: Number, required: true, default: 0 },
  food: {
    type: Boolean,
    default: false,
  },
  images: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
  verified: { type: Boolean, default: false },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
  pendingVisits: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      visitDate: Date,
      visitTime: String,
    },
  ],
  rentStructure: [rentStructureSchema],
  feedback: [feedbackSchema],
  complaints: [complaintSchema],
});

hostelSchema.index({ owner: 1 });
hostelSchema.index({ name: 1 });

const Hostel = mongoose.model("Hostel", hostelSchema);

export default Hostel;
