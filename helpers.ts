export const getYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const printService = (elementId: string, command?: string, receiptWidth?: '58mm' | '80mm') => {
    const printElement = document.getElementById(elementId);
    if (!printElement && command) {
        // This handles the case for only opening the drawer where no visible element is needed.
    } else if (!printElement) {
        console.error(`Print Error: Element with ID #${elementId} not found.`);
        return;
    }

    const contentToPrint = printElement ? printElement.innerHTML : '';
    const commandElement = command ? `<div class="cash-drawer-kick-command">${command}</div>` : '';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        console.error('Print Error: Could not access iframe document.');
        document.body.removeChild(iframe);
        return;
    }

    const printElementClassName = printElement ? printElement.className : '';
    const printElementStyle = printElement ? printElement.getAttribute('style') || '' : '';

    doc.open();
    doc.write(`
        <html>
            <head>
                <title>Print</title>
                <link rel="stylesheet" href="index.css">
                <style>
                    @page { margin: 5mm; }
                    body { background: #fff !important; margin: 0; -webkit-print-color-adjust: exact; color-adjust: exact; }
                    #printable-receipt {
                        position: absolute; left: 0; top: 0; margin: 0; padding: 0; box-shadow: none; font-size: 9pt; width: 100%;
                    }
                    ${receiptWidth === '58mm' ? `body { width: 58mm !important; }` : ''}
                    ${receiptWidth === '80mm' ? `body { width: 80mm !important; }` : ''}
                </style>
            </head>
            <body>
                ${printElement ? `<div id="printable-receipt" class="${printElementClassName}" style="${printElementStyle}">${contentToPrint}</div>` : ''}
                ${commandElement}
            </body>
        </html>
    `);
    doc.close();
    
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500); 
};
