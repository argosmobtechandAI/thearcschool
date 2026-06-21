import React, { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

const ClockTimePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState("hours"); // "hours" or "minutes"
  const [period, setPeriod] = useState("AM");
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      let hh = parseInt(h, 10);
      setPeriod(hh >= 12 ? "PM" : "AM");
      if (hh === 0) hh = 12;
      else if (hh > 12) hh -= 12;
      setHour(hh);
      setMinute(parseInt(m, 10));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHourClick = (h) => {
    setHour(h);
    setMode("minutes");
    updateValue(h, minute, period);
  };

  const handleMinuteClick = (m) => {
    setMinute(m);
    updateValue(hour, m, period);
    setIsOpen(false); // Close after picking minutes
  };

  const handlePeriodToggle = (p) => {
    setPeriod(p);
    updateValue(hour, minute, p);
  };

  const updateValue = (h, m, p) => {
    let hh = h;
    if (p === "PM" && hh !== 12) hh += 12;
    if (p === "AM" && hh === 12) hh = 0;
    
    const formattedH = hh.toString().padStart(2, "0");
    const formattedM = m.toString().padStart(2, "0");
    onChange(`${formattedH}:${formattedM}`);
  };

  const renderClockFace = () => {
    const isHours = mode === "hours";
    const items = isHours ? Array.from({length: 12}, (_, i) => i === 0 ? 12 : i) : Array.from({length: 12}, (_, i) => i * 5);
    const radius = 100;
    const center = 120;
    
    return (
      <div style={{ width: "240px", height: "240px", borderRadius: "50%", background: "rgba(0,0,0,0.05)", position: "relative", margin: "0 auto" }}>
        {/* Center dot */}
        <div style={{ position: "absolute", width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        
        {/* Hands */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "2px",
          height: isHours ? "60px" : "80px",
          background: "#3b82f6",
          transformOrigin: "bottom center",
          transform: `translate(-50%, -100%) rotate(${isHours ? hour * 30 : minute * 6}deg)`,
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }} />

        {items.map((item, idx) => {
          const angle = idx * 30 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center + radius * Math.sin(rad);
          const isSelected = isHours ? item === hour : item === minute;

          return (
            <div
              key={item}
              onClick={() => isHours ? handleHourClick(item) : handleMinuteClick(item)}
              style={{
                position: "absolute",
                left: `${x}px`,
                top: `${y}px`,
                transform: "translate(-50%, -50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: isSelected ? "#3b82f6" : "transparent",
                color: isSelected ? "white" : "inherit",
                fontWeight: isSelected ? "bold" : "normal",
                transition: "all 0.2s"
              }}
              className={isSelected ? "" : "hover-circle"}
            >
              {isHours ? item : item.toString().padStart(2, "0")}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div 
        className="input-glass"
        style={{ display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ flex: 1 }}>{value || "--:--"}</span>
        <Clock size={16} style={{ color: "var(--text-secondary)" }} />
      </div>

      {isOpen && (
        <div 
          className="glass-panel" 
          style={{
            position: "absolute",
            bottom: "100%",  // Open upwards
            right: "0",      // Align to right side of the input so it doesn't spill left
            marginBottom: "0.5rem",
            padding: "1.5rem",
            zIndex: 9999,    // High z-index
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            width: "290px"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "2rem", fontWeight: "300" }}>
              <span 
                style={{ cursor: "pointer", color: mode === "hours" ? "#3b82f6" : "inherit", fontWeight: mode === "hours" ? "600" : "300" }}
                onClick={() => setMode("hours")}
              >
                {hour.toString().padStart(2, "0")}
              </span>
              <span>:</span>
              <span 
                style={{ cursor: "pointer", color: mode === "minutes" ? "#3b82f6" : "inherit", fontWeight: mode === "minutes" ? "600" : "300" }}
                onClick={() => setMode("minutes")}
              >
                {minute.toString().padStart(2, "0")}
              </span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <button 
                className="btn-ghost" 
                style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: period === "AM" ? "#dbeafe" : "transparent", color: period === "AM" ? "#2563eb" : "var(--text-secondary)" }}
                onClick={() => handlePeriodToggle("AM")}
              >
                AM
              </button>
              <button 
                className="btn-ghost" 
                style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: period === "PM" ? "#dbeafe" : "transparent", color: period === "PM" ? "#2563eb" : "var(--text-secondary)" }}
                onClick={() => handlePeriodToggle("PM")}
              >
                PM
              </button>
            </div>
          </div>

          {/* Clock */}
          {renderClockFace()}
          
          <style>{`
            .hover-circle:hover {
              background: rgba(0,0,0,0.05) !important;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default ClockTimePicker;
