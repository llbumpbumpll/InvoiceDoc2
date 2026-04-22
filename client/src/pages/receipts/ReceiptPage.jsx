// Receipt page (View, Create & Edit)
// - /receipts/new          → mode="create"
// - /receipts/:id          → mode="view"
// - /receipts/:id/edit     → mode="edit"
import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { getReceipt, createReceipt, updateReceipt } from "../../api/receipts.api.js";
import { toast } from "react-toastify";
import { formatBaht, formatDate } from "../../utils.js";
import ReceiptForm from "../../components/ReceiptForm.jsx";
import Loading from "../../components/Loading.jsx";

const METHOD_LABEL = {
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    check: "Check",
};

export default function ReceiptPage({ mode: propMode }) {
    const { id } = useParams();
    const mode = propMode || (id ? "view" : "create");
    const nav = useNavigate();

    const [receiptData, setReceiptData] = React.useState(null);
    const [initialData, setInitialData] = React.useState(null);
    const [err, setErr] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (mode === "create") {
            setLoading(false);
            return;
        }
        getReceipt(id)
            .then((data) => {
                setReceiptData(data);
                if (mode === "edit") {
                    const h = data.header;
                    setInitialData({
                        receipt_no: h.receipt_no,
                        receipt_date: h.receipt_date,
                        customer_code: h.customer_code,
                        payment_method: h.payment_method,
                        payment_notes: h.payment_notes,
                        line_items: data.line_items,
                    });
                }
                setLoading(false);
            })
            .catch((e) => {
                setErr(String(e.message || e));
                setLoading(false);
            });
    }, [id, mode]);

    async function onSubmit(payload) {
        setErr("");
        setSubmitting(true);
        try {
            if (mode === "create") {
                const res = await createReceipt(payload);
                toast.success("Receipt created.");
                nav(`/receipts/${encodeURIComponent(res.receipt_no)}`);
            } else {
                await updateReceipt(id, payload);
                toast.success("Receipt updated.");
                nav(`/receipts/${encodeURIComponent(id)}`);
            }
        } catch (e) {
            const msg = String(e.message || e);
            setErr(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    const handlePrint = () => window.print();

    if (loading) return <Loading size="large" />;

    const isView = mode === "view";
    const isCreate = mode === "create";

    // View mode — printable preview
    if (isView && receiptData) {
        const h = receiptData.header;
        const lines = receiptData.line_items || [];

        return (
            <div className="invoice-preview">
                <div className="page-header no-print">
                    <h3 className="page-title">Receipt {h.receipt_no}</h3>
                    <div className="flex gap-4">
                        <Link to="/receipts" className="btn btn-outline">← Back</Link>
                        <Link to={`/receipts/${id}/edit`} className="btn btn-outline">Edit</Link>
                        <button onClick={handlePrint} className="btn btn-primary">
                            <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
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
                            <div><span className="font-bold">Payment Method:</span> {METHOD_LABEL[h.payment_method] || h.payment_method}</div>
                            {h.payment_notes && <div><span className="font-bold">Notes:</span> {h.payment_notes}</div>}
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th className="text-right">Full Amount Due</th>
                                    <th className="text-right">Amount Already Received</th>
                                    <th className="text-right">Amount Remaining</th>
                                    <th className="text-right">Amount Received Here</th>
                                    <th className="text-right">Amount Still Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((li) => (
                                    <tr key={li.id}>
                                        <td className="font-bold">{li.invoice_no}</td>
                                        <td className="text-right">{formatBaht(li.amount_due)}</td>
                                        <td className="text-right" style={{ color: "var(--text-muted)" }}>{formatBaht(li.amount_already_received)}</td>
                                        <td className="text-right">{formatBaht(li.amount_remaining)}</td>
                                        <td className="text-right font-bold" style={{ color: "var(--primary)" }}>{formatBaht(li.amount_received_here)}</td>
                                        <td className="text-right">{formatBaht(li.amount_still_remaining)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex justify-between">
                        <div className="no-print text-muted" style={{ maxWidth: 300, fontSize: "0.8rem" }}>
                            Thank you for your payment.
                        </div>
                        <div style={{ minWidth: 240 }}>
                            <div className="flex justify-between mt-4 p-2 bg-body font-bold" style={{ fontSize: "1.15rem" }}>
                                <span>Total Received:</span>
                                <span>{formatBaht(h.total_received)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Create / Edit mode — form
    const title = isCreate ? "Create Receipt" : `Edit Receipt ${id}`;

    return (
        <div className="invoice-page">
            <div className="page-header">
                <h3 className="page-title">{title}</h3>
                <Link to="/receipts" className="btn btn-outline">
                    <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                </Link>
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <ReceiptForm
                onSubmit={onSubmit}
                submitting={submitting}
                initialData={isCreate ? null : initialData}
                receiptId={receiptData?.header?.id}
            />
        </div>
    );
}
