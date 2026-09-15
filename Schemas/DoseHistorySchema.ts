import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDoseHistory extends Document {
  userId: mongoose.Types.ObjectId;
  actionBy: mongoose.Types.ObjectId;
  medicineId: string;
  medicineName: string;
  doseId: string;
  dayNumber: number;
  scheduledDate: string;
  scheduledTime: string;
  dosage: string;
  status: 'completed' | 'missed';
  action: 'completed' | 'skip_and_continue' | 'carry_forward_shift' | 'quantity_unavailable';
  takenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DoseHistorySchemaInternal = new Schema<IDoseHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "User ID is required"],
      index: true,
    },
    actionBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Action performer is required"],
    },
    medicineId: {
      type: String,
      required: [true, "Medicine ID is required"],
      index: true,
    },
    medicineName: {
      type: String,
      required: [true, "Medicine name is required"],
    },
    doseId: {
      type: String,
      required: [true, "Dose ID is required"],
    },
    dayNumber: {
      type: Number,
      default: 1,
    },
    scheduledDate: {
      type: String,
      default: '',
    },
    scheduledTime: {
      type: String,
      default: '',
    },
    dosage: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['completed', 'missed'],
        message: "Status must be either completed or missed",
      },
      required: [true, "Status is required"],
      index: true,
    },
    action: {
      type: String,
      default: 'completed',
    },
    takenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

DoseHistorySchemaInternal.index({ userId: 1, takenAt: -1 });

export const DoseHistorySchema: Model<IDoseHistory> =
  mongoose.models.dose_history ||
  mongoose.model<IDoseHistory>('dose_history', DoseHistorySchemaInternal);
