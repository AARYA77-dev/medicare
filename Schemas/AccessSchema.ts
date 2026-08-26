import mongoose, { Schema, Document, Model } from "mongoose";
import { InvitationRole } from "./InvitationSchema";
import { UserSchema } from "./UserSchema";

export interface IAccess extends Document {
  ownerId: mongoose.Types.ObjectId;
  collaboratorId: mongoose.Types.ObjectId;
  role: InvitationRole;
  invitationId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AccessSchemaInternal = new Schema<IAccess>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: UserSchema, required: [true, "Owner is required"], index: true },
    collaboratorId: { type: Schema.Types.ObjectId, ref: UserSchema, required: [true, "Collaborator is required"], index: true },
    role: {
      type: String,
      required: [true, "Access role is required"],
      enum: {
        values: ['readonly', 'collaborator', 'admin'],
        message: "Access role must be readonly, collaborator, or admin",
      },
    },
    invitationId: { type: Schema.Types.ObjectId, ref: 'Invitation', required: [true, "Invitation is required"] },
  },
  { timestamps: true }
);

// Prevent duplicate access records for same owner-collaborator pair
AccessSchemaInternal.index({ ownerId: 1, collaboratorId: 1 }, { unique: true });

export const AccessSchema: Model<IAccess> =
  mongoose.models.Access ||
  mongoose.model<IAccess>('Access', AccessSchemaInternal);
