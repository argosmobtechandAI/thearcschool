import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

const TimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parse incoming "HH:mm" (24h) or "hh:mm A" (12h) to internal state
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: "08", minute: "00", period: "AM" };
    
    if (timeStr.includes("AM") || timeStr.includes("PM")) {
      const [time, period] = timeStr.split(" ");
      const [h, m] = time.split(":");
      return { hour: h, minute: m, period: period };
    }

    const [h24, m] = timeStr.split(":");
    let h12 = parseInt(h24, 10);
    const period = h12 >= 12 ? "PM" : "AM";
    if (h12 === 0) h12 = 12;
    if (h12 > 12) h12 -= 12;
    
    const hStr = h12.toString().padStart(2, "0");
    return { hour: hStr, minute: m, period };
  };

  const [time, setTime] = useState(() => parseTime(value));
  const [mode, setMode] = useState("hour"); // "hour" or "minute"

  useEffect(() => {
    if (value) {
      setTime(parseTime(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeChange = (field, val) => {
    const newTime = { ...time, [field]: val };
    setTime(newTime);
    
    if (field === "hour") {
        setMode("minute");
    }

    // Convert back to 24h for standard "HH:mm" output
    let h24 = parseInt(newTime.hour, 10);
    if (newTime.period === "PM" && h24 !== 12) h24 += 12;
    if (newTime.period === "AM" && h24 === 12) h24 = 0;
    
    const h24Str = h24.toString().padStart(2, "0");
    onChange(`${h24Str}:${newTime.minute}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => {
      let val = i === 0 ? 12 : i;
      return val.toString().padStart(2, "0");
  });
  
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  const periods = ["AM", "PM"];

  const clockSize = 220;
  const radius = 90;
  const center = clockSize / 2;

  const renderClockFace = () => {
    const items = mode === "hour" ? hours : minutes;
    const selectedVal = mode === "hour" ? time.hour : time.minute;

    return (
      <div style={{ position: "relative", width: clockSize, height: clockSize, borderRadius: "50%", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", margin: "0 auto 1rem auto" }}>
        {/* Center dot */}
        <div style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "var(--accent-primary)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10 }}></div>
        
        {/* Hand */}
        {(() => {
          const selectedIndex = items.indexOf(selectedVal);
          if (selectedIndex === -1) return null;
          const angle = (selectedIndex / 12) * 2 * Math.PI - Math.PI / 2;
          const x = center + (radius - 16) * Math.cos(angle);
          const y = center + (radius - 16) * Math.sin(angle);

          return (
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          );
        })()}

        {items.map((item, index) => {
          const angle = (index / 12) * 2 * Math.PI - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          
          const isSelected = item === selectedVal;

          return (
            <div
              key={item}
              onClick={() => handleTimeChange(mode, item)}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 32,
                height: 32,
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: isSelected ? "var(--accent-primary)" : "transparent",
                color: isSelected ? "white" : "inherit",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: isSelected ? "600" : "400",
                transition: "var(--transition)",
                zIndex: 20
              }}
            >
              {item}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {label && <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.75rem" }}>{label}</label>}
      <div 
        className="input-glass" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          cursor: "pointer",
          padding: "10px 14px",
          background: isOpen ? "rgba(255,255,255,0.1)" : "var(--glass-bg)"
        }}
        onClick={() => {
            setIsOpen(!isOpen);
            setMode("hour"); // Always open on hour selection
        }}
      >
        <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
          {value ? `${time.hour}:${time.minute} ${time.period}` : "Select Time"}
        </span>
        <Clock size={16} style={{ color: "var(--text-secondary)" }} />
      </div>

      {isOpen && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{ 
            position: "absolute", 
            top: "100%", 
            left: 0, 
            marginTop: "0.5rem", 
            padding: "1.5rem", 
            zIndex: 100, 
            display: "flex", 
            flexDirection: "column",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            width: "max-content",
            minWidth: "250px"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", padding: "0 1rem" }}>
            <div style={{ display: "flex", gap: "0.25rem", fontSize: "2rem", fontWeight: "300" }}>
                <span 
                    onClick={() => setMode("hour")} 
                    style={{ cursor: "pointer", color: mode === "hour" ? "var(--accent-primary)" : "inherit", fontWeight: mode === "hour" ? "600" : "300" }}
                >
                    {time.hour}
                </span>
                <span>:</span>
                <span 
                    onClick={() => setMode("minute")} 
                    style={{ cursor: "pointer", color: mode === "minute" ? "var(--accent-primary)" : "inherit", fontWeight: mode === "minute" ? "600" : "300" }}
                >
                    {time.minute}
                </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {periods.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleTimeChange("period", p)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "none",
                    background: time.period === p ? "var(--accent-primary)" : "transparent",
                    color: time.period === p ? "white" : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    transition: "var(--transition)"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Clock Face */}
          {renderClockFace()}
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsOpen(false);
                  let h24 = parseInt(time.hour, 10);
                  if (time.period === "PM" && h24 !== 12) h24 += 12;
                  if (time.period === "AM" && h24 === 12) h24 = 0;
                  
                  const h24Str = h24.toString().padStart(2, "0");
                  onChange(`${h24Str}:${time.minute}`);
                }}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.5rem" }}
              >
                  OK
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
