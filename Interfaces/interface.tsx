export type ScheduleType = 'daily' | 'alternate' | 'weekly';

export type InvitationContext = {
    params: Promise<{ id: string }>;
};

export interface Medicines {
    _id?: string;
    medicine_name: string;
    quantity: string | Record<string, string>;
    frequency: string;
    dosage_pattern: string;
    times_days: string;
    number_days: string;
    missed_doses?: number;
    is_paused?: boolean;
    paused_at?: string;
    startdate: string;
    schedule_type?: ScheduleType;
    weekly_default_dose?: string;
    weekly_override_dose?: string;
    weekly_days?: number[];
    notificationMessageIds?: string[];
}

export interface Dose {
    time: string;
    dosage: string;
    _id?: string;
}

export type ScheduleDose = {
    _id?: unknown;
    time: string;
    dosage: string;
};

export type ScheduleEntryData = {
    day: number;
    date: string;
    doses: ScheduleDose[];
};

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
    _id: string;
    schedule: ScheduleEntry[];
}

export interface MedicinePayload extends Medicines {
    schedule: ScheduleEntry[];
    _ownerId?: string;
}

export interface Days {
    label: number,
    className: string
}

export interface LowStockItem {
    id?: string;
    name: string;
    details: string;
    minQty: number;
}