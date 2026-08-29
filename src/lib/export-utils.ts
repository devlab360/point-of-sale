/**
 * Generic CSV Exporter for tabular datasets
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header];
          if (val === null || val === undefined) {
            val = "";
          } else if (typeof val === "object") {
            val = JSON.stringify(val);
          } else {
            val = String(val);
          }
          // Escape quotes
          val = val.replace(/"/g, '""');
          // If comma or newline or quotes in value, wrap in quotes
          if (val.includes(",") || val.includes("\n") || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        })
        .join(","),
    ),
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
