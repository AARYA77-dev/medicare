import * as Yup from "yup";

export const MedicineSchema = Yup.object({
    medicine_name: Yup.string().required("please enter Medicine Name"),
    quantity: Yup.mixed()
        .test("quantity-required", "please enter Quantity", (value) => {
            if (value === undefined || value === null) return false;
            if (typeof value === "string") return value.trim().length > 0;
            if (typeof value === "object") {
                const vals = Object.values(value as Record<string, any>);
                return vals.length > 0 && vals.every(v => v !== undefined && v !== null && String(v).trim().length > 0);
            }
            return false;
        })
        .required("please enter Quantity"),
    frequency: Yup.string().required("please enter Frequancy"),
    dosage_pattern: Yup.string().matches(/^[0-9]+(\.[0-9]+)?(,[0-9]+(\.[0-9]+)?)*$/, 'Please enter valid numbers for dosage').required("please enter Dosage Pattern"),
    times_days: Yup.string()
        .matches(
            /^([01]\d|2[0-3]):[0-5]\d(,([01]\d|2[0-3]):[0-5]\d)*$/,
            'Please enter valid times (e.g., 10:00, 20:30)'
        )
        .required("please enter Time of Day"),
    number_days: Yup.string().required("please enter no. of Days"),
    startdate: Yup.string().required("please enter Start Date"),
})

export const ReminderSchema = Yup.object({
    reminder: Yup.string().required("please enter Reminder"),
    ChoiceTypeOfReminder: Yup.string().required("please select an option"),
    date: Yup.string().when("ChoiceTypeOfReminder", {
        is: "date",
        then: (schema) => schema.required("please enter Date"),
        otherwise: (schema) => schema.notRequired()
    }),
    days: Yup.string().when("ChoiceTypeOfReminder", {
        is: "day",
        then: (schema) => schema.required("please enter Days"),
        otherwise: (schema) => schema.notRequired()
    }),
})