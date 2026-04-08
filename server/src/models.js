import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

function withJson(schema) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    }
  });
}

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "student", enum: ["student", "admin"] },
    referralCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    referralProgress: { type: Number, default: 0 },
    referralCycles: { type: Number, default: 0 },
    bonusDays: { type: Number, default: 0 },
    trialEndsAt: { type: Date, required: true },
    subscriptionEndsAt: { type: Date, default: null }
  },
  { timestamps: true }
);
withJson(userSchema);

const paperSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, trim: true, default: "" },
    year: { type: Number, required: true },
    examType: { type: String, required: true, trim: true },
    filePath: { type: String, required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    views: { type: Number, default: 0 }
  },
  { timestamps: true }
);
paperSchema.index({ courseCode: 1, year: -1 });
withJson(paperSchema);

const uploadSchema = new Schema(
  {
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    title: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, trim: true, default: "" },
    year: { type: Number, required: true },
    examType: { type: String, required: true, trim: true },
    filePath: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);
uploadSchema.index({ uploaderId: 1, createdAt: -1 });
withJson(uploadSchema);

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: { type: String, required: true, default: "active" }
  },
  { timestamps: true }
);
subscriptionSchema.index({ userId: 1, createdAt: -1 });
withJson(subscriptionSchema);

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true },
    checkoutRequestId: { type: String, default: null },
    merchantRequestId: { type: String, default: null },
    mpesaReceiptNumber: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    rawCallback: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ checkoutRequestId: 1 });
transactionSchema.index({ merchantRequestId: 1 });
withJson(transactionSchema);

const rewardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourceType: { type: String, required: true },
    sourceId: { type: String, default: null },
    days: { type: Number, required: true }
  },
  { timestamps: true }
);
withJson(rewardSchema);

const referralSchema = new Schema(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);
referralSchema.index({ referrerId: 1, createdAt: -1 });
withJson(referralSchema);

export const User = models.User || model("User", userSchema);
export const Paper = models.Paper || model("Paper", paperSchema);
export const Upload = models.Upload || model("Upload", uploadSchema);
export const Subscription = models.Subscription || model("Subscription", subscriptionSchema);
export const Transaction = models.Transaction || model("Transaction", transactionSchema);
export const Reward = models.Reward || model("Reward", rewardSchema);
export const Referral = models.Referral || model("Referral", referralSchema);
