export function exportToCSV<T>(
  data: T[],
  columns: { key: keyof T | string; label: string }[],
  filename: string
) {
  if (!data || data.length === 0) {
    return;
  }

  // Generate header row
  const header = columns.map((col) => `"${String(col.label).replace(/"/g, '""')}"`).join(',');

  // Generate data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = item[col.key as keyof T];
        let stringValue = value === null || value === undefined ? '' : String(value);
        
        // Prevent Excel from converting long numbers (like barcodes) to scientific notation
        if (/^\d{11,}$/.test(stringValue)) {
          return `"=""${stringValue}"""`; // Excel formula: ="123456789012"
        }
        
        return `"${stringValue.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  const csvContent = [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          return resolve([]);
        }

        // Split by newlines, handling both \r\n and \n
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
        
        if (lines.length < 2) {
          return resolve([]); // Empty or just headers
        }

        // Simple CSV parser for headers
        const headers = parseCSVLine(lines[0]);
        
        const result: Record<string, string>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const currentLine = parseCSVLine(lines[i]);
          
          if (currentLine.length === headers.length || currentLine.length > 0) {
            const obj: Record<string, string> = {};
            for (let j = 0; j < headers.length; j++) {
              let val = currentLine[j]?.trim() || '';
              if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1).replace(/""/g, '"');
              }
              if (val.startsWith('="') && val.endsWith('"')) {
                val = val.substring(2, val.length - 1).replace(/""/g, '"');
              }
              obj[headers[j]?.trim()] = val;
            }
            result.push(obj);
          }
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };

    reader.readAsText(file);
  });
}

// Helper function to correctly parse a CSV line considering quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  result.push(currentVal);
  return result;
}
