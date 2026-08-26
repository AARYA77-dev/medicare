import mongoose, { Schema, Document, Model } from "mongoose";
import { UserSchema } from "./UserSchema";

export type InvitationRole = 'readonly' | 'collaborator' | 'admin';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface IInvitation extends Document {
  ownerId: mongoose.Types.ObjectId;
  inviteeEmail: string;
  inviteeId?: mongoose.Types.ObjectId | null;
  role: InvitationRole;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchemaInternal = new Schema<IInvitation>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: UserSchema, required: [true, "Owner is required"], index: true },
    inviteeEmail: { type: String, required: [true, "Invitee email is required"], lowercase: true, trim: true },
    inviteeId: { type: Schema.Types.ObjectId, ref: UserSchema, default: null },
    role: {
      type: String,
      required: [true, "Invitation role is required"],
      enum: {
        values: ['readonly', 'collaborator', 'admin'],
        message: "Invitation role must be readonly, collaborator, or admin",
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const InvitationSchema: Model<IInvitation> =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>('Invitation', InvitationSchemaInternal);
