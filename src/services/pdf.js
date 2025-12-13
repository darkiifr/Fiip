import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromPdf(arrayBuffer) {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Failed to extract text from PDF");
    }
}
