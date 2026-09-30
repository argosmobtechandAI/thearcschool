import re

# PaymentSelectionModal.jsx
with open("src/components/PaymentSelectionModal.jsx", "r") as f:
    content = f.read()

orig_block = """          ) : studentLedger.fees?.filter(f => f.status !== "paid").length === 0 ? (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", background: "rgba(16, 185, 129, 0.05)", borderRadius: "10px", border: "1px dashed rgba(16, 185, 129, 0.4)", color: "var(--text-primary)", margin: "auto" }}>
              <Check size={36} color="#059669" style={{ margin: "0 auto 0.5rem auto" }} />
              <p style={{ fontWeight: "700", fontSize: "1.05rem" }}>No Pending Dues!</p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>All fee components for this student are fully settled.</p>
            </div>
          ) : (
            <>
              {/* Filter Toolbar */}"""

new_block = """          ) : (
            <>
              {/* Filter Toolbar */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "240px", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Search by fee title or due date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", fontSize: "0.82rem", height: "34px", margin: 0 }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.78rem", color: showFuture ? "#2563eb" : "var(--text-secondary)", fontWeight: "600", userSelect: "none" }}>
                  <CalendarClock size={14} />
                  Include Future Dues
                  <input
                    type="checkbox"
                    checked={showFuture}
                    onChange={() => setShowFuture(!showFuture)}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </label>
              </div>

              {studentLedger.fees?.filter(f => f.status !== "paid").length === 0 ? (
                <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", background: "rgba(16, 185, 129, 0.05)", borderRadius: "10px", border: "1px dashed rgba(16, 185, 129, 0.4)", color: "var(--text-primary)", margin: "auto", width: "100%" }}>
                  <Check size={36} color="#059669" style={{ margin: "0 auto 0.5rem auto" }} />
                  <p style={{ fontWeight: "700", fontSize: "1.05rem" }}>No Pending Dues!</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Toggle 'Include Future Dues' to pay in advance.</p>
                </div>
              ) : (
                <>
"""

content = content.replace(orig_block, new_block)

# Remove the original filter toolbar which was included in new_block
orig_filter_toolbar = """              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: "240px", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    type="text"
                    className="input-glass"
                    placeholder="Search by fee title or due date..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", fontSize: "0.82rem", height: "34px", margin: 0 }}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.78rem", color: showFuture ? "#2563eb" : "var(--text-secondary)", fontWeight: "600", userSelect: "none" }}>
                  <CalendarClock size={14} />
                  Include Future Dues
                  <input
                    type="checkbox"
                    checked={showFuture}
                    onChange={() => setShowFuture(!showFuture)}
                    style={{ cursor: "pointer", accentColor: "#2563eb" }}
                  />
                </label>
              </div>"""

content = content.replace(orig_filter_toolbar, "", 1) # Only remove the second one that was already there!

# Now add closing tag for <> before the end
content = content.replace("""                  </div>
                </form>
              </div>
            </>
          )}""", """                  </div>
                </form>
              </div>
              </>
            </>
          )}""")

with open("src/components/PaymentSelectionModal.jsx", "w") as f:
    f.write(content)

# Ledger.jsx
with open("src/pages/Ledger.jsx", "r") as f:
    ledger = f.read()

ledger_orig_block = """            ) : studentLedger.fees.filter(f => f.status !== "paid").length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                <p style={{ fontWeight: "500" }}>No pending dues. All clear!</p>
                <button onClick={() => setIsPaymentModalOpen(false)} className="btn-ghost" style={{ marginTop: "1rem" }}>Close</button>
              </div>
            ) : (
              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexShrink: 0, flexWrap: "wrap", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: "600" }}>Select Fee(s)</label>"""

ledger_new_block = """            ) : (
              <form onSubmit={handlePaymentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexShrink: 0, flexWrap: "wrap", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: "600" }}>Select Fee(s)</label>"""

ledger = ledger.replace(ledger_orig_block, ledger_new_block)

# And inject the no pending dues message inside the fee list div
ledger_list_orig = """                  <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(255,255,255,0.05)" }}>
                    {studentLedger.fees.filter(f => f.status !== "paid" && (f.fee?.title || "").toLowerCase().includes(feeSearchTerm.toLowerCase())).map(f => {"""

ledger_list_new = """                  <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--glass-border)", borderRadius: "8px", padding: "0.5rem", background: "rgba(255,255,255,0.05)" }}>
                    {studentLedger.fees.filter(f => f.status !== "paid").length === 0 && (
                      <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0, 0, 0, 0.02)", borderRadius: "8px", color: "var(--text-secondary)" }}>
                        <p style={{ fontWeight: "500" }}>No pending dues.</p>
                        <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Toggle Future Dues to pay in advance.</p>
                      </div>
                    )}
                    {studentLedger.fees.filter(f => f.status !== "paid" && (f.fee?.title || "").toLowerCase().includes(feeSearchTerm.toLowerCase())).map(f => {"""

ledger = ledger.replace(ledger_list_orig, ledger_list_new)

with open("src/pages/Ledger.jsx", "w") as f:
    f.write(ledger)

