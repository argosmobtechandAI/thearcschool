import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

export const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DateRangePicker = ({ 
  startDate, endDate, 
  setStartDate, setEndDate, 
  value, onRangeChange,
  defaultRange = 'mtd',
  initialPreset
}) => {
  const actualStartDate = value?.start || startDate;
  const actualEndDate = value?.end || endDate;
  const [selectedRange, setSelectedRange] = useState(initialPreset || defaultRange);

  const ranges = {
    custom: "Custom",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    mtd: "Month To Date",
    this_month: "This Month (All)",
    last_month: "Last Month",
    ytd: "This Year (YTD)"
  };

    const getRangeDates = (range) => {
      const today = new Date();
      today.setHours(0,0,0,0);

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
        case 'this_month': {
          const mStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          start = formatDate(mStart);
          end = formatDate(mEnd);
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
          const yStart = new Date(today.getFullYear(), 0, 1);
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
        if (typeof onRangeChange === 'function') {
          onRangeChange(dates);
        } else {
          if (typeof setStartDate === 'function') setStartDate(dates.start);
          if (typeof setEndDate === 'function') setEndDate(dates.end);
        }
      }
    };

  useEffect(() => {
    if (!actualStartDate && !actualEndDate && selectedRange !== 'custom') {
      const dates = getRangeDates(initialPreset || defaultRange);
      if (dates) {
        if (typeof onRangeChange === 'function') {
          onRangeChange(dates);
        } else {
          if (typeof setStartDate === 'function') setStartDate(dates.start);
          if (typeof setEndDate === 'function') setEndDate(dates.end);
        }
        setSelectedRange(initialPreset || defaultRange);
      }
    } else if (actualStartDate || actualEndDate) {
      let matchedRange = 'custom';
      for (const key of Object.keys(ranges)) {
        if (key === 'custom') continue;
        const testRange = getRangeDates(key);
        if (testRange && testRange.start === actualStartDate && testRange.end === actualEndDate) {
          matchedRange = key;
          break;
        }
      }
      if (selectedRange !== matchedRange) {
        setSelectedRange(matchedRange);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualStartDate, actualEndDate]);

  const handleRangeChange = (e) => {
    const val = e.target.value;
    setSelectedRange(val);
    setRangeDates(val);
  };

  const handleDateChange = (type, val) => {
    setSelectedRange('custom');
    if (typeof onRangeChange === 'function') {
      if (type === 'start') onRangeChange({ start: val, end: actualEndDate });
      else onRangeChange({ start: actualStartDate, end: val });
    } else {
      if (type === 'start' && typeof setStartDate === 'function') setStartDate(val);
      if (type === 'end' && typeof setEndDate === 'function') setEndDate(val);
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
      <select 
        className="input-glass"
        style={{ padding: "0.4rem 0.5rem", cursor: "pointer", minWidth: "140px", flex: 1, fontSize: "0.85rem", appearance: "auto" }}
        value={selectedRange}
        onChange={handleRangeChange}
      >
        {Object.entries(ranges).map(([k, v]) => (
          <option key={k} value={k} style={{ color: "black" }}>{v}</option>
        ))}
      </select>

      <div style={{ position: "relative", flex: 1, minWidth: "120px" }}>
        <Calendar size={14} style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="date"
          className="input-glass"
          style={{ width: "100%", fontSize: "0.85rem", padding: "0.4rem 0.2rem 0.4rem 1.8rem" }}
          value={actualStartDate || ""}
          onChange={(e) => handleDateChange('start', e.target.value)}
          title="Start Date"
        />
      </div>
      <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>to</span>
      <div style={{ position: "relative", flex: 1, minWidth: "120px" }}>
        <Calendar size={14} style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="date"
          className="input-glass"
          style={{ width: "100%", fontSize: "0.85rem", padding: "0.4rem 0.2rem 0.4rem 1.8rem" }}
          value={actualEndDate || ""}
          onChange={(e) => handleDateChange('end', e.target.value)}
          title="End Date"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
