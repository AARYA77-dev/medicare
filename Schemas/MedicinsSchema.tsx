import mongoose from "mongoose"

const DoseModel = new mongoose.Schema({
    time: {
        type: String,
        required:true
    },
    dosage: {
        type: String,
        required:true
    },
})

const ScheduleEntryModel = new mongoose.Schema({
    day: {
        type:Number,
        required:true
    },
    date: {
        type:String,
        required:true
    },
    doses: [DoseModel],
})

const MedicinesModel = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    medicine_name: {
        type:String,
        required:true
    },
    quantity: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    frequency: {
        type:String,
        required:true
    },
    dosage_pattern: {
        type:String,
        required:true
    },
    times_days: {
        type:String,
        required:true
    },
    number_days: {
        type:String,
        required:true
    },
    startdate: {
        type:String,
        required:true
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
    schedule:[ScheduleEntryModel]
}, { timestamps : true });

export const MedicineSchema= mongoose.models.medicare || mongoose.model("medicare",MedicinesModel)