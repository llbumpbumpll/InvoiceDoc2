// Invoice list page (หน้ารายการใบแจ้งหนี้)
// Example usage: visit `/invoices`
import React from "react";
import { Link } from "react-router-dom";
import { listInvoices, deleteInvoice } from "../api/invoices.api.js";
import { formatBaht, formatDate } from "../utils.js";

export default function InvoiceList() {
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");

  // Load invoice rows from API
  const loadData = () => {
    listInvoices()
      .then(setRows)
      .catch((e) => setErr(String(e.message || e)));
  };

  React.useEffect(loadData, []);

  // Delete invoice after confirmation
  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    deleteInvoice(id)
      .then(() => loadData())
      .catch(e => alert("Error: " + String(e.message || e)));
  };

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Invoices</h3>
        <Link to="/invoices/new" className="btn btn-primary">
          <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Create New
        </Link>
      </div>

      <div className="card">
        {err && <div className="alert alert-error">{err}</div>}

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Date</th>
                <th className="text-right">Amount Due</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/invoices/${r.id}`} style={{ fontWeight: 500, color: 'var(--primary)' }}>
                      {r.invoice_no}
                    </Link>
                  </td>
                  <td>{r.customer_name}</td>
                  <td>{formatDate(r.invoice_date)}</td>
                  <td className="text-right font-bold">
                    {formatBaht(r.amount_due)}
                  </td>
                  <td className="text-right">
                    <Link to={`/invoices/${r.id}/edit`} className="btn btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px', marginRight: 8 }}>Edit</Link>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.7rem', padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No invoices found. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
