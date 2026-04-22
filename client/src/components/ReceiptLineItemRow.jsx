// Single row in the receipt line items table:
// Invoice No + LoV → Amount Due, Already Received, Remaining (read-only),
// Amount Received Here (editable), Amount Still Remaining (read-only)
import React from "react";

const actionBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  borderRadius: 4,
  color: "#666",
  transition: "all 0.15s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const disabledBtnStyle = { ...actionBtnStyle, cursor: "not-allowed", color: "#ddd" };

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

export default function ReceiptLineItemRow({
  index,
  item,
  itemsLength,
  customerCode,
  update,
  removeRow,
  moveUp,
  moveDown,
  insertRowAfter,
  onOpenPicker,
  formatBaht,
  computeAmountStillRemaining,
}) {
  const i = index;
  const it = item;

  const amountRemaining = Number(it.amount_remaining ?? 0);
  const stillRemaining = computeAmountStillRemaining(it);
  const hasInvoice = Boolean(it.invoice_no);
  const canPick = Boolean(customerCode);

  return (
    <tr>
      <td className="text-center">
        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)" }}>{i + 1}</span>
      </td>

      {/* Invoice No + LoV */}
      <td>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
          <input
            type="text"
            className="form-control"
            value={it.invoice_no || ""}
            readOnly
            placeholder={canPick ? "Use LoV to pick invoice" : "Select customer first"}
            style={{ flex: 1, minWidth: 0, padding: "6px 10px", fontSize: "0.9rem", background: "var(--bg-body)" }}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canPick}
            style={{ flexShrink: 0, padding: "6px 12px", fontSize: "0.8rem", opacity: canPick ? 1 : 0.5 }}
            onClick={() => onOpenPicker(i)}
            title={canPick ? "List of Values" : "Select customer first"}
          >
            LoV
          </button>
          {hasInvoice && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                update(i, {
                  invoice_no: "",
                  invoice_date: "",
                  amount_due: 0,
                  amount_already_received: 0,
                  amount_remaining: 0,
                  amount_received_here: 0,
                });
              }}
              title="Clear"
              style={{
                padding: "0 8px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-body)",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "1.1rem",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </td>

      {/* Full Amount Due */}
      <td>
        <div style={{ textAlign: "right", padding: "8px 12px", background: "var(--bg-body)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {hasInvoice ? formatBaht(it.amount_due) : "—"}
        </div>
      </td>

      {/* Amount Already Received (excluding current receipt) */}
      <td>
        <div style={{ textAlign: "right", padding: "8px 12px", background: "var(--bg-body)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {hasInvoice ? formatBaht(it.amount_already_received ?? 0) : "—"}
        </div>
      </td>

      {/* Amount Remaining */}
      <td>
        <div style={{ textAlign: "right", fontWeight: 600, color: "var(--primary)", fontSize: "0.9rem", padding: "8px 12px" }}>
          {hasInvoice ? formatBaht(amountRemaining) : "—"}
        </div>
      </td>

      {/* Amount Received Here (editable) */}
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value={it.amount_received_here ?? 0}
          onChange={(e) => update(i, { amount_received_here: e.target.value })}
          disabled={!hasInvoice}
          className="form-control"
          style={{ textAlign: "right", padding: "8px 12px", fontSize: "0.9rem" }}
        />
      </td>

      {/* Amount Still Remaining */}
      <td>
        <div
          style={{
            textAlign: "right",
            padding: "8px 12px",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: stillRemaining < 0 ? "#ef4444" : "var(--text-main)",
          }}
        >
          {hasInvoice ? formatBaht(stillRemaining) : "—"}
        </div>
      </td>

      {/* Actions */}
      <td>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <button type="button" onClick={() => moveUp(i)} disabled={i === 0} style={i === 0 ? disabledBtnStyle : actionBtnStyle} title="Move up">
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            onClick={() => moveDown(i)}
            disabled={i === itemsLength - 1}
            style={i === itemsLength - 1 ? disabledBtnStyle : actionBtnStyle}
            title="Move down"
          >
            <ArrowDownIcon />
          </button>
          <button type="button" onClick={() => insertRowAfter(i)} style={actionBtnStyle} title="Insert row below">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={itemsLength <= 1}
            style={{
              ...actionBtnStyle,
              color: itemsLength <= 1 ? "#ddd" : "#ef4444",
              cursor: itemsLength <= 1 ? "not-allowed" : "pointer",
            }}
            title="Remove item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
