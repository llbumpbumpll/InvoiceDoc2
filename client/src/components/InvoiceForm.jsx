// Invoice form component (ฟอร์มสร้าง/แก้ไขใบแจ้งหนี้)
// Example usage: <InvoiceForm customers={...} products={...} onSubmit={...} />
import React from "react";
import LineItemsEditor from "./LineItemsEditor.jsx";
import { formatBaht } from "../utils.js";

export default function InvoiceForm({ customers, products, onSubmit, submitting, initialData }) {
  // Local state for header fields and line items
  const [invoiceNo, setInvoiceNo] = React.useState("");
  const [customerId, setCustomerId] = React.useState(customers[0]?.id ?? "");
  const [invoiceDate, setInvoiceDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [vatRate, setVatRate] = React.useState(0.07);
  const [items, setItems] = React.useState([]);

  React.useEffect(() => {
    if (initialData) {
      setInvoiceNo(initialData.invoice_no);
      setCustomerId(initialData.customer_id);
      const d = initialData.invoice_date ? new Date(initialData.invoice_date).toISOString().slice(0, 10) : "";
      setInvoiceDate(d);
      setVatRate(Number(initialData.vat_rate || 0.07));
      const mappedItems = (initialData.line_items || []).map(li => ({
        product_id: li.product_id,
        quantity: li.quantity,
        unit_price: Number(li.unit_price) // Ensure price is loaded
      }));
      setItems(mappedItems);
    } else {
      const first = products[0];
      if (products.length > 0) {
        // Default first line item when creating
        setItems([{ product_id: first.id, quantity: 1, unit_price: Number(first.unit_price || 0) }]);
      }
    }
  }, [initialData, products]); // Run when initialData or products load

  React.useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  React.useEffect(() => {
    // Only set default item if:
    // 1. Not loading initial data (handled above)
    // 2. No items exist
    // 3. Products are loaded
    if (!initialData && items.length === 0 && products[0]) {
      setItems([{ product_id: products[0].id, quantity: 1, unit_price: Number(products[0].unit_price || 0) }]);
    }
  }, [products, items.length, initialData]);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const vat = subtotal * Number(vatRate || 0);
  const amountDue = subtotal + vat;

  const [autoCode, setAutoCode] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      setInvoiceNo(initialData.invoice_no);
      setCustomerId(initialData.customer_id);
      // ...
    }
  }, [initialData, products]);

  // NOTE: I am placing the autoCode logic inside the render.

  // Build payload and pass to parent
  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      invoice_no: autoCode ? "" : invoiceNo.trim(), // Send empty if auto
      customer_id: Number(customerId),
      invoice_date: invoiceDate,
      vat_rate: Number(vatRate),
      line_items: items.map((x) => ({
        product_id: Number(x.product_id),
        quantity: Number(x.quantity),
        unit_price: x.unit_price === "" || x.unit_price === null ? undefined : Number(x.unit_price),
      })),
    };
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="invoice-form">
      {/* Example usage: fill fields, then submit to create/update */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Left Column: Details */}
        <div className="card">
          <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Invoice Details</h4>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Invoice No</label>
              <div className="flex gap-2">
                <input
                  className="form-control"
                  required={!autoCode}
                  disabled={autoCode}
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="e.g. INV-2026-0001"
                />
                {!initialData && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input type="checkbox" checked={autoCode} onChange={e => setAutoCode(e.target.checked)} id="inv_auto" />
                    <label htmlFor="inv_auto" style={{ marginLeft: 4, fontSize: '0.8rem' }}>Auto</label>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Customer</label>
              <select
                className="form-control"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Invoice Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">VAT Rate</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    className="form-control"
                    value={Math.round(Number(vatRate) * 100) / 100}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {(vatRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="card" style={{ height: "fit-content" }}>
          <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Summary</h4>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Subtotal</span>
              <span className="amount">{submitting ? "..." : formatBaht(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>VAT ({(vatRate * 100).toFixed(0)}%)</span>
              <span className="amount">{submitting ? "..." : formatBaht(vat)}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)" }}>
              <span>Total</span>
              <span>{submitting ? "..." : formatBaht(amountDue)}</span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px" }}
              disabled={submitting || products.length === 0 || customers.length === 0}
            >
              {submitting ? "Creating Invoice..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>

      <LineItemsEditor products={products} value={items} onChange={setItems} />
    </form>
  );
}
