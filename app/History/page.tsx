'use client';

import Header from '@/components/header';
import ViewAsSelector from '@/components/ViewAsSelector';
import React, { useEffect, useMemo, useState } from 'react';
import Loading from '../loading';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMedicines, fetchDoseHistory } from '@/store/medicineSlice';
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaPills,
  FaCheckCircle,
  FaHourglassHalf,
  FaHistory,
  FaCalendarDay,
  FaCalendarTimes,
} from 'react-icons/fa';

export interface DoseDetail {
  id: string;
  medicineId: string;
  medicineName: string;
  dayNumber: number;
  dateStr: string;
  dateObj: Date;
  time: string;
  dosage: string;
  status: 'today' | 'upcoming' | 'previous' | 'completed' | 'missed';
  action?: string;
  takenAt?: Date | string;
}

interface CalendarDayCell {
  dayNumber: number;
  isCurrentMonth: boolean;
  dateObj: Date;
  isToday: boolean;
  doses: DoseDetail[];
}

const Months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parseSafeDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // 1. ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}/.test(str)) {
    const parts = str.split('T')[0].split(/[\-\/]/).map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Delimited formats: DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, etc.
  const parts = str.split(/[\/\-\.]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [p1, p2] = parts.map(Number);
    let p3 = Number(parts[2]);

    // If 2-digit year (e.g. "26" -> 2026)
    if (p3 < 100) {
      p3 += 2000;
    }

    if (p3 >= 1900 && p3 <= 2100) {
      // In this application, dates are formatted in DD/MM/YYYY
      // If p1 > 12: p1 is definitely Day, p2 is Month (e.g. 18/8/2026)
      if (p1 > 12 && p2 <= 12) {
        const d = new Date(p3, p2 - 1, p1);
        if (!isNaN(d.getTime())) return d;
      }
      // If p2 > 12: p2 is Day, p1 is Month (e.g. 8/18/2026)
      if (p2 > 12 && p1 <= 12) {
        const d = new Date(p3, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
      // If both <= 12 (e.g. "1/9/2026" or "01/09/2026"):
      // Parse as DD/MM/YYYY (Day = 1, Month = 9 -> September 1, 2026)
      const d = new Date(p3, p2 - 1, p1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback
  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }
  return null;
};

const formatDisplayDate = (d: Date): string => {
  if (!d) return '';
  return `${Months[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
};

const formatActionTime = (val?: Date | string): { timeStr: string; dateStr: string } => {
  if (!val) return { timeStr: '', dateStr: '' };
  const d = new Date(val);
  if (isNaN(d.getTime())) return { timeStr: '', dateStr: '' };
  return {
    timeStr: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export default function HistoryCalendarPage() {
  const dispatch = useAppDispatch();
  const { medicines, doseHistory, loading } = useAppSelector((state) => state.medicine);
  const { viewingOwnerId } = useAppSelector((state) => state.sharing);

  useEffect(() => {
    dispatch(fetchMedicines(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
    dispatch(fetchDoseHistory(viewingOwnerId ? { ownerId: viewingOwnerId } : undefined));
  }, [dispatch, viewingOwnerId]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeTab, setActiveTab] = useState<'selected' | 'all' | 'today' | 'upcoming' | 'previous'>('selected');

  const allDoses = useMemo<DoseDetail[]>(() => {
    const extractedDoses: DoseDetail[] = [];

    // 1. Scheduled Doses (from active medicines)
    medicines.forEach((med) => {
      if (med.schedule && Array.isArray(med.schedule)) {
        med.schedule.forEach((sch) => {
          const doseDate = parseSafeDate(sch.date);
          if (doseDate) {
            const doseDateNormalized = new Date(
              doseDate.getFullYear(),
              doseDate.getMonth(),
              doseDate.getDate()
            );
            const timeDiff = doseDateNormalized.getTime() - today.getTime();

            let status: 'today' | 'upcoming' | 'previous' = 'previous';
            if (timeDiff === 0) {
              status = 'today';
            } else if (timeDiff > 0) {
              status = 'upcoming';
            }

            if (sch.doses && Array.isArray(sch.doses)) {
              sch.doses.forEach((d, idx) => {
                extractedDoses.push({
                  id: d._id || `${med._id}-${sch.day}-${idx}`,
                  medicineId: med._id,
                  medicineName: med.medicine_name,
                  dayNumber: sch.day,
                  dateStr: sch.date,
                  dateObj: doseDateNormalized,
                  time: d.time,
                  dosage: d.dosage,
                  status,
                });
              });
            }
          }
        });
      }
    });

    // 2. Historical Doses (Completed and Missed)
    if (doseHistory && Array.isArray(doseHistory)) {
      doseHistory.forEach((hist, idx) => {
        let histDate = parseSafeDate(hist.scheduledDate);
        if (!histDate && hist.takenAt) {
          histDate = parseSafeDate(String(hist.takenAt));
        }
        if (!histDate) {
          histDate = hist.takenAt ? new Date(hist.takenAt) : today;
        }

        const histDateNormalized = new Date(
          histDate.getFullYear(),
          histDate.getMonth(),
          histDate.getDate()
        );

        extractedDoses.push({
          id: hist._id || hist.doseId || `hist-${idx}`,
          medicineId: hist.medicineId,
          medicineName: hist.medicineName,
          dayNumber: hist.dayNumber || 1,
          dateStr: hist.scheduledDate || formatDisplayDate(histDateNormalized),
          dateObj: histDateNormalized,
          time: hist.scheduledTime,
          dosage: hist.dosage,
          status: hist.status,
          action: hist.action,
          takenAt: hist.takenAt,
        });
      });
    }

    extractedDoses.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return extractedDoses;
  }, [medicines, doseHistory, today]);

  // Build calendar grid days
  const buildCalendarGrid = (): CalendarDayCell[] => {
    const grid: CalendarDayCell[] = [];
    const firstDayIndex = new Date(curYear, curMonth, 1).getDay();
    const lastDateOfMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const lastDayIndex = new Date(curYear, curMonth, lastDateOfMonth).getDay();
    const prevMonthLastDate = new Date(curYear, curMonth, 0).getDate();

    for (let i = firstDayIndex; i > 0; i--) {
      const dayNum = prevMonthLastDate - i + 1;
      const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
      const prevYear = curMonth === 0 ? curYear - 1 : curYear;
      const cellDate = new Date(prevYear, prevMonth, dayNum);

      grid.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateObj: cellDate,
        isToday: isSameDay(cellDate, today),
        doses: allDoses.filter((d) => isSameDay(d.dateObj, cellDate)),
      });
    }

    for (let i = 1; i <= lastDateOfMonth; i++) {
      const cellDate = new Date(curYear, curMonth, i);
      grid.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateObj: cellDate,
        isToday: isSameDay(cellDate, today),
        doses: allDoses.filter((d) => isSameDay(d.dateObj, cellDate)),
      });
    }

    for (let i = lastDayIndex; i < 6; i++) {
      const dayNum = i - lastDayIndex + 1;
      const nextMonth = curMonth === 11 ? 0 : curMonth + 1;
      const nextYear = curMonth === 11 ? curYear + 1 : curYear;
      const cellDate = new Date(nextYear, nextMonth, dayNum);

      grid.push({
        dayNumber: dayNum,
        isCurrentMonth: false,
        dateObj: cellDate,
        isToday: isSameDay(cellDate, today),
        doses: allDoses.filter((d) => isSameDay(d.dateObj, cellDate)),
      });
    }

    return grid;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newMonth = direction === 'prev' ? curMonth - 1 : curMonth + 1;
    let newYear = curYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurMonth(newMonth);
    setCurYear(newYear);
  };

  if (loading && medicines.length === 0 && (!doseHistory || doseHistory.length === 0)) {
    return <Loading />;
  }

  const calendarGrid = buildCalendarGrid();

  const todayDoses = allDoses.filter(
    (d) => isSameDay(d.dateObj, today) || d.status === 'today'
  );
  const upcomingDoses = allDoses.filter((d) => d.status === 'upcoming');
  const previousDoses = allDoses
    .filter((d) => d.status === 'previous' || d.status === 'completed' || d.status === 'missed')
    .sort((a, b) => {
      const timeA = a.takenAt ? new Date(a.takenAt).getTime() : a.dateObj.getTime();
      const timeB = b.takenAt ? new Date(b.takenAt).getTime() : b.dateObj.getTime();
      return timeB - timeA;
    });

  const completedCount = previousDoses.filter((d) => d.status === 'completed').length;
  const missedCount = previousDoses.filter((d) => d.status === 'missed').length;

  let displayedDoses: DoseDetail[] = [];
  if (activeTab === 'selected') {
    displayedDoses = allDoses.filter((d) => isSameDay(d.dateObj, selectedDate));
  } else if (activeTab === 'today') {
    displayedDoses = todayDoses;
  } else if (activeTab === 'upcoming') {
    displayedDoses = upcomingDoses;
  } else if (activeTab === 'previous') {
    displayedDoses = previousDoses;
  } else {
    displayedDoses = allDoses;
  }

  const getStatusBadge = (status: 'today' | 'upcoming' | 'previous' | 'completed' | 'missed') => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]">
            <FaCheckCircle className="text-[10px]" /> Completed
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]">
            <FaCalendarTimes className="text-[10px]" /> Missed
          </span>
        );
      case 'today':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#03e9f4]/20 text-[#03e9f4] border border-[#03e9f4]/40 shadow-[0_0_8px_rgba(3,233,244,0.4)]">
            <FaClock className="text-[10px]" /> Scheduled Today
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <FaHourglassHalf className="text-[10px]" /> Upcoming
          </span>
        );
      case 'previous':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <FaHistory className="text-[10px]" /> Past Due
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col relative overflow-hidden">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <ViewAsSelector />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-[#03e9f4] flex items-center gap-3">
              <FaCalendarAlt className="text-[#03e9f4]" /> Medicine Schedule Calendar
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              View past dose history, today&apos;s scheduled medication, and upcoming doses
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 shadow-md">
              <div className="w-3 h-3 rounded-full bg-[#03e9f4] shadow-[0_0_8px_#03e9f4]" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Today</p>
                <p className="text-lg font-bold text-[#03e9f4]">{todayDoses.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 shadow-md">
              <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Upcoming</p>
                <p className="text-lg font-bold text-blue-400">{upcomingDoses.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 shadow-md">
              <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Previous History</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-purple-300">{previousDoses.length}</p>
                  {(completedCount > 0 || missedCount > 0) && (
                    <span className="text-[10px] text-gray-400">
                      ({completedCount} done, {missedCount} missed)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 border border-white/10 rounded-2xl sm:rounded-3xl bg-white/5 backdrop-blur-xl p-3.5 sm:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border-b-[#03e9f4]/30">
            <div className="flex items-center justify-between mb-4 sm:mb-6 px-1 sm:px-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                {Months[curMonth]} <span className="text-[#03e9f4]">{curYear}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMonthChange('prev')}
                  className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl text-[#03e9f4] hover:bg-[#03e9f4]/10 hover:border-[#03e9f4]/50 transition-all cursor-pointer"
                  title="Previous Month"
                >
                  <FaChevronLeft size={13} />
                </button>
                <button
                  onClick={() => {
                    setCurMonth(today.getMonth());
                    setCurYear(today.getFullYear());
                    setSelectedDate(today);
                    setActiveTab('selected');
                  }}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-[#03e9f4] transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => handleMonthChange('next')}
                  className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-xl text-[#03e9f4] hover:bg-[#03e9f4]/10 hover:border-[#03e9f4]/50 transition-all cursor-pointer"
                  title="Next Month"
                >
                  <FaChevronRight size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center mb-2 sm:mb-3 font-semibold text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider">
              <span><span className="hidden sm:inline">Sun</span><span className="sm:hidden">Su</span></span>
              <span><span className="hidden sm:inline">Mon</span><span className="sm:hidden">Mo</span></span>
              <span><span className="hidden sm:inline">Tue</span><span className="sm:hidden">Tu</span></span>
              <span><span className="hidden sm:inline">Wed</span><span className="sm:hidden">We</span></span>
              <span><span className="hidden sm:inline">Thu</span><span className="sm:hidden">Th</span></span>
              <span><span className="hidden sm:inline">Fri</span><span className="sm:hidden">Fr</span></span>
              <span><span className="hidden sm:inline">Sat</span><span className="sm:hidden">Sa</span></span>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarGrid.map((cell, idx) => {
                const isSelected = isSameDay(cell.dateObj, selectedDate);
                const hasDoses = cell.doses.length > 0;
                const hasTodayDose = cell.doses.some((d) => d.status === 'today');
                const hasUpcomingDose = cell.doses.some((d) => d.status === 'upcoming');
                const hasCompletedDose = cell.doses.some((d) => d.status === 'completed');
                const hasMissedDose = cell.doses.some((d) => d.status === 'missed');
                const hasPreviousDose = cell.doses.some((d) => d.status === 'previous');

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.dateObj);
                      setActiveTab('selected');
                    }}
                    className={`min-h-[46px] sm:min-h-[72px] p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between items-center relative group cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'opacity-30 border-white/5 bg-transparent text-gray-500'
                        : isSelected
                        ? 'border-[#03e9f4] bg-[#03e9f4]/15 shadow-[0_0_15px_rgba(3,233,244,0.3)] text-white'
                        : cell.isToday
                        ? 'border-[#03e9f4]/50 bg-white/10 text-[#03e9f4]'
                        : 'border-white/10 bg-white/5 hover:border-[#03e9f4]/30 hover:bg-white/10 text-gray-200'
                    }`}
                  >
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        cell.isToday
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#03e9f4] text-black flex items-center justify-center text-[10px] sm:text-xs'
                          : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasDoses && (
                      <div className="flex flex-col items-center gap-0.5 sm:gap-1 w-full mt-0.5 sm:mt-1">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap max-w-full">
                          {hasCompletedDose && (
                            <span
                              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
                              title="Completed Dose"
                            />
                          )}
                          {hasMissedDose && (
                            <span
                              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                              title="Missed Dose"
                            />
                          )}
                          {hasTodayDose && (
                            <span
                              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#03e9f4] shadow-[0_0_6px_#03e9f4]"
                              title="Today's Scheduled Dose"
                            />
                          )}
                          {hasUpcomingDose && (
                            <span
                              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]"
                              title="Upcoming Scheduled Dose"
                            />
                          )}
                          {hasPreviousDose && (
                            <span
                              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]"
                              title="Past Due Dose"
                            />
                          )}
                        </div>
                        <span className="hidden sm:inline text-[10px] font-semibold tracking-tighter opacity-80 scale-90">
                          {cell.doses.length} {cell.doses.length === 1 ? 'dose' : 'doses'}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 border border-white/10 rounded-2xl sm:rounded-3xl bg-white/5 backdrop-blur-xl p-4 sm:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] border-b-[#03e9f4]/30 flex flex-col">
            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 pb-2.5 rounded-2xl border border-white/10 mb-6 overflow-x-auto theme-scrollbar scroll-smooth">
              <button
                onClick={() => setActiveTab('selected')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'selected'
                    ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Selected Day
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'today'
                    ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Today ({todayDoses.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'upcoming'
                    ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Upcoming ({upcomingDoses.length})
              </button>
              <button
                onClick={() => setActiveTab('previous')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'previous'
                    ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Previous ({previousDoses.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'all'
                    ? 'bg-[#03e9f4] text-black shadow-md shadow-[#03e9f4]/20 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All ({allDoses.length})
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FaCalendarDay className="text-[#03e9f4]" />
                {activeTab === 'selected'
                  ? `Doses for ${formatDisplayDate(selectedDate)}`
                  : activeTab === 'today'
                  ? "Today's Medication Doses"
                  : activeTab === 'upcoming'
                  ? 'Upcoming Scheduled Doses'
                  : activeTab === 'previous'
                  ? 'Previous Doses History'
                  : 'All Scheduled & Recorded Doses'}
              </h3>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[480px] pr-1 theme-scrollbar">
              {displayedDoses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 space-y-3">
                  <FaPills className="text-4xl text-gray-600" />
                  <p className="text-sm font-medium">No doses found for this selection</p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    {activeTab === 'previous'
                      ? 'No previous doses recorded yet. Doses marked completed or missed will appear here.'
                      : 'Select another date on the calendar or add a new medicine schedule.'}
                  </p>
                </div>
              ) : (
                displayedDoses.map((dose) => {
                  const actionTime = dose.takenAt ? formatActionTime(dose.takenAt) : null;
                  return (
                    <div
                      key={dose.id}
                      className={`p-4 border rounded-2xl bg-white/5 backdrop-blur-md transition-all space-y-3 relative group ${
                        dose.status === 'completed'
                          ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                          : dose.status === 'missed'
                          ? 'border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5'
                          : 'border-white/10 hover:border-[#03e9f4]/40 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-bold text-white group-hover:text-[#03e9f4] transition-colors">
                            {dose.medicineName}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Day {dose.dayNumber} • {dose.dateStr}
                          </p>
                        </div>
                        {getStatusBadge(dose.status)}
                      </div>

                      {/* Action Timestamp and Details for Completed Doses */}
                      {dose.status === 'completed' && actionTime && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                            <FaCheckCircle className="text-emerald-400 shrink-0 text-sm" />
                            <span>Marked as Completed:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs">
                              {actionTime.timeStr}
                            </span>
                            <span className="text-[11px] text-emerald-400/80 font-medium">
                              {actionTime.dateStr}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Timestamp and Details for Missed Doses */}
                      {dose.status === 'missed' && actionTime && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                            <FaCalendarTimes className="text-amber-400 shrink-0 text-sm" />
                            <span>
                              Marked as Missed
                              {dose.action === 'skip_and_continue'
                                ? ' (Skipped & Added to End)'
                                : dose.action === 'carry_forward_shift'
                                ? ' (Shifted Forward)'
                                : dose.action === 'quantity_unavailable'
                                ? ' (Zero Quantity)'
                                : ''}
                              :
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs">
                              {actionTime.timeStr}
                            </span>
                            <span className="text-[11px] text-amber-400/80 font-medium">
                              {actionTime.dateStr}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="text-[#03e9f4]" />
                          <span className="text-gray-400">Scheduled:</span>
                          <span className="font-mono font-semibold text-white">{dose.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                          <FaPills className="text-[#03e9f4]" />
                          <span className="font-semibold text-white">{dose.dosage}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
