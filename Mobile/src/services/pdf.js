// Note: `react-native-pdf` exposes a `<Pdf />` React component for viewing PDFs.
// It does not include an API for extracting raw text string data like `pdfjs-dist` does on the web.
export async function extractTextFromPdf(_pdfUri) {
    try {
        console.warn('PDF text extraction is not available in the mobile native viewer.');
        return '';
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF');
    }
}
