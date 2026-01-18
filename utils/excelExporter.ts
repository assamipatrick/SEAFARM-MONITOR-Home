declare const ExcelJS: any;

// Helper to convert RGB string to ARGB for ExcelJS
const rgbToArgb = (rgb: string): string | undefined => {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent' || rgb === 'inherit') return undefined;
    
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return undefined;
    
    const [r, g, b] = match.map(Number);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `FF${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// Robust parser for numbers
function parseValue(text: string): string | number {
    if (!text) return '';
    const trimmed = text.trim();
    if (!trimmed) return '';

    // Check for specific date formats to prevent them from being parsed as math expressions or numbers
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed; // ISO Date

    // Check if it's a pure percentage
    if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
        return parseFloat(trimmed) / 100;
    }

    // Clean common currency symbols and spaces
    const clean = trimmed.replace(/^[^\d\-\.,]+/, '').replace(/[^\d]+$/, '').replace(/\s/g, '');

    if (!clean) return trimmed;
    
    let num: number | undefined;
    
    // Standard: 1234.56
    if (/^-?\d+(\.\d+)?$/.test(clean)) {
        num = parseFloat(clean);
    }
    // European: 1234,56
    else if (/^-?\d+(,\d+)?$/.test(clean)) {
        num = parseFloat(clean.replace(',', '.'));
    }
    // Mixed separators: 1,234.56 or 1.234,56
    else {
        const noCommas = clean.replace(/,/g, '');
        if (!isNaN(Number(noCommas)) && noCommas.includes('.')) {
             num = parseFloat(noCommas);
        } else {
             const eurStyle = clean.replace(/\./g, '').replace(',', '.');
             if (!isNaN(Number(eurStyle))) {
                 num = parseFloat(eurStyle);
             }
        }
    }

    if (num !== undefined && !isNaN(num)) {
        return num;
    }

    return trimmed;
}

const getSafeText = (el: Element): string => {
    return (el as HTMLElement).innerText?.trim() || '';
};

function extractExportNodes(root: HTMLElement): HTMLElement[] {
    const results: HTMLElement[] = [];
    
    if (root.classList.contains('no-print') || root.style.display === 'none') return [];
    if (root.tagName === 'HEADER') return [];
    if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE' || root.tagName === 'BUTTON') return [];

    if (root.tagName === 'TABLE' || root.classList.contains('grid') || root.classList.contains('prose') || /^H[1-6]$/.test(root.tagName)) {
        return [root];
    }

    const children = Array.from(root.children) as HTMLElement[];
    if (children.length > 0) {
        for (const child of children) {
            results.push(...extractExportNodes(child));
        }
    } else {
        const text = root.innerText?.trim();
        if (text && (root.tagName === 'P' || root.tagName === 'DIV' || root.tagName === 'SPAN') && text.length > 1) {
             results.push(root);
        }
    }

    return results;
}

function isCellMerged(sheet: any, row: number, col: number): boolean {
    const cell = sheet.getCell(row, col);
    return cell.isMerged && (cell.master.address !== cell.address);
}

function processTable(sheet: any, table: HTMLTableElement, startRow: number): number {
    let currentRow = startRow;

    const sections = [
        table.querySelector('thead'),
        table.querySelector('tbody'),
        table.querySelector('tfoot')
    ];

    sections.forEach(section => {
        if (!section) return;
        
        const rows = Array.from(section.querySelectorAll('tr'));
        rows.forEach(tr => {
            let currentCol = 1;
            const cells = Array.from(tr.querySelectorAll('th, td'));
            
            cells.forEach((cell) => {
                const el = cell as HTMLElement;
                const text = getSafeText(el);
                const colSpan = parseInt(el.getAttribute('colspan') || '1');
                const rowSpan = parseInt(el.getAttribute('rowspan') || '1');
                
                while (isCellMerged(sheet, currentRow, currentCol)) {
                    currentCol++;
                }

                const excelCell = sheet.getCell(currentRow, currentCol);
                
                let value: string | number = text;
                const isHeader = el.tagName === 'TH' || section.tagName === 'THEAD';
                if (!isHeader) {
                    value = parseValue(text);
                }
                
                excelCell.value = value;
                
                const computedStyle = window.getComputedStyle(el);
                const bgColor = rgbToArgb(computedStyle.backgroundColor);
                const color = rgbToArgb(computedStyle.color);
                const isBold = isHeader || computedStyle.fontWeight === '700' || computedStyle.fontWeight === 'bold';
                const align = computedStyle.textAlign as any;

                if (isHeader) {
                    excelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
                    excelCell.border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } };
                    excelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                } else {
                    excelCell.font = { color: { argb: color || 'FF000000' }, bold: isBold };
                    if (bgColor && bgColor !== 'FFFFFFFF') { 
                         excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                    }
                    excelCell.border = { top: { style: 'thin', color: { argb: 'FFD9D9D9' } }, left: { style: 'thin', color: { argb: 'FFD9D9D9' } }, bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } }, right: { style: 'thin', color: { argb: 'FFD9D9D9' } } };
                    let hAlign = align === 'center' ? 'center' : (align === 'right' ? 'right' : 'left');
                    if (typeof value === 'number' && align !== 'center') hAlign = 'right';
                    excelCell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
                }

                if (colSpan > 1 || rowSpan > 1) {
                    try {
                        sheet.mergeCells(currentRow, currentCol, currentRow + rowSpan - 1, currentCol + colSpan - 1);
                    } catch (e) {
                        console.warn('Merge conflict in Excel export', e);
                    }
                }
                
                currentCol += colSpan;
            });
            currentRow++;
        });
    });

    return currentRow;
}

function processGrid(sheet: any, grid: HTMLElement, startRow: number): number {
    const children = Array.from(grid.children) as HTMLElement[];
    let currentRow = startRow;

    if (children.length > 0 && children.length <= 4) {
        let col = 1;
        children.forEach(child => {
            const lines = getSafeText(child).split('\n').filter(l => l.trim());
            
            const cell = sheet.getCell(currentRow, col);
            cell.value = lines[0];
            cell.font = { color: { argb: 'FF7F7F7F' }, italic: true };
            
            const valueCell = sheet.getCell(currentRow + 1, col);
            valueCell.value = parseValue(lines[1] || '');
            valueCell.font = { bold: true, size: 12 };
            valueCell.alignment = { horizontal: 'left' };
            
            col += 3;
        });
        return currentRow + 3;
    }

    children.forEach(child => {
        const text = getSafeText(child);
        const cell = sheet.getCell(currentRow, 1);
        cell.value = text;
        cell.alignment = { wrapText: true };
        currentRow++;
    });

    return currentRow;
}

function processText(sheet: any, el: HTMLElement, startRow: number): number {
    const text = getSafeText(el);
    if (!text) return startRow;

    const cell = sheet.getCell(startRow, 1);
    cell.value = text;
    
    if (el.tagName === 'H3' || el.tagName === 'H4' || el.classList.contains('font-bold')) {
        cell.font = { bold: true, size: 11, color: { argb: 'FF4472C4' } };
    } else {
        cell.alignment = { wrapText: true };
    }
    
    sheet.mergeCells(startRow, 1, startRow, 12);
    
    return startRow + 1;
}

export const exportReportToExcel = async (reportTitle: string, fileName: string) => {
    const printableArea = document.getElementById('printable-area');
    if (!printableArea) {
        console.error("No printable area found");
        return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AlgaManage';
    workbook.created = new Date();

    const pages = printableArea.querySelectorAll('.report-page-landscape, .print-page');
    
    if (pages.length === 0) {
        alert('No report content found to export.');
        return;
    }

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        let sheetName = `Page ${i + 1}`;
        const titleEl = page.querySelector('h2') || page.querySelector('h3');
        if (titleEl) {
            const text = getSafeText(titleEl).replace(/[\\/?*:[\]]/g, ' ').substring(0, 30);
            if (text) sheetName = text;
        }
        
        let uniqueSheetName = sheetName;
        let counter = 1;
        while (workbook.getWorksheet(uniqueSheetName)) {
            uniqueSheetName = `${sheetName} (${counter++})`;
        }

        const sheet = workbook.addWorksheet(uniqueSheetName, {
            views: [{ showGridLines: false, zoomScale: 85 }],
            pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true }
        });

        sheet.columns = Array.from({ length: 50 }, () => ({ width: 14 }));
        sheet.getColumn(1).width = 20;

        let currentRow = 1;

        const headerEl = page.querySelector('header');
        if (headerEl) {
            const lines = getSafeText(headerEl).split('\n').filter(l => l.trim());
            lines.forEach(line => {
                const row = sheet.getRow(currentRow);
                const cell = row.getCell(1);
                cell.value = line;
                cell.font = { bold: true, size: 12, color: { argb: 'FF2F5597' } };
                sheet.mergeCells(currentRow, 1, currentRow, 12); 
                currentRow++;
            });
            currentRow++;
        }

        const contentWrapper = page.firstElementChild as HTMLElement;
        const rootForExtraction = contentWrapper || page;
        const exportableNodes = extractExportNodes(rootForExtraction);

        for (const node of exportableNodes) {
            if (node.tagName === 'TABLE') {
                currentRow = processTable(sheet, node as HTMLTableElement, currentRow);
                currentRow += 2;
            } else if (node.classList.contains('grid')) {
                currentRow = processGrid(sheet, node as HTMLElement, currentRow);
                currentRow += 2;
            } else {
                currentRow = processText(sheet, node as HTMLElement, currentRow);
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
};

export const exportDataToExcel = async (
    data: any[],
    columns: { header: string; key: string; width?: number }[],
    fileName: string,
    sheetName: string = 'Sheet1'
) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AlgaManage';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);

    sheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    
    data.forEach(item => {
        sheet.addRow(item);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
};

export const exportMultipleSheetsToExcel = async (
    sheetsData: {
        sheetName: string;
        columns: { header: string; key: string; width?: number }[];
        data: any[];
    }[],
    fileName: string
) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AlgaManage';
    workbook.created = new Date();

    sheetsData.forEach(sheetData => {
        const sheet = workbook.addWorksheet(sheetData.sheetName);

        sheet.columns = sheetData.columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15
        }));

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };

        sheetData.data.forEach(item => {
            sheet.addRow(item);
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
};
