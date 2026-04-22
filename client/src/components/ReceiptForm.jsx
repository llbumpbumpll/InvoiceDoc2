// Receipt form (create / edit). Header + line items (one row per invoice payment).
import React from "react";
import ReceiptLineItemsEditor from "./ReceiptLineItemsEditor.jsx";
import CustomerPickerModal from "./CustomerPickerModal.jsx";
import { AlertModal, ConfirmModal } from "./Modal.jsx";
import { getCustomer } from "../api/customers.api.js";
import { formatBaht } from "../utils.js";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
];

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export default function ReceiptForm({ onSubmit, submitting, initialData, receiptId }) {
  const [receiptNo, setReceiptNo] = React.useState("");
  const [receiptDate, setReceiptDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [customerCode, setCustomerCode] = React.useState("");
  const [customerDetails, setCustomerDetails] = React.useState(null);
  const [customerLoadError, setCustomerLoadError] = React.useState("");
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [autoCode, setAutoCode] = React.useState(true);

  const [items, setItems] = React.useState([
    { invoice_no: "", invoice_date: "", amount_due: 0, amount_already_received: 0, amount_remaining: 0, amount_received_here: 0 },
  ]);

  const [alertModal, setAlertModal] = React.useState({ isOpen: false, title: "Validation Error", message: "" });
  const [confirmChangeCustomer, setConfirmChangeCustomer] = React.useState({ isOpen: false, newCode: "" });

  // Load customer details when customerCode changes (from initialData or picker)
  React.useEffect(() => {
    const code = String(customerCode || "").trim();
    if (!code) {
      setCustomerDetails(null);
      setCustomerLoadError("");
      return;
    }
    let cancelled = false;
    getCustomer(code)
      .then((data) => { if (!cancelled) { setCustomerDetails(data); setCustomerLoadError(""); } })
      .catch(() => {
        if (!cancelled) {
          setCustomerDetails(null);
          setCustomerLoadError("Customer not found");
        }
      });
    return () => { cancelled = true; };
  }, [customerCode]);

  // Load initial data (edit / view)
  React.useEffect(() => {
    if (!initialData) return;
    setReceiptNo(initialData.receipt_no || "");
    setCustomerCode(initialData.customer_code || "");
    const d = initialData.receipt_date
      ? new Date(initialData.receipt_date).toISOString().slice(0, 10)
      : "";
    setReceiptDate(d);
    setPaymentMethod(initialData.payment_method || "cash");
    setPaymentNotes(initialData.payment_notes || "");
    const mapped = (initialData.line_items || []).map((li) => ({
      line_item_id: li.id,
      invoice_no: li.invoice_no,
      amount_due: Number(li.amount_due || 0),
      amount_already_received: Number(li.amount_already_received || 0),
      amount_remaining: Number(li.amount_remaining || 0),
      amount_received_here: Number(li.amount_received_here || 0),
    }));
    setItems(mapped.length > 0 ? mapped : [{ invoice_no: "", amount_due: 0, amount_already_received: 0, amount_remaining: 0, amount_received_here: 0 }]);
  }, [initialData]);

  const totalReceived = round2(items.reduce((s, it) => s + Number(it.amount_received_here || 0), 0));
  const hasEmptyInvoice = items.some((it) => !it.invoice_no);
  const hasEmptyCustomer = !customerCode || !customerDetails;

  function tryChangeCustomer(newCode) {
    const hasLines = items.some((it) => it.invoice_no);
    if (hasLines && newCode !== customerCode) {
      setConfirmChangeCustomer({ isOpen: true, newCode });
    } else {
      setCustomerCode(newCode);
    }
  }

  function confirmChangeCustomerApply() {
    const newCode = confirmChangeCustomer.newCode;
    setCustomerCode(newCode);
    setItems([{ invoice_no: "", invoice_date: "", amount_due: 0, amount_already_received: 0, amount_remaining: 0, amount_received_here: 0 }]);
    setConfirmChangeCustomer({ isOpen: false, newCode: "" });
  }

  function validate() {
    const errs = [];
    if (!receiptDate) errs.push("Date should not be null");
    if (!customerCode) errs.push("Customer Code should not be null");
    else if (!customerDetails) errs.push("Customer must be selected from list");
    if (!paymentMethod) errs.push("Payment method is required");
    items.forEach((it, i) => {
      const row = i + 1;
      if (!it.invoice_no) errs.push(`Row ${row}: Invoice is required`);
      const a = Number(it.amount_received_here);
      if (Number.isNaN(a) || a < 0) errs.push(`Row ${row}: Amount Received Here must be >= 0`);
    });
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (errors.length > 0) {
      setAlertModal({
        isOpen: true,
        title: "Save Failed.",
        message: (
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text-main)" }}>
            {errors.map((m, i) => <li key={i} style={{ marginBottom: 4 }}>{m}</li>)}
          </ul>
        ),
      });
      return;
    }
    const payload = {
      receipt_no: initialData ? receiptNo.trim() : (autoCode ? "" : receiptNo.trim()),
      customer_code: String(customerCode).trim(),
      receipt_date: receiptDate,
      payment_method: paymentMethod,
      payment_notes: paymentNotes || null,
      line_items: items.map((x) => {
        const out = {
          invoice_no: String(x.invoice_no).trim(),
          amount_received_here: round2(Number(x.amount_received_here || 0)),
        };
        if (x.line_item_id != null && Number(x.line_item_id) > 0) out.id = Number(x.line_item_id);
        return out;
      }),
    };
    onSubmit(payload);
  }

  const customerAddressDisplay = customerDetails
    ? [customerDetails.address_line1, customerDetails.address_line2, customerDetails.country_name].filter(Boolean).join(", ") || ""
    : "";

  return (
    <>
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((p) => ({ ...p, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
      />
      <ConfirmModal
        isOpen={confirmChangeCustomer.isOpen}
        onClose={() => setConfirmChangeCustomer({ isOpen: false, newCode: "" })}
        onConfirm={confirmChangeCustomerApply}
        closeOnConfirm={false}
        title="Change Customer?"
        message="Changing customer will clear all invoice payment lines. Continue?"
        confirmText="Change"
      />

      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="invoice-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 16 }}>
          <div className="card">
            <h4>Receipt Details</h4>
            <div style={{ display: "grid", gap: 12 }}>
              {/* Receipt No */}
              <div className="form-group">
                <label className="form-label">{(!initialData && autoCode) ? "Receipt No" : <>Receipt No <span className="required-marker">*</span></>}</label>
                <div className="flex gap-2">
                  <input
                    className="form-control"
                    required={!autoCode}
                    disabled={autoCode && !initialData}
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    placeholder="e.g. RCT26-00001"
                  />
                  {!initialData && (
                    <div className="form-inline-option">
                      <input type="checkbox" checked={autoCode} onChange={(e) => setAutoCode(e.target.checked)} id="rct_auto" />
                      <label htmlFor="rct_auto">Auto</label>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Code */}
              <div className="form-group">
                <label className="form-label">Customer Code <span className="required-marker">*</span></label>
                <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                  <input
                    className="form-control"
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    onBlur={() => {/* lookup effect covers this */}}
                    placeholder="e.g. C001"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => setCustomerModalOpen(true)} title="List of Values">LoV</button>
                  {customerCode && (
                    <button
                      type="button"
                      onClick={() => { setCustomerCode(""); setCustomerDetails(null); setCustomerLoadError(""); }}
                      title="Clear"
                      style={{ padding: "0 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--bg-body)", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {customerLoadError && <span style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: 4, display: "block" }}>{customerLoadError}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-control" disabled readOnly value={customerDetails?.name ?? ""} placeholder="—" />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Address</label>
                <input className="form-control" disabled readOnly value={customerAddressDisplay} placeholder="—" />
              </div>

              <CustomerPickerModal
                isOpen={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                initialSearch={customerCode}
                onSelect={(code) => {
                  setCustomerModalOpen(false);
                  tryChangeCustomer(String(code));
                }}
              />

              {/* Date + Payment Method */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Date <span className="required-marker">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method <span className="required-marker">*</span></label>
                  <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Payment Notes */}
              <div className="form-group">
                <label className="form-label">Payment Notes</label>
                <input
                  className="form-control"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. K-Bank Check #1031"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card invoice-summary-card" style={{ height: "fit-content" }}>
            <h4>Summary</h4>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                <span>Lines</span>
                <span>{items.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                <span>Payment Method</span>
                <span>{PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label || paymentMethod}</span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>
                <span>Total Received</span>
                <span>{submitting ? "..." : formatBaht(totalReceived)}</span>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 14px", fontSize: "0.875rem" }}
                disabled={submitting || hasEmptyInvoice || hasEmptyCustomer}
              >
                {submitting ? (initialData ? "Saving..." : "Creating...") : (initialData ? "Save Changes" : "Create Receipt")}
              </button>
              {(hasEmptyCustomer || hasEmptyInvoice) && (
                <div style={{ marginTop: 6, fontSize: "0.75rem", color: "#ef4444", textAlign: "center" }}>
                  {hasEmptyCustomer && <div>Please enter customer code or select from LoV</div>}
                  {hasEmptyInvoice && <div>Please select an invoice for all rows</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        <ReceiptLineItemsEditor
          value={items}
          onChange={setItems}
          customerCode={customerCode && customerDetails ? customerCode : ""}
          excludeReceiptId={receiptId}
        />
      </form>
    </>
  );
}
