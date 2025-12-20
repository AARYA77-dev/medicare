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
    medicine_name: {
        type:String,
        required:true
    },
    quantity: {
        type:String,
        required:true
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
    schedule:[ScheduleEntryModel]
}, { timestamps : true });

export const MedicineSchema= mongoose.models.medicare || mongoose.model("medicare",MedicinesModel)