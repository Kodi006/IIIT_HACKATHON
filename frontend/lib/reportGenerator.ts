// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { AnalysisResponse } from './api';

export const generateClinicalReport = (data: AnalysisResponse) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('NeuroMed Clinical Report', 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 25, { align: 'right' });

    // --- Disclaimer ---
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('CONFIDENTIAL - FOR CLINICAL DECISION SUPPORT ONLY', 14, 48);
    doc.text('This report is AI-generated and must be verified by a licensed healthcare professional.', 14, 52);

    let yPos = 65;

    // --- SOAP Note Section ---
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('SOAP Summary', 14, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);

    // Split text to fit page
    const soapLines = doc.splitTextToSize(data.soap || 'No SOAP note available.', pageWidth - 28);
    doc.text(soapLines, 14, yPos);

    yPos += (soapLines.length * 5) + 15;

    // --- Differential Diagnosis ---
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Differential Diagnosis', 14, yPos);

    yPos += 5;

    const tableBody = data.ddx?.map(d => [
        d.diagnosis,
        d.confidence,
        d.rationale,
        d.workup || '-'
    ]) || [];

    autoTable(doc, {
        startY: yPos,
        head: [['Diagnosis', 'Conf', 'Rationale', 'Recommended Workup']],
        body: tableBody,
        headStyles: { fillColor: [6, 182, 212] }, // Cyan 500
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 20 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 40 }
        },
        styles: { fontSize: 9, cellPadding: 3 },
    });

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('NeuroMed AI v2.0', 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`NeuroMed_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};
