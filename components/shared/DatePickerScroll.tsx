import React, { useState, useEffect } from "react";

interface DatePickerScrollProps {
  value: string;
  onChange: (value: string) => void;
}

const DatePickerScroll: React.FC<DatePickerScrollProps> = ({ value, onChange }) => {
  const today = new Date();

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: 80 }, (_, i) => today.getFullYear() - i);

  // Initialize from value (YYYY-MM-DD) or today
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      if (y && m && d) {
        setYear(String(y));
        setMonth(months[m - 1] || months[today.getMonth()]);
        setDay(String(d));
        return;
      }
    }
    setDay(today.getDate().toString());
    setMonth(months[today.getMonth()]);
    setYear(today.getFullYear().toString());
  }, [value]);

  const emitChange = (d: string, m: string, y: string) => {
    const monthIndex = months.indexOf(m);
    if (monthIndex === -1) return;
    const dayNum = Number(d);
    const yearNum = Number(y);
    if (!dayNum || !yearNum) return;
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    const formatted = `${yearNum}-${mm}-${dd}`;
    onChange(formatted);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setDay(v);
    emitChange(v, month, year);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setMonth(v);
    emitChange(day, v, year);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setYear(v);
    emitChange(day, month, v);
  };

  return (
    <div className="flex gap-4">
      {/* Day */}
      <div className="w-32">
        <label className="block text-xs font-medium text-slate-600 mb-1">Day</label>
        <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
          <select
            value={day}
            onChange={handleDayChange}
            size={5}
            className="block w-full h-9 overflow-y-auto text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer px-2 py-1 bg-white"
          >
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month */}
      <div className="w-52">
        <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
        <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
          <select
            value={month}
            onChange={handleMonthChange}
            size={5}
            className="block w-full h-9 overflow-y-auto text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer px-2 py-1 bg-white"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Year */}
      <div className="w-40">
        <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
        <div className="border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
          <select
            value={year}
            onChange={handleYearChange}
            size={5}
            className="block w-full h-9 overflow-y-auto text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer px-2 py-1 bg-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default DatePickerScroll;
