import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";
import { PlusCircle, Search, ArrowUpRight, Edit2, Trash2, X } from "lucide-react";
import { useSortableData } from "../hooks/useSortableData";

const IncomeLedger = () => {
  const { globalDateRange } = useSelector((state) => state.data);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultForm = {
    category_id: "",
    amount: "",
    transaction_date: new Date().toISOString().split("T")[0],
    description: "",
    payment_method: "Bank Transfer",
    reference_number: "",
    type: "INCOME"
  };

  const [txForm, setTxForm] = useState(defaultForm);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/finance_panel/categories?type=INCOME");
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = globalDateRange;
      const res = await api.get(`/finance_panel/transactions?startDate=${startDate || ''}&endDate=${endDate || ''}&type=INCOME`);
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      toast.error("Failed to load income records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [globalDateRange]);

  const handleLogTransaction = async (e) => {
    e.preventDefault();
    if (!txForm.category_id || !txForm.amount) return toast.error("Please fill required fields");
    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await api.put(`/finance_panel/transactions/${editingId}`, txForm);
        if (res.data.success) {
          toast.success("Income updated successfully");
          setTxForm(defaultForm);
          setEditingId(null);
          fetchTransactions();
        }
      } else {
        const res = await api.post("/finance_panel/transactions", txForm);
        if (res.data.success) {
          toast.success("Income logged successfully");
          setTxForm(defaultForm);
          fetchTransactions();
        }
      }
    } catch (err) {
      toast.error(editingId ? "Failed to update income" : "Failed to log income");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tx) => {
    setEditingId(tx.id);
    setTxForm({
      category_id: tx.category_id || "",
      amount: tx.amount,
      transaction_date: tx.transaction_date,
      description: tx.description || "",
      payment_method: tx.payment_method || "Bank Transfer",
      reference_number: tx.reference_number || "",
      type: "INCOME"
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This cannot be undone.")) return;
    try {
      const res = await api.delete(`/finance_panel/transactions/${id}`);
      if (res.data.success) {
        toast.success("Income deleted");
        if (editingId === id) {
          setEditingId(null);
          setTxForm(defaultForm);
        }
        fetchTransactions();
      }
    } catch (err) {
      toast.error("Failed to delete income");
    }
  };

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.description?.toLowerCase().includes(query) ||
          t.reference_number?.toLowerCase().includes(query) ||
          t.category?.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [transactions, searchQuery]);

  const { items: sortedData, requestSort, sortConfig } = useSortableData(filteredTransactions);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Income Ledger</h1>
        <p style={{ color: "var(--text-secondary)" }}>Record and view non-fee school income (e.g., Grants, Donations, Sales)</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
        {/* Log/Edit Income Form */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem", color: editingId ? "#3b82f6" : "#10b981" }}>
              {editingId ? <Edit2 size={20} /> : <PlusCircle size={20} />} 
              {editingId ? "Edit Income" : "Log New Income"}
            </h2>
            {editingId && (
              <button className="btn-ghost" onClick={() => { setEditingId(null); setTxForm(defaultForm); }} style={{ color: "var(--text-secondary)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <X size={16} /> Cancel Edit
              </button>
            )}
          </div>
          <form onSubmit={handleLogTransaction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Income Category <span style={{ color: "red" }}>*</span></label>
              <select required className="input-glass" style={{ width: "100%" }} value={txForm.category_id} onChange={e => setTxForm({...txForm, category_id: e.target.value})}>
                <option value="">-- Select Category --</option>
                {(categories || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Amount (₹) <span style={{ color: "red" }}>*</span></label>
              <input type="number" required min="1" className="input-glass" style={{ width: "100%" }} value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="e.g. 5000" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Date <span style={{ color: "red" }}>*</span></label>
              <input type="date" required className="input-glass" style={{ width: "100%" }} value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Payment Method</label>
              <select className="input-glass" style={{ width: "100%" }} value={txForm.payment_method} onChange={e => setTxForm({...txForm, payment_method: e.target.value})}>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Description</label>
              <input type="text" className="input-glass" style={{ width: "100%" }} value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} placeholder="Brief details..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Reference Number</label>
              <input type="text" className="input-glass" style={{ width: "100%" }} value={txForm.reference_number} onChange={e => setTxForm({...txForm, reference_number: e.target.value})} placeholder="Cheque/Txn No." />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ height: "42px", background: editingId ? "#3b82f6" : "#10b981", color: "white", border: "none", padding: "0 1.5rem" }}>
                {isSubmitting ? "Saving..." : (editingId ? "Update Income" : "Save Income")}
              </button>
            </div>
          </form>
        </div>

        {/* History Table */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600" }}>Income History</h2>
            <div style={{ width: "250px", position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input 
                type="text" 
                className="input-glass" 
                placeholder="Search descriptions, references..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--glass-border)", background: "rgba(0,0,0,0.02)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => requestSort("transaction_date")}>DATE</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => requestSort("description")}>DESCRIPTION</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }}>CATEGORY</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }}>METHOD / REF</th>
                  <th style={{ padding: "1rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => requestSort("amount")}>AMOUNT</th>
                  <th style={{ padding: "1rem", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center" }}>Loading...</td></tr>
                ) : sortedData.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No income recorded for the selected period.</td></tr>
                ) : (
                  sortedData.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-row">
                      <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>{tx.description || "N/A"}</div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ 
                          padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600",
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981'
                        }}>
                          {tx.category?.name || "Unknown"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>
                        <div>{tx.payment_method}</div>
                        {tx.reference_number && <div style={{ fontSize: "0.75rem" }}>Ref: {tx.reference_number}</div>}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right", fontWeight: "600" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.25rem", color: '#10b981' }}>
                          <ArrowUpRight size={16} />
                          ₹{tx.amount}
                        </div>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                          <button onClick={() => handleEdit(tx)} className="btn-ghost" style={{ padding: "0.25rem" }} title="Edit">
                            <Edit2 size={16} color="#3b82f6" />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="btn-ghost" style={{ padding: "0.25rem" }} title="Delete">
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeLedger;
