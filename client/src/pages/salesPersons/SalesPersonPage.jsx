import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { getSalesPerson, createSalesPerson, updateSalesPerson } from "../../api/salesPersons.api.js";

export default function SalesPersonPage({ mode: propMode }) {
  const { code } = useParams();
  const mode = propMode || (code ? "view" : "create");
  const nav = useNavigate();

  const [form, setForm] = React.useState({ code: "", name: "", start_work_date: "" });
  const [err, setErr] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [loading, setLoading] = React.useState(mode !== "create");

  React.useEffect(() => {
    if (mode === "create") return;
    getSalesPerson(code)
      .then((sp) => {
        if (sp) setForm({ code: sp.code, name: sp.name, start_work_date: sp.start_work_date?.slice(0, 10) || "" });
        else setErr("Sales person not found");
        setLoading(false);
      })
      .catch((e) => { setErr(String(e.message || e)); setLoading(false); });
  }, [code, mode]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setSubmitting(true);
    try {
      const payload = { code: form.code.trim(), name: form.name.trim(), start_work_date: form.start_work_date || null };
      if (mode === "create") {
        await createSalesPerson(payload);
      } else {
        await updateSalesPerson(code, { name: payload.name, start_work_date: payload.start_work_date });
      }
      nav("/sales-persons");
    } catch (e) { setErr(String(e.message || e)); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">{ mode === "create" ? "Create Sales Person" : "Edit Sales Person" }</h3>
        <Link to="/sales-persons" className="btn btn-outline">← Back</Link>
      </div>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Code <span className="required-marker">*</span></label>
            <input className="form-control" name="code" value={form.code}
              onChange={handleChange} disabled={mode !== "create"}
              placeholder="SP001" />
          </div>
          <div className="form-group">
            <label className="form-label">Name <span className="required-marker">*</span></label>
            <input className="form-control" name="name" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" className="form-control" name="start_work_date"
              value={form.start_work_date} onChange={handleChange} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving..." : (mode === "create" ? "Create" : "Update")}
          </button>
        </form>
      </div>
    </div>
  );
}
