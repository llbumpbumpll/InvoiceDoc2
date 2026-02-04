// Invoice list page
import React from "react";
import { listInvoices, deleteInvoice } from "../../api/invoices.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import DataList from "../../components/DataList.jsx";
import { ConfirmModal, AlertModal } from "../../components/Modal.jsx";

export default function InvoiceList() {
    const fetchData = React.useCallback((params) => listInvoices(params), []);
    const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, id: null });
    const [alertModal, setAlertModal] = React.useState({ isOpen: false, message: "" });

    const handleDelete = async (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        try {
            await deleteInvoice(confirmModal.id);
            setConfirmModal({ isOpen: false, id: null });
        } catch (e) {
            setAlertModal({ isOpen: true, message: "Error: " + String(e.message || e) });
            setConfirmModal({ isOpen: false, id: null });
        }
    };

    const columns = [
        { key: "invoice_no", label: "Invoice No" },
        { key: "customer_name", label: "Customer" },
        { key: "invoice_date", label: "Date", render: v => formatDate(v) },
        { key: "amount_due", label: "Amount Due", align: "right", render: v => <span className="font-bold">{formatBaht(v)}</span> }
    ];

    return (
        <>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Delete Invoice"
                message="Are you sure you want to delete this invoice?"
                confirmText="Delete"
            />
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ isOpen: false, message: "" })}
                title="Error"
                message={alertModal.message}
            />
            <DataList
                title="Invoices"
                fetchData={fetchData}
                columns={columns}
                searchPlaceholder="Search invoice no, customer..."
                itemName="invoices"
                basePath="/invoices"
                onDelete={handleDelete}
            />
        </>
    );
}
