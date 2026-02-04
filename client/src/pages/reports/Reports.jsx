import React from "react";
import { http } from "../../api/http.js";
import { formatBaht, formatDate } from "../../utils.js";
import ReportFilters from "./filters/ReportFilters.jsx";
import PaginationFilter from "./filters/PaginationFilter.jsx";
import ReportTable from "../../components/ReportTable.jsx";

const REPORT_CONFIG = {
  "product-sales": {
    title: "Total Sales Performance",
    subtitle: "Revenue breakdown by product",
    endpoint: "/api/reports/product-sales",
    emptyMessage: "No sales records found.",
    getColumns: (filters) => {
      const hasDateFilter = filters?.dateFrom || filters?.dateTo;
      return [
        { key: "product_code", label: "Product", render: (_, row) => <><span className="font-bold">{row.product_code}</span> - {row.product_name}</> },
        ...(hasDateFilter ? [
          { 
            key: "date_range", 
            label: "Date Range", 
            render: (_, row, filterState) => {
              const dateFrom = filterState?.dateFrom || filters?.dateFrom;
              const dateTo = filterState?.dateTo || filters?.dateTo;
              if (dateFrom && dateTo) {
                return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
              } else if (dateFrom) {
                return `From ${formatDate(dateFrom)}`;
              } else if (dateTo) {
                return `Until ${formatDate(dateTo)}`;
              }
              return "-";
            }
          }
        ] : []),
        { key: "quantity_sold", label: "Quantity Sold", align: "right", render: (v) => Number(v || 0).toLocaleString() },
        { key: "value_sold", label: "Total Revenue", align: "right", style: { fontWeight: 600, color: "var(--primary)" }, render: (v) => formatBaht(v) }
      ];
    }
  },
  "monthly-sales": {
    title: "Monthly Product Sales",
    subtitle: "Sales trends over time",
    endpoint: "/api/reports/product-monthly-sales",
    emptyMessage: "No monthly records found.",
    getColumns: (filters) => [
      { key: "month", label: "Month/Year", render: (_, row) => `${new Date(0, row.month - 1).toLocaleString('default', { month: 'long' })} ${row.year}` },
      { key: "product_code", label: "Product", render: (_, row) => <><span className="font-bold">{row.product_code}</span> - {row.product_name}</> },
      { key: "quantity_sold", label: "Qty", align: "right", render: (v) => Number(v || 0).toLocaleString() },
      { key: "value_sold", label: "Value", align: "right", style: { fontWeight: 600, color: "var(--primary)" }, render: (v) => formatBaht(v) }
    ]
  },
  "customer-sales": {
    title: "Customer Buying Patterns",
    subtitle: "Product purchases by customer",
    endpoint: "/api/reports/customer-sales",
    emptyMessage: "No customer records found.",
    getColumns: (filters) => {
      const hasDateFilter = filters?.dateFrom || filters?.dateTo;
      return [
        { key: "product_code", label: "Product", render: (v) => <span className="font-bold">{v}</span> },
        { key: "customer_name", label: "Customer", render: (_, row) => `${row.customer_name} (${row.customer_code})` },
        ...(hasDateFilter ? [
          { 
            key: "date_range", 
            label: "Date Range", 
            render: (_, row, filterState) => {
              const dateFrom = filterState?.dateFrom || filters?.dateFrom;
              const dateTo = filterState?.dateTo || filters?.dateTo;
              if (dateFrom && dateTo) {
                return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
              } else if (dateFrom) {
                return `From ${formatDate(dateFrom)}`;
              } else if (dateTo) {
                return `Until ${formatDate(dateTo)}`;
              }
              return "-";
            }
          }
        ] : []),
        { key: "quantity_sold", label: "Qty", align: "right", render: (v) => Number(v || 0).toLocaleString() },
        { key: "value_sold", label: "Value", align: "right", style: { fontWeight: 600 }, render: (v) => formatBaht(v) }
      ];
    }
  }
};

export default function Reports({ type = "product-sales" }) {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [appliedFilters, setAppliedFilters] = React.useState({});
  const [hasApplied, setHasApplied] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(true);
  
  // Pagination state
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  const config = REPORT_CONFIG[type] || REPORT_CONFIG["product-sales"];

  const fetchData = React.useCallback((currentPage = page, currentLimit = limit) => {
    setLoading(true);
    setErr("");
    
    const params = new URLSearchParams();
    if (appliedFilters.productId) params.set("product_id", appliedFilters.productId);
    if (appliedFilters.customerId) params.set("customer_id", appliedFilters.customerId);
    if (appliedFilters.dateFrom) params.set("date_from", appliedFilters.dateFrom);
    if (appliedFilters.dateTo) params.set("date_to", appliedFilters.dateTo);
    if (appliedFilters.year) params.set("year", appliedFilters.year);
    if (appliedFilters.month) params.set("month", appliedFilters.month);
    params.set("page", currentPage);
    params.set("limit", currentLimit);
    
    const qs = params.toString();
    http(config.endpoint + (qs ? `?${qs}` : ""))
      .then(res => {
        setData(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 0);
        setPage(res.page || 1);
        setLoading(false);
      })
      .catch(e => { setErr(String(e.message || e)); setLoading(false); });
  }, [config.endpoint, appliedFilters, page, limit]);

  // Reset when changing report type
  React.useEffect(() => {
    setFilters({});
    setAppliedFilters({});
    setData([]);
    setHasApplied(false);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
  }, [type]);

  const handleApply = () => {
    setAppliedFilters({ ...filters });
    setHasApplied(true);
    setPage(1);
    fetchData(1, limit);
  };

  const handleReset = () => {
    setFilters({});
    setAppliedFilters({});
    setData([]);
    setHasApplied(false);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
  };

  const handlePaginationChange = (changes) => {
    const newPage = changes.page ?? page;
    const newLimit = changes.limit ?? limit;
    setPage(newPage);
    setLimit(newLimit);
    fetchData(newPage, newLimit);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 className="page-title">{config.title}</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{config.subtitle}</p>
        </div>
        <button 
          className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filters {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {showFilters && (
        <div className="card" style={{ marginBottom: 24 }}>
          <ReportFilters
            type={type}
            filters={filters}
            onChange={setFilters}
            onApply={handleApply}
            onReset={handleReset}
          />
        </div>
      )}

      <div className="card">
        {!hasApplied ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>Select your filters</h4>
            <p>Choose filter options above and click "Apply Filters" to generate the report.</p>
          </div>
        ) : (
          <>
            <div className="report-header">
              <div className="report-stats">
                <span className="stat-item">
                  <strong>{total}</strong> total records
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => fetchData()} disabled={loading}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center p-4">Loading...</div>
            ) : (
              <>
                <div className="table-container">
                  <ReportTable 
                    columns={config.getColumns ? config.getColumns(appliedFilters) : config.columns} 
                    data={data} 
                    emptyMessage={config.emptyMessage}
                    filters={appliedFilters}
                  />
                </div>
                
                {total > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <PaginationFilter
                      page={page}
                      limit={limit}
                      total={total}
                      totalPages={totalPages}
                      onChange={handlePaginationChange}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
