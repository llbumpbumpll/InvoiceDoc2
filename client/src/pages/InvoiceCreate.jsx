// Create invoice page (หน้าสร้างใบแจ้งหนี้)
// Example usage: visit `/invoices/new`
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { listCustomers } from "../api/customers.api.js";
import { listProducts } from "../api/products.api.js";
import { createInvoice } from "../api/invoices.api.js";
import InvoiceForm from "../components/InvoiceForm.jsx";

export default function InvoiceCreate() {
  const nav = useNavigate();
  const [customers, setCustomers] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Load customers + products for dropdowns
  React.useEffect(() => {
    Promise.all([listCustomers(), listProducts()])
      .then(([cs, ps]) => { setCustomers(cs); setProducts(ps); })
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  // Submit to API then navigate to detail page
  async function onSubmit(payload) {
    setErr("");
    setSubmitting(true);
    try {
      const res = await createInvoice(payload);
      // res = { id }
      nav(`/invoices/${res.id}`);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Create Invoice</h3>
        <Link to="/invoices" className="btn btn-outline">
          <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back
        </Link>
      </div>
      {err && <div className="alert alert-error">{err}</div>}
      <InvoiceForm customers={customers} products={products} onSubmit={onSubmit} submitting={submitting} />
    </div>
  );
}
