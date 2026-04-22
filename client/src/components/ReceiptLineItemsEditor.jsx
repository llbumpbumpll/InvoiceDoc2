// Line items table for the receipt form. Rows reference invoices (unpaid, for
// the selected customer) and record how much is being received in THIS receipt.
import React from "react";
import { formatBaht } from "../utils.js";
import ReceiptLineItemRow from "./ReceiptLineItemRow.jsx";
import InvoicePickerModal from "./InvoicePickerModal.jsx";

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export default function ReceiptLineItemsEditor({
  value,
  onChange,
  customerCode,
  excludeReceiptId,
}) {
  const items = value;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerRowIndex, setPickerRowIndex] = React.useState(0);

  function update(i, patch) {
    const next = items.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
    onChange(next);
  }

  function blankRow() {
    return {
      invoice_no: "",
      invoice_date: "",
      amount_due: 0,
      amount_already_received: 0,
      amount_remaining: 0,
      amount_received_here: 0,
    };
  }

  function addRow() {
    onChange([...items, blankRow()]);
  }

  function insertRowAfter(i) {
    const next = [...items.slice(0, i + 1), blankRow(), ...items.slice(i + 1)];
    onChange(next);
  }

  function removeRow(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function moveUp(i) {
    if (i <= 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }

  function moveDown(i) {
    if (i >= items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }

  function handleOpenPicker(i) {
    if (!customerCode) return;
    setPickerRowIndex(i);
    setPickerOpen(true);
  }

  function handlePickInvoice(row) {
    // Prevent duplicate — if already in the list, just focus default amount
    const existingIndex = items.findIndex((it, idx) => idx !== pickerRowIndex && String(it.invoice_no) === String(row.invoice_no));
    if (existingIndex !== -1) {
      // Already picked — don't duplicate. Clear current row instead.
      update(pickerRowIndex, blankRow());
      return;
    }
    update(pickerRowIndex, {
      invoice_no: row.invoice_no,
      invoice_date: row.invoice_date,
      amount_due: Number(row.amount_due || 0),
      amount_already_received: Number(row.amount_received || 0),
      amount_remaining: Number(row.amount_remain || 0),
      // Default Amount Received Here = Amount Remaining
      amount_received_here: Number(row.amount_remain || 0),
    });
  }

  function computeAmountStillRemaining(it) {
    const remaining = Number(it.amount_remaining || 0);
    const here = Number(it.amount_received_here || 0);
    return round2(remaining - here);
  }

  const totalReceived = round2(items.reduce((s, it) => s + Number(it.amount_received_here || 0), 0));

  return (
    <div className="card">
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: "1px solid var(--border)",
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Invoice Payments</h4>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {items.length} line{items.length !== 1 ? "s" : ""} {customerCode ? "" : "• Select customer first"}
          </span>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="btn btn-primary"
          style={{ padding: "8px 16px" }}
          disabled={!customerCode}
        >
          <svg style={{ marginRight: 6 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Row
        </button>
      </div>

      <div className="table-container">
        <table className="modern-table" style={{ fontSize: "0.9rem" }}>
          <thead>
            <tr>
              <th style={{ width: "50px" }} className="text-center">#</th>
              <th style={{ width: "18%" }}>Invoice No <span className="required-marker">*</span></th>
              <th style={{ width: "12%" }} className="text-right">Full Amount Due</th>
              <th style={{ width: "13%" }} className="text-right">Amount Already Received</th>
              <th style={{ width: "12%" }} className="text-right">Amount Remaining</th>
              <th style={{ width: "12%" }} className="text-right">Amount Received Here <span className="required-marker">*</span></th>
              <th style={{ width: "12%" }} className="text-right">Amount Still Remaining</th>
              <th style={{ width: "100px" }} className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <ReceiptLineItemRow
                key={i}
                index={i}
                item={it}
                itemsLength={items.length}
                customerCode={customerCode}
                update={update}
                removeRow={removeRow}
                moveUp={moveUp}
                moveDown={moveDown}
                insertRowAfter={insertRowAfter}
                onOpenPicker={handleOpenPicker}
                formatBaht={formatBaht}
                computeAmountStillRemaining={computeAmountStillRemaining}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  {customerCode ? "No payment lines yet. Click \"Add Row\"." : "Select a customer first."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 16,
          paddingTop: 16,
          borderTop: "2px solid var(--border)",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "12px 20px",
            background: "var(--bg-body)",
            borderRadius: "var(--radius-sm)",
          }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Total Received ({items.length} line{items.length !== 1 ? "s" : ""})
            </span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>
              {formatBaht(totalReceived)}
            </span>
          </div>
        </div>
      )}

      <InvoicePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickInvoice}
        customerCode={customerCode}
        excludeReceiptId={excludeReceiptId}
      />
    </div>
  );
}
