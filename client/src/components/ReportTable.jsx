import React from "react";

export default function ReportTable({ columns, data, emptyMessage = "No data found.", filters }) {
  return (
    <table className="modern-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} className={col.align === "right" ? "text-right" : ""}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {columns.map(col => (
              <td key={col.key} className={col.align === "right" ? "text-right" : ""} style={col.style}>
                {col.render ? col.render(row[col.key], row, filters) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
        {data.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="text-center p-4" style={{ color: "var(--text-muted)" }}>
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
