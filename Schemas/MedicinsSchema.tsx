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
        type: String,
        required: [true, "Medicine name is required"],
        trim: true,
    },
    quantity: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, "Quantity is required"]
    },
    frequency: {
        type: String,
        required: [true, "Frequency is required"]
    },
    dosage_pattern: {
        type: String,
        required: [true, "Dosage pattern is required"],
        match: [/^[0-9]+(\.[0-9]+)?(,[0-9]+(\.[0-9]+)?)*$/, "Please enter valid numbers for dosage pattern"]
    },
    times_days: {
        type: String,
        required: [true, "Medication times are required"],
        match: [/^([01]\d|2[0-3]):[0-5]\d(,([01]\d|2[0-3]):[0-5]\d)*$/, "Please enter valid times (e.g. 08:00, 20:00)"]
    },
    number_days: {
        type: String,
        required: [true, "Number of days is required"]
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
        type: String,
        required: [true, "Start date is required"]
    },
    schedule_type: {
        type: String,
        enum: ['daily', 'alternate', 'weekly'],
        default: 'daily'
    },
    weekly_default_dose: {
        type: String,
        default: ''
    },
    weekly_override_dose: {
        type: String,
        default: ''
    },
    weekly_days: [{
        type: Number
    }],
    notificationMessageIds: [{
        type: String
    }],
    schedule: [ScheduleEntryModel]
}, { timestamps: true });

MedicinesModel.pre('validate', function (next) {
    if (this.schedule_type === 'weekly') {
        if (!this.weekly_default_dose || String(this.weekly_default_dose).trim() === '') {
            this.invalidate('weekly_default_dose', 'Default daily dose is required for weekly schedule');
        }
        if (!this.weekly_override_dose || String(this.weekly_override_dose).trim() === '') {
            this.invalidate('weekly_override_dose', 'Custom dosage is required for weekly schedule');
        }
        if (!this.weekly_days || this.weekly_days.length === 0) {
            this.invalidate('weekly_days', 'Please select at least 1 day for custom dosage');
        }
    }
    next();
});

export const MedicineSchema = mongoose.models.medicare || mongoose.model("medicare", MedicinesModel);