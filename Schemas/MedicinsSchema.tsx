import mongoose from "mongoose"

const DoseModel = new mongoose.Schema({
    time: {
        type: String,
        required:[true, "Dose time is required"]
    },
    dosage: {
        type: String,
        required:[true, "Dose dosage is required"]
    },
})

const ScheduleEntryModel = new mongoose.Schema({
    day: {
        type:Number,
        required:[true, "Schedule day is required"]
    },
    date: {
        type:String,
        required:[true, "Schedule date is required"]
    },
    doses: [DoseModel],
})

const MedicinesModel = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required"],
        index: true,
    },
    medicine_name: {
        type:String,
        required:[true, "Medicine name is required"]
    },
    quantity: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, "Quantity is required"]
    },
    frequency: {
        type:String,
        required:[true, "Frequency is required"]
    },
    dosage_pattern: {
        type:String,
        required:[true, "Dosage pattern is required"]
    },
    times_days: {
        type:String,
        required:[true, "Medication times are required"]
    },
    number_days: {
        type:String,
        required:[true, "Number of days is required"]
    },
    missed_doses: {
        type: Number,
        default: 0
    },
    is_paused: {
        type: Boolean,
        default: false
    },
    paused_at: {
        type: Date
    },
    startdate: {
        type:String,
        required:[true, "Start date is required"]
    },
    schedule_type: {
        type: String,
        enum: ['daily', 'alternate', 'weekly'],
        default: 'daily'
    },
    weekly_default_dose: {
        type: String
    },
    weekly_override_dose: {
        type: String
    },
    weekly_days: [{
        type: Number
    }],
    notificationMessageIds: [{
        type: String
    }],
    schedule:[ScheduleEntryModel]
}, { timestamps : true });

export const MedicineSchema= mongoose.models.medicare || mongoose.model("medicare",MedicinesModel)