import Papa from 'papaparse';

// オブジェクト配列用
export function downloadCsv(filename: string, rows: object[]): void;
// 2次元配列用
export function downloadCsv(
  filename: string,
  rows: Array<Array<string | number | boolean | null>>
): void;
export function downloadCsv(filename: string, rows: unknown): void {
  const csv = Papa.unparse(rows as never);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


