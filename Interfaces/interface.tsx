export interface Medicines {
    _id?: string;
    medicine_name: string;
    quantity: string | Record<string, string>;
    frequency: string;
    dosage_pattern: string;
    times_days: string;
    number_days: string;
    startdate: string;
}

export interface Dose {
    time: string;
    dosage: string;
    _id?:string;
}



export interface ScheduleEntry {
    day: number;
    date: string;
    doses: Dose[]
}

export interface Reminder {
    reminder: string;
    date: string;
    days: string;
    ChoiceTypeOfReminder: string
}

export interface MedicineWithSchedule extends Medicines {
    _id:string;
    schedule: ScheduleEntry[];
}

export interface Days {
    label: number,
    className: string
}