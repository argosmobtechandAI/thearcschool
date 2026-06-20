import React, { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import { PlusCircle, Trash2 } from "lucide-react";

const IncomeCategories = () => {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return toast.error("Category name is required");
    setIsSubmitting(true);
    try {
      const res = await api.post("/finance_panel/categories", {
        name: newCatName,
        type: "INCOME",
        description: newCatDesc
      });
      if (res.data.success) {
        toast.success("Category added successfully");
        setNewCatName("");
        setNewCatDesc("");
        fetchCategories();
      }
    } catch (err) {
      toast.error("Failed to add category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Delete this category? Transactions using it will be affected or restricted.")) {
      try {
        await api.delete(`/finance_panel/categories/${id}`);
        toast.success("Category deleted");
        fetchCategories();
      } catch (err) {
        toast.error("Cannot delete category in use.");
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>Income Categories</h1>
        <p style={{ color: "var(--text-secondary)" }}>Manage categories for non-fee income sources.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) 2fr", gap: "1.5rem" }}>
        {/* Add Form */}
        <div className="glass-panel" style={{ padding: "1.5rem", height: "fit-content" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981" }}>
            <PlusCircle size={20} /> Add Category
          </h2>
          <form onSubmit={handleAddCategory} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Category Name</label>
              <input 
                type="text" 
                className="input-glass" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Donation, Event Tickets"
                style={{ width: "100%", padding: "0.5rem" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Description (Optional)</label>
              <input 
                type="text" 
                className="input-glass" 
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="e.g. Details about this income"
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ background: "#10b981", color: "white", border: "none", padding: "0.5rem 1.5rem" }}>
                {isSubmitting ? "Adding..." : "Add Category"}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem" }}>Existing Categories</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {categories.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.02)", borderRadius: "8px" }}>
                No income categories found. Add one to get started.
              </div>
            ) : (
              categories.map(c => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", border: "1px solid var(--glass-border)", borderRadius: "8px", background: "white" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "4px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span>{c.type}</span>
                      {c.description && <span style={{ color: "var(--text-secondary)", fontWeight: "400" }}>• {c.description}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteCategory(c.id)} className="btn-ghost hover-scale" style={{ color: "#ef4444", padding: "0.5rem" }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeCategories;
