// FILE: client/src/pages/receipts/ReceiptList.jsx
import React from "react";
import { toast } from "react-toastify";
import { listReceipts, deleteReceipt } from "../../api/receipts.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import DataList from "../../components/DataList.jsx";
import { ConfirmModal, AlertModal } from "../../components/Modal.jsx";

export default function ReceiptList() {
  const fetchData = React.useCallback((params) => listReceipts(params), []);
  const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, id: null });
  const [alertModal, setAlertModal] = React.useState({ isOpen: false, message: "" });
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const closeConfirm = () => setConfirmModal({ isOpen: false, id: null });

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await deleteReceipt(confirmModal.id);
      closeConfirm();
      setRefreshTrigger((t) => t + 1);
      toast.success("Receipt deleted.");
    } catch (e) {
      const msg = String(e.message || e);
      toast.error(msg);
      setAlertModal({ isOpen: true, message: "Error: " + msg });
      closeConfirm();
    }
  };

  const columns = [
    { key: "receipt_no", label: "Receipt No" },
    { key: "receipt_date", label: "Date", render: (v) => formatDate(v) },
    { key: "customer_code", label: "Customer Code" },
    { key: "customer_name", label: "Customer Name" },
    { key: "payment_method", label: "Payment Method" },
    {
      key: "total_received",
      label: "Total Received",
      align: "right",
      render: (v) => <span className="font-bold">{formatBaht(v)}</span>,
    },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDelete}
        closeOnConfirm={false}
        title="Delete Receipt"
        message="Are you sure you want to delete this receipt? This will remove all payment records associated with it."
        confirmText="Delete"
      />
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
        title="Error"
        message={alertModal.message}
      />
      <DataList
        refreshTrigger={refreshTrigger}
        title="Receipts"
        fetchData={fetchData}
        columns={columns}
        searchPlaceholder="Search receipt no, customer..."
        itemName="receipts"
        basePath="/receipts"
        itemKey="receipt_no"
        onDelete={handleDelete}
      />
    </>
  );
}
