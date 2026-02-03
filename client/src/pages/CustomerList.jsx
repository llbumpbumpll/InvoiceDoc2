// Customer CRUD page (หน้าจัดการลูกค้า)
// Example usage: visit `/customers` แล้วเพิ่ม/แก้ไข/ลบ
import React from "react";
import { listCustomers, listCountries, createCustomer, updateCustomer, deleteCustomer } from "../api/customers.api.js";

export default function CustomerList() {
    const [customers, setCustomers] = React.useState([]);
    const [countries, setCountries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [err, setErr] = React.useState("");

    // Form state
    const [editId, setEditId] = React.useState(null);
    const [form, setForm] = React.useState({
        code: "", name: "", address_line1: "", address_line2: "", country_id: "", credit_limit: ""
    });
    const [autoCode, setAutoCode] = React.useState(false);

    // Load customers + countries
    const loadData = () => {
        setLoading(true);
        Promise.all([listCustomers(), listCountries()])
            .then(([custs, counts]) => {
                setCustomers(custs);
                setCountries(counts);
                setLoading(false);
            })
            .catch(e => {
                setErr(String(e));
                setLoading(false);
            });
    };

    React.useEffect(loadData, []);

    // Create or update customer
    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = { ...form };
        if (autoCode && !editId) payload.code = "";

        const promise = editId
            ? updateCustomer(editId, payload)
            : createCustomer(payload);

        promise
            .then(() => {
                setForm({ code: "", name: "", address_line1: "", address_line2: "", country_id: "", credit_limit: "" });
                setEditId(null);
                setAutoCode(false);
                loadData();
            })
            .catch(e => setErr(String(e.message || e)));
    };

    // Populate form for editing
    const handleEdit = (c) => {
        setEditId(c.id);
        const limit = c.credit_limit || "";
        setForm({
            code: c.code,
            name: c.name,
            address_line1: c.address_line1 || "",
            address_line2: c.address_line2 || "",
            country_id: c.country_id || "",
            credit_limit: limit
        });
        setAutoCode(false);
    };

    // Delete (with optional force delete)
    const handleDelete = (id) => {
        if (!window.confirm("Are you sure you want to delete this customer?")) return;
        deleteCustomer(id)
            .then(() => loadData())
            .catch(e => {
                const msg = String(e.message || e);
                if (msg.includes("Cannot delete customer because they have existing invoices")) {
                    if (window.confirm("This customer has invoices. Do you want to delete the customer AND all their invoices?")) {
                        deleteCustomer(id, true)
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
        setForm({ code: "", name: "", address_line1: "", address_line2: "", country_id: "", credit_limit: "" });
        setAutoCode(false);
    };

    if (loading && customers.length === 0) return <div className="text-center mt-4">Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">Customers</h3>
            </div>

            {err && <div className="alert alert-error">{err}</div>}

            <div className="card">
                <h4 className="mb-4">{editId ? "Edit Customer" : "Add New Customer"}</h4>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Row 1: Code + Name */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: "1 1 150px" }}>
                            <label className="form-label">Code</label>
                            <div className="flex gap-2">
                                <input
                                    className="form-control"
                                    required={!autoCode}
                                    disabled={autoCode}
                                    value={form.code}
                                    onChange={e => setForm({ ...form, code: e.target.value })}
                                    placeholder="C001"
                                />
                                {!editId && (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input type="checkbox" checked={autoCode} onChange={e => setAutoCode(e.target.checked)} id="c_auto" />
                                        <label htmlFor="c_auto" style={{ marginLeft: 4, fontSize: '0.8rem' }}>Auto</label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="form-group" style={{ flex: "2 1 250px" }}>
                            <label className="form-label">Name</label>
                            <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer Name" />
                        </div>
                    </div>

                    {/* Row 2: Address 1 + Address 2 */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: "1 1 250px" }}>
                            <label className="form-label">Address Line 1</label>
                            <input className="form-control" value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} placeholder="Address Line 1" />
                        </div>
                        <div className="form-group" style={{ flex: "1 1 250px" }}>
                            <label className="form-label">Address Line 2</label>
                            <input className="form-control" value={form.address_line2} onChange={e => setForm({ ...form, address_line2: e.target.value })} placeholder="Address Line 2" />
                        </div>
                    </div>

                    {/* Row 3: Country + Credit Limit */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ flex: "1 1 200px" }}>
                            <label className="form-label">Country</label>
                            <select className="form-control" required value={form.country_id} onChange={e => setForm({ ...form, country_id: e.target.value })}>
                                <option value="">Select Country</option>
                                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: "1 1 150px" }}>
                            <label className="form-label">Credit Limit</label>
                            <input type="number" step="0.01" className="form-control" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} placeholder="0.00" />
                        </div>
                    </div>

                    {/* Row 4: Buttons */}
                    <div className="form-group" style={{ display: 'flex', gap: 8, marginTop: '8px' }}>
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
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id}>
                                    <td className="font-bold">{c.code}</td>
                                    <td>{c.name}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleEdit(c)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px', marginRight: 8 }}>Edit</button>
                                        <button onClick={() => handleDelete(c.id)} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
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
