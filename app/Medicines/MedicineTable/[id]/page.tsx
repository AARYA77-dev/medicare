"use client"
import Loading from '@/app/loading';
import { MedicineWithSchedule } from '@/Interfaces/interface';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Image from "next/image";
import { useAppSelector } from '@/store/hooks';

const MedicineTablePage = () => {
    const { medicines } = useAppSelector((state) => state.medicine);
    const [medicineData, setMedicineData] = useState<MedicineWithSchedule>();
    const [loading, setLoading] = useState(false);
    const { id } = useParams();

    useEffect(() => {
        const existing = medicines.find((m) => m._id === id);
        if (existing) {
            Promise.resolve(existing).then(setMedicineData);
            return;
        }

        Promise.resolve().then(() => {
            setLoading(true);
            axios.get(`/api/medicareDB/${id}`)
                .then((response) => {
                    setMedicineData(response.data.result);
                })
                .catch((error) => {
                    console.log("Error:", error);
                    toast.error("Something went wrong");
                })
                .finally(() => {
                    setLoading(false);
                });
        });
    }, [id, medicines]);

    if (loading === true) {
        return (<Loading />)
    }

    return (
        <div className="min-h-screen overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-2 pb-4">
                <p className='my-2 min-w-0 flex-1 text-2xl font-bold sm:text-4xl'>Your Medicine Schedule</p>
                <Link href="/Medicines" className='rounded bg-[#03e9f4] px-3 py-2 text-sm font-semibold text-black shadow-lg transition duration-150 ease-in-out hover:bg-[#00c5cf] active:scale-95 sm:px-4'>Back</Link>
                <Link href="/Home" className='rounded bg-[#03e9f4] px-3 py-2 text-sm font-semibold text-black shadow-lg transition duration-150 ease-in-out hover:bg-[#00c5cf] active:scale-95 sm:px-4'>Home</Link>
            </div>
            <div className="box box-2 mx-auto w-full max-w-7xl">
                {!medicineData ? (
                   <div className="flex items-center justify-center gap-1 h-screen">
                               <Image
                                 src="/not_found.png"
                                 height={62}
                                 width={162}
                                 alt="logo"
                               />
                               <h1 className="font-mono text-5xl">No medicines found</h1>
                             </div>
                ) : (
                    <>
                        <div className="info-box">
                            <div className="info-item">
                                <span className="label">Name:</span>
                                <span className="value">{medicineData.medicine_name}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Quantity:</span>
                                <span className="value">
                                    {typeof medicineData.quantity === 'object' && medicineData.quantity !== null ? (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {Object.entries(medicineData.quantity).map(([dose, qty]) => (
                                                <span key={dose} className="bg-[#03e9f4]/20 border border-[#03e9f4] text-white px-2 py-0.5 rounded text-xs">
                                                    {dose}: {qty} pills
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        medicineData.quantity
                                    )}
                                </span>
                            </div>
                            <div className="info-item">
                                <span className="label">Total Course:</span>
                                <span className="value">{medicineData.number_days} Days</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Remaining:</span>
                                <span className="value">{medicineData.schedule.length} {medicineData.schedule.length === 1 ? 'Day' : 'Days'} Left</span>
                            </div>
                              <div className="info-item">
                                <span className="label">Missed:</span>
                                                                <span className="value">{medicineData.missed_doses || 0} {medicineData.missed_doses === 1 ? 'Dose' : 'Doses'}</span>
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="table-ocean">
                                <thead>
                                    <tr>
                                        <th className='text-center'>Date</th>
                                        <th className='text-center'>Day</th>
                                        <th className='text-center'>Time</th>
                                        <th className='text-center'>Dose</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {medicineData.schedule && medicineData.schedule.map((item, id: number) => (
                                        <tr key={id}>
                                            <td className='text-center '>{item.date}</td>
                                            <td className='text-center '>Day {item.day}</td>
                                            <td className='text-center no-padding'>
                                                {
                                                    item.doses.map((tim, idx: number) => (
                                                        <div key={idx} style={{
                                                            border: item.doses.length > 1 ? "1px solid #800080" : "none",
                                                            width: "100%",
                                                            display: "block",
                                                            padding: "0.5rem 1.5rem"
                                                        }} >{tim.time}</div>
                                                    ))
                                                }
                                            </td>
                                            <td className='text-center no-padding'>
                                                {
                                                    item.doses.map((dos, idy: number) => (
                                                        <div key={idy} style={{
                                                            border: item.doses.length > 1 ? '1px solid #800080' : "none",
                                                            width: "100%",
                                                            display: "block",
                                                            padding: "0.5rem 1.5rem"
                                                        }}>{dos.dosage}</div>
                                                    ))
                                                }
                                            </td>
                                        </tr>
                                    ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default MedicineTablePage