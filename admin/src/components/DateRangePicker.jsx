import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";

// Helper to format date as YYYY-MM-DD
export const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const presets = [
  { label: "Today", getValue: () => { const d = new Date(); return { start: formatDate(d), end: formatDate(d) } } },
  { label: "Yesterday", getValue: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { start: formatDate(d), end: formatDate(d) } } },
  { label: "This Week", getValue: () => { 
      const curr = new Date(); 
      const first = curr.getDate() - curr.getDay() + 1; // Monday
      const last = first + 6; // Sunday
      return { start: formatDate(new Date(curr.setDate(first))), end: formatDate(new Date(curr.setDate(last))) };
  }},
  { label: "Last 7 Days", getValue: () => { const d = new Date(); const start = new Date(d); start.setDate(d.getDate() - 6); return { start: formatDate(start), end: formatDate(d) } } },
  { label: "This Month", getValue: () => { const d = new Date(); return { start: formatDate(new Date(d.getFullYear(), d.getMonth(), 1)), end: formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) } } },
  { label: "Last Month", getValue: () => { const d = new Date(); return { start: formatDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)), end: formatDate(new Date(d.getFullYear(), d.getMonth(), 0)) } } },
  { label: "All Time", getValue: () => ({ start: "", end: "" }) },
];

const DateRangePicker = ({ value, onRangeChange, initialPreset = "All Time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(initialPreset);
  const [customRange, setCustomRange] = useState(value || { start: "", end: "" });
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (initialPreset !== "All Time" && !value) {
        const preset = presets.find(p => p.label === initialPreset);
        if (preset) {
            const range = preset.getValue();
            setCustomRange(range);
        }
    }
  }, []);

  useEffect(() => {
    if (value && (value.start !== customRange.start || value.end !== customRange.end)) {
      setCustomRange(value);
      // If the passed value doesn't exactly match the current preset, switch to Custom Range
      const currentPresetVal = presets.find(p => p.label === activePreset)?.getValue();
      if (!currentPresetVal || currentPresetVal.start !== value.start || currentPresetVal.end !== value.end) {
        setActivePreset("Custom Range");
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePresetClick = (preset) => {
    setActivePreset(preset.label);
    const range = preset.getValue();
    setCustomRange(range);
    onRangeChange(range);
    setIsOpen(false);
  };

  const applyCustomRange = () => {
    setActivePreset("Custom Range");
    onRangeChange(customRange);
    setIsOpen(false);
  };

  const clearRange = (e) => {
    e.stopPropagation();
    setActivePreset("All Time");
    setCustomRange({ start: "", end: "" });
    onRangeChange({ start: "", end: "" });
  };

  const getDisplayText = () => {
    if (activePreset !== "Custom Range") return activePreset;
    if (customRange.start && customRange.end) return `${customRange.start} to ${customRange.end}`;
    if (customRange.start) return `From ${customRange.start}`;
    if (customRange.end) return `Until ${customRange.end}`;
    return "Custom Range";
  };

  return (
    <div style={{ position: "relative" }} ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 1rem",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          fontSize: "0.875rem",
          minWidth: "180px",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CalendarIcon size={16} color="var(--text-secondary)" />
          <span>{getDisplayText()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {activePreset !== "All Time" && (
            <div
              onClick={clearRange}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "18px", height: "18px", borderRadius: "50%",
                background: "rgba(255,255,255,0.1)", cursor: "pointer"
              }}
            >
              <X size={12} />
            </div>
          )}
          <ChevronDown size={16} color="var(--text-secondary)" />
        </div>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 0.5rem)",
            right: 0,
            zIndex: 50,
            minWidth: "340px",
            padding: "1rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {/* Presets Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", borderRight: "1px solid var(--glass-border)", paddingRight: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Presets
              </div>
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePresetClick(p)}
                  style={{
                    textAlign: "left",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    background: activePreset === p.label ? "rgba(96,165,250,0.15)" : "transparent",
                    color: activePreset === p.label ? "var(--accent-primary)" : "var(--text-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    transition: "all 0.2s"
                  }}
                  className={activePreset !== p.label ? "hover-bg" : ""}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Custom Range
              </div>
              
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>Start Date</label>
                <input
                  type="date"
                  className="input-glass"
                  style={{ width: "100%", padding: "0.5rem", fontSize: "0.875rem" }}
                  value={customRange.start}
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                />
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>End Date</label>
                <input
                  type="date"
                  className="input-glass"
                  style={{ width: "100%", padding: "0.5rem", fontSize: "0.875rem" }}
                  value={customRange.end}
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                />
              </div>

              <button 
                onClick={applyCustomRange}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.5rem", fontSize: "0.875rem" }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
