"use client"
import Header from "@/components/header";
import { Reminder } from "@/Interfaces/interface";
import { ReminderSchema } from "@/Schemas/yupSChemas";
import { useFormik } from "formik";
import Link from 'next/link'
import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaEllipsisV } from "react-icons/fa";

const initialValues: Reminder = {
    reminder: "",
    date: "",
    days: "",
    ChoiceTypeOfReminder: ""
}
const Caring = () => {
    const [buttonLoading, setButtonLoading] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const { errors, values, touched, handleBlur, handleChange, handleSubmit, setFieldValue } = useFormik<Reminder>({
        validationSchema: ReminderSchema,
        initialValues,
        onSubmit: () => {
            setButtonLoading(true)
            console.log("working", values)
        }
    })
    const [open, setOpen] = useState(false);
    const dropDownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleDropDown = (e: MouseEvent) => {
            if (dropDownRef.current && !dropDownRef.current.contains(e.target as Node)) {
                setOpen(false);
            };
        };
        document.addEventListener("click", handleDropDown);
        return () => document.removeEventListener("click", handleDropDown);
    }, [])

    return (
        <div>
            <Header></Header>
            <form onSubmit={handleSubmit}>
                <div className='flex flex-col bg-[linear-gradient(147deg,_#4B4E53_0%,_#000000_74%)] w-[28%] ml-11 items-center justify-between rounded-2xl h-[30%] shadow-2xl xl:px-12'>
                    <label htmlFor="reminder" className="mt-3 font-bold">Add Reminder For:</label>
                    <input type="text" name="reminder" value={values.reminder} placeholder="Ente Reminder" onChange={handleChange} onBlur={handleBlur} className='bg-black placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4]' id="reminder" />
                    {errors.reminder && touched.reminder && <p className="text-red-500">{errors.reminder}</p>}

                    <label htmlFor="">Choose a option</label>
                    <div className="dropdown" ref={dropDownRef}>
                        <div className="select-btn" onClick={() => setOpen(!open)}>
                            <span className="selected">{values.ChoiceTypeOfReminder || "Select an option"}</span>
                            <FaChevronDown aria-hidden="true" className={`arrow ${open ? "rotate" : ""}`} />
                            <div className={`options ${open ? "show" : ""}`}>
                                {["day", "date"].map((opt) => (
                                    <div key={opt} className="option" onClick={() => {
                                        setFieldValue("ChoiceTypeOfReminder", opt)
                                        setOpen(false);
                                    }}>{opt}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {errors.ChoiceTypeOfReminder && touched.ChoiceTypeOfReminder && <p className="text-red-500">{errors.ChoiceTypeOfReminder}</p>}

                    {
                        values.ChoiceTypeOfReminder === "date" && (<><label htmlFor="date" className="mt-2 font-bold">Reminder Date:</label>
                            <input type="date" name="date" value={values.date} onChange={handleChange} onBlur={handleBlur} className='bg-black text-[#03e9f4] mb-2 placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4]' id="date" />
                            {errors.date && touched.date && <p className="text-red-500">{errors.date}</p>}</>)
                    }


                    {
                        values.ChoiceTypeOfReminder === "day" && (
                            <>
                                <input type="number" name="days" value={values.days} onChange={handleChange} onBlur={handleBlur} className='bg-black text-[#03e9f4] mb-2 placeholder-[#03e9f4] rounded-md border-2 border-[#03e9f4]' id="days" />
                                {errors.days && touched.days && <p className="text-red-500">{errors.days}</p>}
                            </>)}
                    <button
                        type="submit"
                        className="flex gap-2 bg-[#03e9f4] text-black font-semibold px-4 mb-6 my-2 py-2 rounded transition duration-150 ease-in-out transform active:scale-75 active:shadow-inner shadow-lg"
                    >{
                            buttonLoading && <div
                                className="h-[23px] w-[23px] animate-spin rounded-full border-4 border-solid border-black border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                                role="status">
                            </div>
                        }Generate Reminder
                    </button>
                    <button type="button" onClick={()=>{setEditOpen(!editOpen)}}><FaEllipsisV /></button>
                    {
                        editOpen && (<button className="top-10 right-0 bg-black border px-3 py-1 rounded shadow hover:bg-gray-100" >Edit</button>)
                    }
                    <Link
                        href="/Caring/Reminder"
                        className="bg-[#03e9f4] text-black font-semibold px-4 mb-6 my-2 py-2 rounded transition duration-150 ease-in-out transform active:scale-75 active:shadow-inner shadow-lg"
                    >Your Reminder</Link>
                </div>
            </form >
        </div >
    )
}

export default Caring;