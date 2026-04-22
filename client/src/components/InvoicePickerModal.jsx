import React from "react";
import { createPortal } from "react-dom";
import { listUnpaidInvoicesForCustomer } from "../api/invoices.api.js";
import { formatBaht, formatDate } from "../utils.js";
import { TableLoading } from "./Loading.jsx";

/**
 * LoV for receipt form line items. Lists ONLY unpaid invoices of the selected
 * customer. If `excludeReceiptId` is given, invoices already in that receipt
 * remain visible (otherwise they'd look fully paid due to their own payment).
 */
export default function InvoicePickerModal({
  isOpen,
  onClose,
  onSelect,
  customerCode,
  excludeReceiptId,
}) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    if (!customerCode) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listUnpaidInvoicesForCustomer(customerCode, excludeReceiptId)
      .then((data) => {
        if (!cancelled) setRows(data || []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, customerCode, excludeReceiptId]);

  React.useEffect(() => {
    if (isOpen) setSearchInput("");
  }, [isOpen]);

  const filtered = React.useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.invoice_no || "").toLowerCase().includes(q));
  }, [rows, searchInput]);

  if (!isOpen) return null;

  const handleSelect = (row) => {
    onSelect(row);
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
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
          maxWidth: 780,
          width: "100%",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600 }}>Select Unpaid Invoice</h3>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                Customer: <strong>{customerCode || "—"}</strong>
              </div>
            </div>
            <div style={{ position: "relative", width: 240 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search invoice no..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
              <svg
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
          </div>
        </div>

        <div style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          {!customerCode ? (
            <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
              <strong>Please select a customer first.</strong>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 6 }}>
                Invoice list is filtered by the customer in the receipt header.
              </div>
            </div>
          ) : (
            <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Invoice Date</th>
                    <th className="text-right">Amount Due</th>
                    <th className="text-right">Already Received</th>
                    <th className="text-right">Remaining</th>
                    <th style={{ width: 90 }} className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoading colSpan={6} />
                  ) : (
                    filtered.map((row) => (
                      <tr key={row.invoice_no}>
                        <td style={{ fontWeight: 500 }}>{row.invoice_no}</td>
                        <td>{formatDate(row.invoice_date)}</td>
                        <td className="text-right">{formatBaht(row.amount_due)}</td>
                        <td className="text-right" style={{ color: "var(--text-muted)" }}>
                          {formatBaht(row.amount_received)}
                        </td>
                        <td className="text-right" style={{ fontWeight: 600, color: "var(--primary)" }}>
                          {formatBaht(row.amount_remain)}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                            onClick={() => handleSelect(row)}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        {searchInput ? "No matching invoices." : "No unpaid invoices for this customer."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
