import { notify } from '../components/Toast';

function flattenExportRows(data: any[]) {
  return data.map((item) => {
    const flat: any = {};
    Object.keys(item).forEach((key) => {
      if (key === 'users' && item[key]) {
        flat['First Name'] = item[key].first_name || '';
        flat['Last Name'] = item[key].last_name || '';
        flat['Email'] = item[key].email || '';
        flat['Organization'] = item[key].organization || '';
        flat['User Type'] = item[key].user_type || '';
        flat['Role'] = item[key].role || '';
      } else if (typeof item[key] === 'object' && item[key] !== null) {
        flat[key] = JSON.stringify(item[key]);
      } else {
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
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    notify('warning', 'No data to export');
    return;
  }

  const flattenedData = flattenExportRows(data);
  const headers = Object.keys(flattenedData[0]).join(',');
  const rows = flattenedData.map((row) =>
    Object.values(row)
      .map((val) => {
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
    notify('warning', 'No data to export');
    return;
  }

  const flattenedData = flattenExportRows(data);
  const headers = Object.keys(flattenedData[0]);
  const maxWidth = 50;
  const excelFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  void import('exceljs').then(({ default: ExcelJS }) => {
    const workbook = new ExcelJS.Workbook();
    const safeSheetName = (sheetName || 'Sheet1').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeSheetName);
    worksheet.columns = headers.map((key) => ({
      header: key,
      key,
      width: Math.min(
        Math.max(
          key.length,
          ...flattenedData.map((row) => String(row[key] || '').length)
        ),
        maxWidth
      ),
    }));
    flattenedData.forEach((row) => worksheet.addRow(row));
    return workbook.xlsx.writeBuffer();
  }).then((buffer) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = excelFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }).catch((err) => {
    console.error('Failed to export Excel file:', err);
    notify('error', 'Failed to export Excel file');
  });
}
