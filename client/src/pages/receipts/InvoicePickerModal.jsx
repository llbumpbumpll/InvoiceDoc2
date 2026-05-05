// FILE: client/src/pages/receipts/InvoicePickerModal.jsx
// Modal for selecting an unpaid invoice for a given customer.
import React from "react";
import { createPortal } from "react-dom";
import { listUnpaidInvoices } from "../../api/receipts.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import { TableLoading } from "../../components/Loading.jsx";

export default function InvoicePickerModal({ isOpen, onClose, onSelect, customerCode, excludeReceiptNo }) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (!isOpen || !customerCode) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    listUnpaidInvoices(customerCode, excludeReceiptNo || null)
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerCode, excludeReceiptNo]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 24,
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          maxWidth: 760,
          width: "100%",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 600 }}>Select Invoice</h3>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ padding: "4px 12px" }}>
            Close
          </button>
        </div>

        {err && <div className="alert alert-error" style={{ margin: "12px 20px" }}>{err}</div>}

        <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Invoice Date</th>
                  <th className="text-right">Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Remaining</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={6} />
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                      {customerCode ? "No unpaid invoices for this customer." : "Select a customer first."}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.invoice_id}>
                      <td style={{ fontWeight: 500 }}>{row.invoice_no}</td>
                      <td>{formatDate(row.invoice_date)}</td>
                      <td className="text-right">{formatBaht(row.amount_due)}</td>
                      <td className="text-right">{formatBaht(row.amount_received)}</td>
                      <td className="text-right font-bold" style={{ color: "var(--primary)" }}>
                        {formatBaht(row.amount_remain)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                          onClick={() => {
                            onSelect(row);
                            onClose();
                          }}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
