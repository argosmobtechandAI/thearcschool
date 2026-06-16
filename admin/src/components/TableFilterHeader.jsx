import React, { useState, useEffect, useRef } from 'react';
import { Search, FileSpreadsheet, FileText, Columns } from 'lucide-react';

const TableFilterHeader = ({
  searchQuery,
  setSearchQuery,
  searchPlaceholder = "Search...",
  filters = [],
  exportColumns,
  onExportExcel,
  onExportPDF,
  selectedColumns,
  setSelectedColumns,
  children,
}) => {
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState([]);
  
  const activeKeys = selectedColumns || internalSelectedKeys;
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (exportColumns && exportColumns.length > 0) {
      if (!selectedColumns) {
        setInternalSelectedKeys(prev => prev.length === 0 ? exportColumns.map(c => c.key) : prev);
      }
    }
  }, [exportColumns, selectedColumns]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowColumnsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (key) => {
    if (setSelectedColumns) {
      setSelectedColumns(prev => 
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
    } else {
      setInternalSelectedKeys(prev => 
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      );
    }
  };
  return (
    <div style={{
      display: "flex", 
      flexWrap: "wrap", 
      justifyContent: "space-between", 
      alignItems: "center", 
      gap: "1rem",
      marginBottom: "1.5rem",
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid var(--glass-border)",
      borderRadius: "12px",
      padding: "1rem"
    }}>
      
      {/* Left side: Search & Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", flex: 1, alignItems: "center" }}>
        {/* Search Input */}
        {setSearchQuery && (
          <div style={{ position: "relative", minWidth: "250px", maxWidth: "400px", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              className="input-glass"
              style={{ paddingLeft: "2.5rem", width: "100%", margin: 0, color: "black", backgroundColor: "white" }}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Dynamic Dropdown Filters */}
        {filters.map((filter, index) => (
          <div key={index} style={{ minWidth: "150px" }}>
            <select
              className="input-glass"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              style={{ appearance: "none", margin: 0, width: "100%", cursor: "pointer" }}
            >
              {filter.label && (
                <option value="" style={{ color: "black" }}>{filter.label}</option>
              )}
              {filter.options.map((opt, i) => (
                <option key={i} value={opt.value} style={{ color: "black" }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Custom Children (e.g. DateRangePicker) */}
        {children}
      </div>

      {/* Right side: Exports */}
      {(onExportExcel || onExportPDF) && (
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          
          {/* Column Selector */}
          {exportColumns && exportColumns.length > 0 && (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button 
                onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                className="btn btn-ghost" 
                style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Columns size={16} /> <span style={{ fontSize: "0.875rem" }}>Columns</span>
              </button>
              
              {showColumnsDropdown && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "0.5rem",
                  minWidth: "200px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  zIndex: 50,
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#4b5563", padding: "0.5rem", borderBottom: "1px solid #e5e7eb", marginBottom: "0.5rem" }}>
                    Select Columns to Export
                  </div>
                  {exportColumns.map(col => (
                    <div 
                      key={col.key} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleColumn(col.key);
                      }}
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", cursor: "pointer", fontSize: "0.875rem", color: "black" }}
                    >
                      <input 
                        type="checkbox" 
                        checked={activeKeys.includes(col.key)}
                        readOnly
                        style={{ cursor: "pointer", pointerEvents: "none" }}
                      />
                      {col.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginRight: "0.25rem", marginLeft: "0.5rem" }}>Export:</span>
          {onExportExcel && (
            <button 
              onClick={() => onExportExcel(activeKeys)} 
              className="btn btn-ghost" 
              style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "6px" }}
              title="Download Excel"
            >
              <FileSpreadsheet size={16} /> <span style={{ fontSize: "0.875rem" }}>Excel</span>
            </button>
          )}
          {onExportPDF && (
            <button 
              onClick={() => onExportPDF(activeKeys)} 
              className="btn btn-ghost" 
              style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "6px" }}
              title="Download PDF"
            >
              <FileText size={16} /> <span style={{ fontSize: "0.875rem" }}>PDF</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default TableFilterHeader;
