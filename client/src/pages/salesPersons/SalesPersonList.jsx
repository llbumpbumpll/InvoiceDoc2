import React from "react";
import { toast } from "react-toastify";
import { listSalesPersons, deleteSalesPerson } from "../../api/salesPersons.api.js";
import DataList from "../../components/DataList.jsx";
import { ConfirmModal } from "../../components/Modal.jsx";

export default function SalesPersonList() {
  const fetchData = React.useCallback((params) => listSalesPersons(params), []);
  const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, code: null });
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleDelete = (code) => setConfirmModal({ isOpen: true, code });
  const closeConfirm = () => setConfirmModal({ isOpen: false, code: null });

  const confirmDelete = async () => {
    try {
      await deleteSalesPerson(confirmModal.code);
      closeConfirm();
      setRefreshTrigger((t) => t + 1);
      toast.success("Sales person deleted.");
    } catch (e) {
      toast.error(String(e.message || e));
      closeConfirm();
    }
  };

  const columns = [
    { key: "code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "start_work_date", label: "Start Date", render: (v) => v ? v.slice(0, 10) : "-" },
  ];

  return (
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDelete}
        title="Delete Sales Person"
        message={`Are you sure you want to delete sales person "${confirmModal.code}"?`}
      />
      <DataList
        title="Sales Persons"
        fetchData={fetchData}
        columns={columns}
        searchPlaceholder="Search code, name..."
        itemName="sales persons"
        basePath="/sales-persons"
        itemKey="code"
        onDelete={handleDelete}
        refreshTrigger={refreshTrigger}
      />
    </>
  );
}
