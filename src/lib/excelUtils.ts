import ExcelJS from 'exceljs';

/**
 * Read an Excel file from ArrayBuffer and return rows as array of objects (like sheet_to_json)
 */
export async function readExcelFile(buffer: ArrayBuffer): Promise<Record<string, any>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, colNum) => {
    headers[colNum] = String(cell.value ?? '');
  });

  const rows: Record<string, any>[] = [];
  for (let i = 2; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);
    const obj: Record<string, any> = {};
    let hasData = false;
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const key = headers[colNum];
      if (key) {
        obj[key] = cell.value;
        hasData = true;
      }
    });
    if (hasData) rows.push(obj);
  }
  return rows;
}

/**
 * Create and download an Excel file from array-of-arrays (header + data rows)
 */
export async function writeExcelFromAoa(fileName: string, sheetName: string, data: any[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  data.forEach(row => sheet.addRow(row));
  const buf = await workbook.xlsx.writeBuffer();
  downloadBuffer(buf, fileName);
}

/**
 * Create and download an Excel file from array of objects (json_to_sheet equivalent)
 */
export async function writeExcelFromJson(fileName: string, sheetName: string, jsonData: Record<string, any>[]) {
  if (jsonData.length === 0) return;
  const headers = Object.keys(jsonData[0]);
  const rows = [headers, ...jsonData.map(obj => headers.map(h => obj[h] ?? ''))];
  await writeExcelFromAoa(fileName, sheetName, rows);
}

/**
 * Create and download an Excel file with multiple sheets from JSON data
 */
export async function writeExcelMultiSheet(fileName: string, sheets: { name: string; data: Record<string, any>[] }[]) {
  const workbook = new ExcelJS.Workbook();
  for (const s of sheets) {
    if (s.data.length === 0) continue;
    const sheet = workbook.addWorksheet(s.name);
    const headers = Object.keys(s.data[0]);
    sheet.addRow(headers);
    s.data.forEach(obj => sheet.addRow(headers.map(h => obj[h] ?? '')));
  }
  const buf = await workbook.xlsx.writeBuffer();
  downloadBuffer(buf, fileName);
}

function downloadBuffer(buf: ExcelJS.Buffer, fileName: string) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
