import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const DateRangePicker = ({ startDate, endDate, setStartDate, setEndDate, defaultRange = 'mtd' }) => {
  const [selectedRange, setSelectedRange] = useState(defaultRange);

  const ranges = {
    custom: "Custom",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    mtd: "This Month (MTD)",
    last_month: "Last Month",
    ytd: "This Year (YTD)"
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
        setStartDate(dates.start);
        setEndDate(dates.end);
      }
    };

  useEffect(() => {
    if (!startDate && !endDate && selectedRange !== 'custom') {
      const dates = getRangeDates(defaultRange);
      if (dates) {
        setStartDate(dates.start);
        setEndDate(dates.end);
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
  const handleDateChange = (type, value) => {
    setSelectedRange('custom');
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
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

      <div style={{ position: "relative" }}>
        <Calendar size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="date"
          className="input-glass"
          style={{ paddingLeft: "2.25rem", margin: 0, paddingRight: "0.5rem" }}
          value={startDate}
          onChange={(e) => handleDateChange('start', e.target.value)}
          title="Start Date"
        />
      </div>
      <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>to</span>
      <div style={{ position: "relative" }}>
        <Calendar size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          type="date"
          className="input-glass"
          style={{ paddingLeft: "2.25rem", margin: 0, paddingRight: "0.5rem" }}
          value={endDate}
          onChange={(e) => handleDateChange('end', e.target.value)}
          title="End Date"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
