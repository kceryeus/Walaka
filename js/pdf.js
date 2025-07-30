// --- New pdf.js file for robust PDF generation ---

function generatePDF(data) {
    const pdfOptions = {
        margin: 0,
        filename: `Invoice-${data.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            logging: false,
            willReadFrequently: true,
            removeContainer: true,
            foreignObjectRendering: false
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
        }
    };
    
    // Create a temporary container for PDF generation
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    
    try {
        container.innerHTML = generateInvoiceHTML(data);
        return html2pdf()
            .from(container)
            .set(pdfOptions)
            .save()
            .then(() => {
                document.body.removeChild(container);
                return new Promise(resolve => setTimeout(() => resolve(), 100));
            })
            .catch(err => {
                console.error('PDF generation error:', err);
                document.body.removeChild(container);
                throw err;
            });
    } catch (err) {
        document.body.removeChild(container);
        throw err;
    }
}

// --- End of pdf.js ---