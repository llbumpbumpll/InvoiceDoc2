// Line items table editor (ตารางรายการสินค้าในใบแจ้งหนี้)
// Example usage: <LineItemsEditor products={products} value={items} onChange={setItems} />
import React from "react";

export default function LineItemsEditor({ products, value, onChange }) {
  const items = value;

  // Update one row by index
  function update(i, patch) {
    const next = items.map((x, idx) => (idx === i ? { ...x, ...patch } : x));
    onChange(next);
  }

  // Add a new row with default product/price
  function addRow() {
    const first = products[0];
    onChange([
      ...items,
      { product_id: first ? first.id : "", quantity: 1, unit_price: first ? Number(first.unit_price || 0) : 0 },
    ]);
  }

  // Remove a row by index
  function removeRow(i) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  // When selecting a product, sync unit price
  function onPickProduct(i, productId) {
    const p = products.find((x) => String(x.id) === String(productId));
    update(i, { product_id: p ? p.id : "", unit_price: p ? Number(p.unit_price || 0) : 0 });
  }

  // Compute extended price (qty * unit price)
  function computeExtended(it) {
    const q = Number(it.quantity || 0);
    const up = Number(it.unit_price || 0);
    return q * up;
  }

  const total = items.reduce((s, it) => s + computeExtended(it), 0);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>Line Items</b>
        <button type="button" onClick={addRow} disabled={products.length === 0}>
          + Add item
        </button>
      </div>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left" style={{ borderBottom: "1px solid #ddd" }}>Product</th>
              <th align="right" style={{ borderBottom: "1px solid #ddd" }}>Qty</th>
              <th align="right" style={{ borderBottom: "1px solid #ddd" }}>Unit Price</th>
              <th align="right" style={{ borderBottom: "1px solid #ddd" }}>Extended</th>
              <th style={{ borderBottom: "1px solid #ddd" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <select
                    value={it.product_id}
                    onChange={(e) => onPickProduct(i, e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="" disabled>Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.units_code})
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ borderBottom: "1px solid #f0f0f0" }} align="right">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={it.quantity}
                    onChange={(e) => update(i, { quantity: e.target.value })}
                    style={{ width: 120, textAlign: "right" }}
                  />
                </td>
                <td style={{ borderBottom: "1px solid #f0f0f0" }} align="right">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={true}
                    value={it.unit_price}
                    onChange={(e) => update(i, { unit_price: e.target.value })}
                    style={{ width: 120, textAlign: "right" }}
                  />
                </td>
                <td style={{ borderBottom: "1px solid #f0f0f0" }} align="right">
                  {computeExtended(it).toFixed(2)}
                </td>
                <td style={{ borderBottom: "1px solid #f0f0f0" }} align="right">
                  <button type="button" onClick={() => removeRow(i)} disabled={items.length <= 1}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan="5" style={{ padding: 12 }}>No items.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" align="right" style={{ paddingTop: 10 }}><b>Subtotal</b></td>
              <td align="right" style={{ paddingTop: 10 }}><b>{total.toFixed(2)}</b></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
