import mongoose, { Document, Model } from "mongoose";

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  timezone: string;
  notifiedDoseKeys: string[];
}

const PushSubscriptionSchemaInternal = new mongoose.Schema<IPushSubscription>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    timezone: { type: String, required: true, default: "UTC" },
    notifiedDoseKeys: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const PushSubscriptionSchema: Model<IPushSubscription> =
  mongoose.models.PushSubscription || mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchemaInternal);