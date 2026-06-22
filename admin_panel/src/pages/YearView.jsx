import React from 'react';
import format from 'date-fns/format';
import isSameMonth from 'date-fns/isSameMonth';
import { Plus } from "lucide-react";

const YearView = ({ date, events, onSelectEvent, onSelectSlot }) => {
  // We'll use the passed 'date' to determine the start of the year view.
  // Ideally, 'date' is set to April 1st of the academic year.
  // We will display 12 months starting from the month of the current 'date'.
  
  const startMonth = date.getMonth(); // 3 for April
  const startYear = date.getFullYear();
  
  const months = Array.from({ length: 12 }, (_, i) => {
    return new Date(startYear, startMonth + i, 1);
  });

  return (
    <div style={{ padding: "0.5rem", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem", alignContent: "start" }}>
        {months.map((month, idx) => {
          const monthEvents = events.filter(e => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            return isSameMonth(start, month) || isSameMonth(end, month) || (start < month && end > month);
          });

          monthEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

          return (
            <div key={idx} className="glass-panel" style={{ 
              display: "flex", flexDirection: "column", padding: "1rem", borderRadius: "12px", 
              background: "var(--glass-bg)", minHeight: "220px", border: "1px solid var(--glass-border)",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "2px solid var(--glass-border)", paddingBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--primary-color)", margin: 0 }}>
                  {format(month, 'MMMM yyyy')}
                </h3>
                {onSelectSlot && (
                  <button 
                    onClick={() => {
                      // Trigger Add Event with start date as the 1st of this month
                      onSelectSlot({ action: 'click', start: month, end: month });
                    }}
                    className="hover-bg"
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", borderRadius: "4px" }}
                    title={`Add event in ${format(month, 'MMMM')}`}
                  >
                    <Plus size={18} />
                  </button>
                )}
              </div>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {monthEvents.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic", margin: "auto" }}>No events scheduled.</p>
                ) : (
                  monthEvents.map((ev, eIdx) => {
                    const category = ev.resource?.category;
                    let dotColor = '#3b82f6';
                    if (category === 'Holiday') dotColor = '#10b981';
                    if (category === 'Exam') dotColor = '#ef4444';
                    if (category === 'PTM') dotColor = '#f59e0b';
                    if (category === 'Competition') dotColor = '#8b5cf6';

                    const isMultiDay = format(new Date(ev.start), 'yyyy-MM-dd') !== format(new Date(ev.end), 'yyyy-MM-dd');
                    const dateStr = isMultiDay 
                      ? `${format(new Date(ev.start), 'MMM d')} - ${format(new Date(ev.end), 'MMM d')}`
                      : format(new Date(ev.start), 'MMM d');

                    return (
                      <div 
                        key={eIdx} 
                        onClick={() => onSelectEvent && onSelectEvent(ev)}
                        style={{ display: "flex", gap: "0.75rem", padding: "0.6rem", borderRadius: "8px", background: "rgba(255,255,255,0.5)", cursor: "pointer", transition: "all 0.2s", alignItems: "center", border: "1px solid rgba(0,0,0,0.03)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.9)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.5)";
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div style={{ minWidth: "45px", fontSize: "0.8rem", fontWeight: "700", color: "var(--text-secondary)", lineHeight: 1.2 }}>
                          {isMultiDay ? (
                            <>
                              <div>{format(new Date(ev.start), 'MMM d')}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>to {format(new Date(ev.end), 'd')}</div>
                            </>
                          ) : (
                            <div style={{ fontSize: "0.9rem" }}>{format(new Date(ev.start), 'do')}</div>
                          )}
                        </div>
                        <div style={{ width: "4px", height: "100%", minHeight: "24px", background: dotColor, borderRadius: "2px" }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: "600", margin: 0, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</h4>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

YearView.title = (date) => {
  const startYear = date.getFullYear();
  const endYear = startYear + 1;
  return `${startYear}-${endYear.toString().slice(2)} Academic Year`;
};

YearView.navigate = (date, action) => {
  const newDate = new Date(date);
  switch (action) {
    case 'PREV':
      newDate.setFullYear(newDate.getFullYear() - 1);
      break;
    case 'NEXT':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
    case 'TODAY':
      // Reset to April of current academic year
      const now = new Date();
      let acStartYear = now.getFullYear();
      if (now.getMonth() < 3) acStartYear -= 1;
      return new Date(acStartYear, 3, 1);
    default:
      break;
  }
  return newDate;
};

export default YearView;
