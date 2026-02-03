// Edit invoice page (หน้าแก้ไขใบแจ้งหนี้)
// Example usage: visit `/invoices/123/edit`
import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { listCustomers } from "../api/customers.api.js";
import { listProducts } from "../api/products.api.js";
import { getInvoice, updateInvoice } from "../api/invoices.api.js";
import InvoiceForm from "../components/InvoiceForm.jsx";

export default function InvoiceEdit() {
    const { id } = useParams();
    const nav = useNavigate();
    const [customers, setCustomers] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [initialData, setInitialData] = React.useState(null);
    const [err, setErr] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);

    // Load customers, products, and invoice detail
    React.useEffect(() => {
        Promise.all([listCustomers(), listProducts(), getInvoice(id)])
            .then(([cs, ps, inv]) => {
                setCustomers(cs);
                setProducts(ps);
                // inv returns { header: {...}, line_items: [...] }
                // We need to flatten it for InvoiceForm which expects like { invoice_no, customer_id, ... line_items }
                // Actually InvoiceForm initialData expects { invoice_no, customer_id, invoice_date, vat_rate, line_items }
                // inv.header has invoice_no, customer_id, invoice_date, vat (calculated), vat_rate? 
                // Let's check getInvoice response in InvoiceView. Only 'vat' amount is stored. 'vat_rate' isn't stored in invoice table?
                // Schema check: invoice table has total_amount, vat, amount_due. NO vat_rate column.
                // Wait, if vat_rate is not stored, how do I edit it?
                // I guess I have to infer it or default to 0.07. 
                // vat = total * rate => rate = vat / total.
                // If total is 0, rate is default.
                const h = inv.header;
                const total = Number(h.total_amount);
                const vat =  Math.round(Number(h.vat) * 100) / 100;
                const rate = total > 0 ? (vat / total) : 0.07;

                setInitialData({
                    invoice_no: h.invoice_no,
                    customer_id: h.customer_id,
                    invoice_date: h.invoice_date,
                    vat_rate: rate,
                    line_items: inv.line_items
                });
            })
            .catch((e) => setErr(String(e.message || e)));
    }, [id]);

    // Submit updates then go back to detail view
    async function onSubmit(payload) {
        setErr("");
        setSubmitting(true);
        try {
            await updateInvoice(id, payload);
            nav(`/invoices/${id}`);
        } catch (e) {
            setErr(String(e.message || e));
        } finally {
            setSubmitting(false);
        }
    }

    if (!initialData && !err) return <div>Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">Edit Invoice {id}</h3>
                <Link to="/invoices" className="btn btn-outline">
                    Back
                </Link>
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <InvoiceForm
                customers={customers}
                products={products}
                onSubmit={onSubmit}
                submitting={submitting}
                initialData={initialData}
            />
        </div>
    );
}
