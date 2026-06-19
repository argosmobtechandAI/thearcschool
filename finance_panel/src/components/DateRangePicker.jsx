import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const DateRangePicker = ({ startDate, endDate, setStartDate, setEndDate, onChange, defaultRange = 'mtd' }) => {
  const [selectedRange, setSelectedRange] = useState(defaultRange);

  const ranges = {
    custom: "Custom",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    mtd: "This Month (MTD)",
    last_month: "Last Month",
    ytd: "This Academic Year (YTD)"
  };

    const getRangeDates = (range) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      let start = "";
      let end = formatDate(today);

      switch(range) {
        case 'today':
          start = end;
          break;
        case 'yesterday': {
          const y = new Date(today);
          y.setDate(y.getDate() - 1);
          start = formatDate(y);
          end = formatDate(y);
          break;
        }
        case 'this_week': {
          const w = new Date(today);
          w.setDate(w.getDate() - w.getDay());
          start = formatDate(w);
          break;
        }
        case 'mtd': {
          const m = new Date(today);
          m.setDate(1);
          start = formatDate(m);
          break;
        }
        case 'last_month': {
          const lmStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          start = formatDate(lmStart);
          end = formatDate(lmEnd);
          break;
        }
        case 'ytd': {
          // Academic year starts April 1st
          const currentMonth = today.getMonth();
          let year = today.getFullYear();
          if (currentMonth < 3) {
            year -= 1;
          }
          const yStart = new Date(year, 3, 1);
          start = formatDate(yStart);
          break;
        }
        default:
          return null;
      }
      return { start, end };
    };

    const setRangeDates = (range) => {
      if (range === 'custom') return;
      const dates = getRangeDates(range);
      if (dates) {
        if (typeof onChange === 'function') {
          onChange(dates.start, dates.end);
        } else {
          if (typeof setStartDate === 'function') setStartDate(dates.start);
          if (typeof setEndDate === 'function') setEndDate(dates.end);
        }
      }
    };

  useEffect(() => {
    if (!startDate && !endDate && selectedRange !== 'custom') {
      const dates = getRangeDates(defaultRange);
      if (dates) {
        if (typeof onChange === 'function') {
          onChange(dates.start, dates.end);
        } else {
          if (typeof setStartDate === 'function') setStartDate(dates.start);
          if (typeof setEndDate === 'function') setEndDate(dates.end);
        }
        setSelectedRange(defaultRange);
      }
    } else if (startDate || endDate) {
      let matchedRange = 'custom';
      for (const key of Object.keys(ranges)) {
        if (key === 'custom') continue;
        const testRange = getRangeDates(key);
        if (testRange && testRange.start === startDate && testRange.end === endDate) {
          matchedRange = key;
          break;
        }
      }
      if (selectedRange !== matchedRange) {
        setSelectedRange(matchedRange);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const handleRangeChange = (e) => {
    const val = e.target.value;
    setSelectedRange(val);
    setRangeDates(val);
  };

  // If user manually edits dates, switch to custom
  const handleCustomDateChange = (type, value) => {
    if (typeof onChange === 'function') {
      if (type === 'start') onChange(value, endDate);
      else onChange(startDate, value);
    } else {
      if (type === 'start' && typeof setStartDate === 'function') setStartDate(value);
      if (type === 'end' && typeof setEndDate === 'function') setEndDate(value);
    }
    setSelectedRange('custom');
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <select 
        className="input-glass"
        style={{ padding: "0.5rem", cursor: "pointer", width: "160px", appearance: "auto" }}
        value={selectedRange}
        onChange={handleRangeChange}
      >
        {Object.entries(ranges).map(([k, v]) => (
          <option key={k} value={k} style={{ color: "black" }}>{v}</option>
        ))}
      </select>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <div style={{ position: "relative" }}>
          <Calendar size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input 
            type="date" 
            value={startDate || ""} 
            onChange={(e) => {
              if (typeof onChange === 'function') onChange(e.target.value, endDate);
              else if (typeof setStartDate === 'function') setStartDate(e.target.value);
              setSelectedRange('custom');
            }} 
            className="input-glass"
            style={{ padding: "0.4rem 0.4rem 0.4rem 2.2rem", width: "145px", fontSize: "0.8rem" }}
          />
        </div>
        <span style={{ color: "var(--text-secondary)", alignSelf: "center", fontSize: "0.8rem" }}>to</span>
        <div style={{ position: "relative" }}>
          <Calendar size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input 
            type="date" 
            value={endDate || ""} 
            onChange={(e) => {
              if (typeof onChange === 'function') onChange(startDate, e.target.value);
              else if (typeof setEndDate === 'function') setEndDate(e.target.value);
              setSelectedRange('custom');
            }} 
            className="input-glass"
            style={{ padding: "0.4rem 0.4rem 0.4rem 2.2rem", width: "145px", fontSize: "0.8rem" }}
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
