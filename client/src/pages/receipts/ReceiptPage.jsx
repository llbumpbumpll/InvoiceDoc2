// FILE: client/src/pages/receipts/ReceiptPage.jsx
// Receipt page — view / create / edit modes
// /receipts/new          → mode="create"
// /receipts/:receiptNo   → mode="view"
// /receipts/:receiptNo/edit → mode="edit"
import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getReceipt, createReceipt, updateReceipt } from "../../api/receipts.api.js";
import { getCustomer } from "../../api/customers.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import CustomerPickerModal from "../../components/CustomerPickerModal.jsx";
import InvoicePickerModal from "./InvoicePickerModal.jsx";
import Loading from "../../components/Loading.jsx";
import { AlertModal } from "../../components/Modal.jsx";

const PAYMENT_METHODS = ["cash", "bank transfer", "check"];

// Empty line item template
function emptyLine() {
  return { invoice_no: "", amount_due: 0, amount_already_received: 0, amount_remain: 0, amount_received: 0 };
}

export default function ReceiptPage({ mode: propMode }) {
  const { receiptNo } = useParams();
  const mode = propMode || (receiptNo ? "view" : "create");
  const nav = useNavigate();

  // Header state
  const [autoNo, setAutoNo] = React.useState(true);
  const [receiptNoInput, setReceiptNoInput] = React.useState("");
  const [receiptDate, setReceiptDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [customerCode, setCustomerCode] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  // Line items state
  const [lines, setLines] = React.useState([emptyLine()]);

  // UI state
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [customerLoadError, setCustomerLoadError] = React.useState("");
  const [invoicePickerOpen, setInvoicePickerOpen] = React.useState(false);
  const [invoicePickerLineIdx, setInvoicePickerLineIdx] = React.useState(null);
  const [alertModal, setAlertModal] = React.useState({ isOpen: false, title: "", message: "" });

  // View data
  const [viewData, setViewData] = React.useState(null);

  // Load customer details when customerCode changes
  React.useEffect(() => {
    const code = String(customerCode || "").trim();
    if (!code) {
      setCustomerName("");
      setCustomerLoadError("");
      return;
    }
    let cancelled = false;
    setCustomerLoadError("");
    getCustomer(code)
      .then((data) => {
        if (!cancelled) setCustomerName(data?.name ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setCustomerName("");
          setCustomerLoadError("Customer not found");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerCode]);

  // Load existing receipt for view/edit
  React.useEffect(() => {
    if (mode === "create") {
      setLoading(false);
      return;
    }
    setLoading(true);
    getReceipt(receiptNo)
      .then((data) => {
        if (!data) {
          setErr("Receipt not found");
          setLoading(false);
          return;
        }
        setViewData(data);
        if (mode === "edit") {
          const h = data.header;
          setReceiptNoInput(h.receipt_no);
          setReceiptDate(h.receipt_date ? new Date(h.receipt_date).toISOString().slice(0, 10) : "");
          setCustomerCode(h.customer_code || "");
          setPaymentMethod(h.payment_method || "cash");
          setPaymentNotes(h.payment_notes || "");
          setLines(
            (data.line_items || []).map((li) => ({
              invoice_no: li.invoice_no,
              amount_due: Number(li.amount_due || 0),
              amount_already_received: Number(li.amount_already_received || 0),
              amount_remain: Number(li.amount_remain_before_this ?? li.amount_remain ?? 0),
              amount_received: Number(li.amount_received || 0),
            })),
          );
        }
        setLoading(false);
      })
      .catch((e) => {
        setErr(String(e.message || e));
        setLoading(false);
      });
  }, [receiptNo, mode]);

  const totalReceived = lines.reduce((s, l) => s + Number(l.amount_received || 0), 0);

  function openInvoicePicker(idx) {
    setInvoicePickerLineIdx(idx);
    setInvoicePickerOpen(true);
  }

  function handleInvoiceSelect(row) {
    setLines((prev) => {
      const next = [...prev];
      next[invoicePickerLineIdx] = {
        invoice_no: row.invoice_no,
        amount_due: Number(row.amount_due || 0),
        amount_already_received: Number(row.amount_received || 0),
        amount_remain: Number(row.amount_remain || 0),
        amount_received: Number(row.amount_remain || 0), // default to full remaining
      };
      return next;
    });
  }

  function handleCustomerChange(code) {
    setCustomerCode(code);
    // Clear lines when customer changes
    setLines([emptyLine()]);
  }

  function updateLine(idx, field, value) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function validate() {
    const errs = [];
    if (!receiptDate) errs.push("Receipt Date is required");
    if (!String(customerCode || "").trim()) errs.push("Customer is required");
    else if (!customerName) errs.push("Customer must be valid (select from LoV or enter a valid code)");
    if (lines.length === 0) errs.push("At least one invoice line is required");
    lines.forEach((l, i) => {
      if (!l.invoice_no) errs.push(`Row ${i + 1}: Invoice is required`);
      const amt = Number(l.amount_received);
      if (isNaN(amt) || amt <= 0) errs.push(`Row ${i + 1}: Amount Received must be a positive number`);
    });
    // Duplicate invoice check
    const nos = lines.map((l) => l.invoice_no).filter(Boolean);
    const dups = nos.filter((n, i) => nos.indexOf(n) !== i);
    if (dups.length > 0) errs.push(`Duplicate invoice(s): ${[...new Set(dups)].join(", ")}`);
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (errors.length > 0) {
      setAlertModal({
        isOpen: true,
        title: "Save Failed",
        message: (
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-main)" }}>
            {errors.map((msg, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{msg}</li>
            ))}
          </ul>
        ),
      });
      return;
    }

    setErr("");
    setSubmitting(true);
    try {
      const payload = {
        receipt_no: mode === "create" ? (autoNo ? "" : receiptNoInput.trim()) : receiptNoInput.trim(),
        receipt_date: receiptDate,
        customer_code: customerCode.trim(),
        payment_method: paymentMethod,
        payment_notes: paymentNotes || "",
        line_items: lines.map((l) => ({ invoice_no: l.invoice_no, amount_received: Number(l.amount_received) })),
      };

      if (mode === "create") {
        const res = await createReceipt(payload);
        toast.success("Receipt created.");
        nav(`/receipts/${encodeURIComponent(res.receipt_no)}`);
      } else {
        await updateReceipt(receiptNo, payload);
        toast.success("Receipt updated.");
        nav(`/receipts/${encodeURIComponent(receiptNo)}`);
      }
    } catch (e) {
      const msg = String(e.message || e);
      setErr(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading size="large" />;

  // ── VIEW MODE ──────────────────────────────────────────────────────────────
  if (mode === "view" && viewData) {
    const h = viewData.header;
    const items = viewData.line_items || [];

    return (
      <div className="invoice-preview">
        <div className="page-header no-print">
          <h3 className="page-title">Receipt {h.receipt_no}</h3>
          <div className="flex gap-4">
            <Link to="/receipts" className="btn btn-outline">← Back</Link>
            <Link to={`/receipts/${encodeURIComponent(receiptNo)}/edit`} className="btn btn-outline">Edit</Link>
            <button onClick={() => window.print()} className="btn btn-primary">
              <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V2h12v7"></path>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print PDF
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between mb-4">
            <div>
              <div className="brand mb-4">InvoiceDoc v2</div>
              <div className="font-bold">Customer</div>
              <div>{h.customer_name}</div>
              <div className="text-muted">{h.address_line1 || "-"}</div>
              <div className="text-muted">{h.address_line2 || ""}</div>
              <div className="text-muted">{h.country_name || "-"}</div>
            </div>
            <div className="text-right">
              <h2 className="mb-4">RECEIPT</h2>
              <div><span className="font-bold">Date:</span> {formatDate(h.receipt_date)}</div>
              <div><span className="font-bold">Receipt No:</span> {h.receipt_no}</div>
              <div><span className="font-bold">Payment Method:</span> {h.payment_method}</div>
              {h.payment_notes && (
                <div><span className="font-bold">Notes:</span> {h.payment_notes}</div>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th className="text-right">Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Balance Before</th>
                  <th className="text-right">Amount Received Here</th>
                  <th className="text-right">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {items.map((li) => {
                  const balanceAfter =
                    Number(li.amount_remain_before_this ?? li.amount_remain ?? 0) - Number(li.amount_received || 0);
                  return (
                    <tr key={li.id}>
                      <td style={{ fontWeight: 500 }}>{li.invoice_no}</td>
                      <td className="text-right">{formatBaht(li.amount_due)}</td>
                      <td className="text-right">{formatBaht(li.amount_already_received)}</td>
                      <td className="text-right">{formatBaht(li.amount_remain_before_this ?? li.amount_remain)}</td>
                      <td className="text-right font-bold">{formatBaht(li.amount_received)}</td>
                      <td className="text-right" style={{ color: balanceAfter > 0 ? "#ef4444" : "#22c55e" }}>
                        {formatBaht(balanceAfter)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between">
            <div className="no-print text-muted" style={{ maxWidth: 300, fontSize: "0.8rem" }}>
              Thank you for your payment.
            </div>
            <div style={{ minWidth: 220 }}>
              <div
                className="flex justify-between mt-4 p-2 bg-body font-bold"
                style={{ fontSize: "1.1rem" }}
              >
                <span>Total Received:</span>
                <span>{formatBaht(h.total_received)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE / EDIT MODE ─────────────────────────────────────────────────────
  const isCreate = mode === "create";
  const title = isCreate ? "Create Receipt" : `Edit Receipt ${receiptNo}`;

  return (
    <div>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
      />

      <CustomerPickerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        initialSearch={customerCode}
        onSelect={(code) => {
          handleCustomerChange(String(code));
          setCustomerModalOpen(false);
        }}
      />

      <InvoicePickerModal
        isOpen={invoicePickerOpen}
        onClose={() => setInvoicePickerOpen(false)}
        onSelect={handleInvoiceSelect}
        customerCode={customerCode}
        excludeReceiptNo={mode === "edit" ? receiptNo : null}
      />

      <div className="page-header">
        <h3 className="page-title">{title}</h3>
        <Link to="/receipts" className="btn btn-outline">
          <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </Link>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, marginBottom: 16 }}>
          {/* Header card */}
          <div className="card">
            <h4>Receipt Details</h4>
            <div style={{ display: "grid", gap: 12 }}>

              {/* Receipt No */}
              <div className="form-group">
                <label className="form-label">
                  {isCreate && autoNo ? "Receipt No" : <>Receipt No <span className="required-marker">*</span></>}
                </label>
                <div className="flex gap-2">
                  <input
                    className="form-control"
                    disabled={isCreate ? autoNo : true}
                    value={isCreate ? receiptNoInput : (receiptNoInput || receiptNo)}
                    onChange={(e) => setReceiptNoInput(e.target.value)}
                    placeholder="e.g. RCT26-00001"
                  />
                  {isCreate && (
                    <div className="form-inline-option">
                      <input
                        type="checkbox"
                        checked={autoNo}
                        onChange={(e) => setAutoNo(e.target.checked)}
                        id="rct_auto"
                      />
                      <label htmlFor="rct_auto">Auto</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Date */}
              <div className="form-group">
                <label className="form-label">Receipt Date <span className="required-marker">*</span></label>
                <input
                  type="date"
                  className="form-control"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>

              {/* Customer Code */}
              <div className="form-group">
                <label className="form-label">Customer Code <span className="required-marker">*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-control"
                    value={customerCode}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    placeholder="e.g. C001"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => setCustomerModalOpen(true)}>
                    LoV
                  </button>
                  {customerCode && (
                    <button
                      type="button"
                      onClick={() => { handleCustomerChange(""); }}
                      style={{ padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-body)", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {customerLoadError && (
                  <span style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: 4, display: "block" }}>{customerLoadError}</span>
                )}
              </div>

              {/* Customer Name (readonly) */}
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-control" disabled value={customerName} placeholder="—" readOnly />
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Method <span className="required-marker">*</span></label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Notes */}
              <div className="form-group">
                <label className="form-label">Payment Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="card" style={{ height: "fit-content" }}>
            <h4>Summary</h4>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
                <span>Total Received</span>
                <span>{formatBaht(totalReceived)}</span>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.875rem" }}
                disabled={submitting || !customerCode || !customerName}
              >
                {submitting
                  ? isCreate ? "Creating..." : "Saving..."
                  : isCreate ? "Create Receipt" : "Save Changes"}
              </button>
              {(!customerCode || !customerName) && (
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#ef4444", textAlign: "center" }}>
                  Please select a valid customer
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line items table */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Invoice Line Items</h4>
            <button
              type="button"
              className="btn btn-outline"
              onClick={addLine}
              disabled={!customerCode || !customerName}
            >
              + Add Row
            </button>
          </div>

          {(!customerCode || !customerName) && (
            <div className="text-muted" style={{ marginBottom: 12, fontSize: "0.875rem" }}>
              Select a customer to add invoice lines.
            </div>
          )}

          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th className="text-right">Full Amount Due</th>
                  <th className="text-right">Already Received</th>
                  <th className="text-right">Amount Remaining</th>
                  <th className="text-right" style={{ minWidth: 160 }}>Amount Received Here</th>
                  <th className="text-right">Still Remaining</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const stillRemaining = Number(line.amount_remain || 0) - Number(line.amount_received || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            className="form-control"
                            style={{ width: 140, fontSize: "0.85rem" }}
                            value={line.invoice_no}
                            readOnly
                            placeholder="Select..."
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                            disabled={!customerCode || !customerName}
                            onClick={() => openInvoicePicker(idx)}
                          >
                            LoV
                          </button>
                        </div>
                      </td>
                      <td className="text-right">{formatBaht(line.amount_due)}</td>
                      <td className="text-right">{formatBaht(line.amount_already_received)}</td>
                      <td className="text-right">{formatBaht(line.amount_remain)}</td>
                      <td className="text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          style={{ width: 140, textAlign: "right", fontSize: "0.85rem" }}
                          value={line.amount_received}
                          onChange={(e) => updateLine(idx, "amount_received", e.target.value)}
                        />
                      </td>
                      <td className="text-right" style={{ color: stillRemaining > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                        {formatBaht(stillRemaining)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: "0.7rem", padding: "4px 8px", color: "#ef4444", borderColor: "#ef4444" }}
                          onClick={() => removeLine(idx)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                      No lines yet. Click "+ Add Row" to add an invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}
