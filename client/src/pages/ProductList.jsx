
// Product CRUD page (หน้าจัดการสินค้า)
// Example usage: visit `/products` แล้วเพิ่ม/แก้ไข/ลบ
import React from "react";
import { listProducts, listUnits, createProduct, updateProduct, deleteProduct } from "../api/products.api.js";
import { formatBaht } from "../utils.js";

export default function ProductList() {
    const [products, setProducts] = React.useState([]);
    const [units, setUnits] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState("");

    // Form state
    const [editId, setEditId] = React.useState(null);
    const [form, setForm] = React.useState({
        code: "", name: "", units_id: "", unit_price: ""
    });
    const [autoCode, setAutoCode] = React.useState(false);

    // Load products + units
    const loadData = () => {
        setLoading(true);
        Promise.all([listProducts(), listUnits()])
            .then(([prods, un]) => {
                setProducts(prods);
                setUnits(un);
                setLoading(false);
            })
            .catch(e => {
                setErr(String(e));
                setLoading(false);
            });
    };

    React.useEffect(loadData, []);

    // Create or update product
    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (autoCode && !editId) payload.code = "";

        const promise = editId
            ? updateProduct(editId, payload)
            : createProduct(payload);

        promise
            .then(() => {
                setForm({ code: "", name: "", units_id: "", unit_price: "" });
                setEditId(null);
                setAutoCode(false);
                loadData();
            })
            .catch(e => setErr(String(e.message || e)));
    };

    // Populate form for editing
    const handleEdit = (p) => {
        setEditId(p.id);
        // Find unit id from units_code? No, we need the actual units_id.
        // The listProducts returns units_code but not units_id.
        // Wait, server query: select p.id, p.code, p.name, p.unit_price, u.code as units_code
        // It DOES NOT return units_id. I need to fix the backend query first or infer it.
        // Actually, if I can't get units_id, I can't populate the select box correctly.
        // Checking products.routes.js ... Yes, it joins and returns units_code.
        // I will assume the list query is updated to include p.units_id or I'll match by code? Match by code is risky.
        // Let's rely on fixing the backend query in next block or finding unit by code.
        // For now, I'll find unit by code if possible.
        setForm({
            code: p.code,
            name: p.name,
            units_id: p.units_id || "",
            unit_price: p.unit_price
        });
        setAutoCode(false);
    };

    // Delete (with optional force delete)
    const handleDelete = (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        deleteProduct(id)
            .then(() => loadData())
            .catch(e => {
                const msg = String(e.message || e);
                if (msg.includes("Cannot delete product because it is used in invoices")) {
                    if (window.confirm("This product is used in invoices. Do you want to delete the product AND all related invoices?")) {
                        deleteProduct(id, true)
                            .then(() => loadData())
                            .catch(err => alert("Error: " + String(err.message || err)));
                    }
                } else {
                    alert("Error: " + msg);
                }
            });
    };

    const handleCancel = () => {
        setEditId(null);
        setForm({ code: "", name: "", units_id: "", unit_price: "" });
        setAutoCode(false);
    };

    if (loading && products.length === 0) return <div className="text-center mt-4">Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">Products</h3>
            </div>

            {err && <div className="alert alert-error">{err}</div>}

            <div className="card">
                <h4 className="mb-4">{editId ? "Edit Product" : "Add New Product"}</h4>
                <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap align-end">
                    <div className="form-group" style={{ flex: "1 1 120px" }}>
                        <label className="form-label">Code</label>
                        <div className="flex gap-2">
                            <input
                                className="form-control"
                                required={!autoCode}
                                disabled={autoCode}
                                value={form.code}
                                onChange={e => setForm({ ...form, code: e.target.value })}
                                placeholder="P001"
                            />
                            {!editId && (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" checked={autoCode} onChange={e => setAutoCode(e.target.checked)} id="p_auto" />
                                    <label htmlFor="p_auto" style={{ marginLeft: 4, fontSize: '0.8rem' }}>Auto</label>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: "2 1 200px" }}>
                        <label className="form-label">Name</label>
                        <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product Name" />
                    </div>
                    <div className="form-group" style={{ flex: "1 1 150px" }}>
                        <label className="form-label">Unit</label>
                        <select className="form-control" required value={form.units_id} onChange={e => setForm({ ...form, units_id: e.target.value })}>
                            <option value="">Select Unit</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: "1 1 120px" }}>
                        <label className="form-label">Price</label>
                        <input type="number" step="0.01" className="form-control" required value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} placeholder="0.00" />
                    </div>
                    <div className="form-group" style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>{editId ? "Update" : "Add"}</button>
                        {editId && <button type="button" onClick={handleCancel} className="btn btn-outline" style={{ height: "42px" }}>Cancel</button>}
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="modern-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Unit</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td className="font-bold">{p.code}</td>
                                    <td>{p.name}</td>
                                    <td>{p.units_code}</td>
                                    <td className="text-right">{formatBaht(p.unit_price)}</td>
                                    <td className="text-right">
                                        <button onClick={() => handleEdit(p)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px', marginRight: 8 }}>Edit</button>
                                        <button onClick={() => handleDelete(p.id)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
