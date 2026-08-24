import mongoose, { Schema, Document, Model } from "mongoose";

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
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
    inviteeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    role: {
      type: String,
      enum: ['readonly', 'collaborator', 'admin'],
      required: true,
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
