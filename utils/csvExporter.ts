
function escapeCsvCell(cell: any): string {
    if (cell === null || cell === undefined) {
        return '';
    }
    const str = String(cell);
    // If the string contains a comma, double quote, or newline, wrap it in double quotes.
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape existing double quotes by doubling them.
        const escapedStr = str.replace(/"/g, '""');
        return `"${escapedStr}"`;
    }
    return str;
}

export function exportToCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
    if (!rows || rows.length === 0) {
        console.error("No data to export for CSV.");
        return;
    }
    
    const csvContent = rows.map(row => row.map(escapeCsvCell).join(',')).join('\n');
    
    // BOM for Excel to recognize UTF-8
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
