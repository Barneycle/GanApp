import * as XLSX from 'xlsx';

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Flatten nested objects for CSV
  const flattenedData = data.map(item => {
    const flat: any = {};
    Object.keys(item).forEach(key => {
      if (key === 'users' && item[key]) {
        // Flatten user object
        flat['First Name'] = item[key].first_name || '';
        flat['Last Name'] = item[key].last_name || '';
        flat['Email'] = item[key].email || '';
        flat['Organization'] = item[key].organization || '';
        flat['User Type'] = item[key].user_type || '';
        flat['Role'] = item[key].role || '';
      } else if (typeof item[key] === 'object' && item[key] !== null) {
        // Skip nested objects that aren't users
        flat[key] = JSON.stringify(item[key]);
      } else {
        // Map common fields to readable names
        const fieldMap: { [key: string]: string } = {
          id: 'Registration ID',
          user_id: 'User ID',
          registration_date: 'Registration Date',
          status: 'Status',
          created_at: 'Created At',
        };
        flat[fieldMap[key] || key] = item[key] || '';
      }
    });
    return flat;
  });

  const headers = Object.keys(flattenedData[0]).join(',');
  const rows = flattenedData.map(row =>
    Object.values(row)
      .map(val => {
        const str = String(val || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Flatten nested objects for Excel
  const flattenedData = data.map(item => {
    const flat: any = {};
    Object.keys(item).forEach(key => {
      if (key === 'users' && item[key]) {
        // Flatten user object
        flat['First Name'] = item[key].first_name || '';
        flat['Last Name'] = item[key].last_name || '';
        flat['Email'] = item[key].email || '';
        flat['Organization'] = item[key].organization || '';
        flat['User Type'] = item[key].user_type || '';
        flat['Role'] = item[key].role || '';
      } else if (typeof item[key] === 'object' && item[key] !== null) {
        // Skip nested objects that aren't users
        flat[key] = JSON.stringify(item[key]);
      } else {
        // Map common fields to readable names
        const fieldMap: { [key: string]: string } = {
          id: 'Registration ID',
          user_id: 'User ID',
          registration_date: 'Registration Date',
          status: 'Status',
          created_at: 'Created At',
        };
        flat[fieldMap[key] || key] = item[key] || '';
      }
    });
    return flat;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-size columns
  const maxWidth = 50;
  const wscols = Object.keys(flattenedData[0]).map(key => ({
    wch: Math.min(
      Math.max(
        key.length,
        ...flattenedData.map(row => String(row[key] || '').length)
      ),
      maxWidth
    )
  }));
  worksheet['!cols'] = wscols;

  // Write file
  const excelFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, excelFilename);
}

