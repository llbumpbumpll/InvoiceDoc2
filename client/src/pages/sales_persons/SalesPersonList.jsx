// Sales Person list: click Delete → show confirm modal → call delete API → refresh table via refreshTrigger
import React from "react";
import { toast } from "react-toastify";
import { listSalesPersons, deleteSalesPerson } from "../../api/salesPersons.api.js";
import { formatDate } from "../../utils.js";
import DataList from "../../components/DataList.jsx";
import { ConfirmModal, AlertModal } from "../../components/Modal.jsx";

export default function SalesPersonList() {
    const fetchData = React.useCallback((params) => listSalesPersons(params), []);
    const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, id: null });
    const [alertModal, setAlertModal] = React.useState({ isOpen: false, message: "" });
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);

    const closeConfirm = () => setConfirmModal({ isOpen: false, id: null });

    const handleDelete = (id) => {
        setConfirmModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        try {
            await deleteSalesPerson(confirmModal.id);
            closeConfirm();
            setRefreshTrigger((t) => t + 1);
            toast.success("Sales person deleted.");
        } catch (e) {
            const msg = String(e.message || e);
            toast.error(msg);
            setAlertModal({ isOpen: true, message: "Error: " + msg });
            closeConfirm();
        }
    };

    // Lab 3 spec: display code, name, start_work_date (id field is not shown)
    const columns = [
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        {
            key: "start_work_date",
            label: "Start Work Date",
            render: (v) => v ? formatDate(v) : "-"
        },
    ];

    return (
        <>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmDelete}
                closeOnConfirm={false}
                title="Delete Sales Person"
                message="Are you sure you want to delete this sales person?"
                confirmText="Delete"
            />
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ isOpen: false, message: "" })}
                title="Error"
                message={alertModal.message}
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
