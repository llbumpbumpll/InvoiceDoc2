// Invoice detail/print page (หน้าดูใบแจ้งหนี้ + พิมพ์)
// Example usage: visit `/invoices/123` แล้วกด Print
import React from "react";
import { useParams, Link } from "react-router-dom";
import { getInvoice } from "../api/invoices.api.js";
import { formatBaht, formatDate } from "../utils.js";

export default function InvoiceView() {
  const { id } = useParams();
  const [data, setData] = React.useState(null);
  const [err, setErr] = React.useState("");

  // Load invoice data
  React.useEffect(() => {
    getInvoice(id)
      .then(setData)
      .catch((e) => setErr(String(e.message || e)));
  }, [id]);

  if (err) return <div className="alert alert-error">{err}</div>;
  if (!data) return <div className="text-center mt-4">Loading...</div>;

  const h = data.header;
  const lines = data.line_items || [];

  // Trigger browser print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-preview">
      <div className="page-header no-print">
        <h3 className="page-title">Invoice {h.invoice_no}</h3>
        <div className="flex gap-4">
          <Link to="/invoices" className="btn btn-outline">← Back</Link>
          <button onClick={handlePrint} className="btn btn-primary">
            <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print PDF
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between mb-4">
          <div>
            <div className="brand mb-4">InvoicePro</div>
            <div className="font-bold">Customer</div>
            <div>{h.customer_name}</div>
            <div className="text-muted">{h.address_line1 || "-"}</div>
            <div className="text-muted">{h.address_line2 || ""}</div>
            <div className="text-muted">{h.country_name || "-"}</div>
          </div>
          <div className="text-right">
            <h2 className="mb-4">INVOICE</h2>
            <div><span className="font-bold">Date:</span> {formatDate(h.invoice_date)}</div>
            <div><span className="font-bold">Invoice No:</span> {h.invoice_no}</div>
          </div>
        </div>

        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Extended</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((li) => (
                <tr key={li.id}>
                  <td>{li.product_code} - {li.product_name}</td>
                  <td>{li.units_code}</td>
                  <td className="text-right">{Number(li.quantity || 0).toFixed(2)}</td>
                  <td className="text-right">{formatBaht(li.unit_price)}</td>
                  <td className="text-right font-bold">{formatBaht(li.extended_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between">
          <div className="no-print text-muted" style={{ maxWidth: 300, fontSize: '0.8rem' }}>
            Thank you for your business. Please pay within 30 days.
          </div>
          <div style={{ minWidth: 200 }}>
            <div className="flex justify-between mb-2">
              <span>Subtotal:</span>
              <span>{formatBaht(h.total_amount)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>VAT:</span>
              <span>{formatBaht(h.vat)}</span>
            </div>
            <div className="flex justify-between mt-4 p-2 bg-body font-bold" style={{ fontSize: '1.1rem' }}>
              <span>Total Due:</span>
              <span>{formatBaht(h.amount_due)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
