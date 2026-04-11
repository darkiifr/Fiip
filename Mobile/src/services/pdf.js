// Note: `react-native-pdf` exposes a `<Pdf />` React component for viewing PDFs.
// It does not include an API for extracting raw text string data like `pdfjs-dist` does on the web.
// If you need actual text extraction in the background, you would normally:
// 1. Pass it through a dedicated native module (like a custom bridge to PDFBox/PDFKit)
// 2. Or send the PDF to a server.
// Here we stub out the API to maintain compatibility with your application architecture.

// eslint-disable-next-line no-unused-vars
export async function extractTextFromPdf(pdfUri) {
    try {
        console.warn("Text extraction from a PDF file is not supported natively by react-native-pdf view component.");
        
        // This is a placeholder since React Native cannot simply parse PDF array buffers natively without additional C++ / Java bindings.
        return `--- Extracted Text Placeholder ---\n[L'extraction du texte brut n'est pas prise en charge nativement ici. Veuillez utiliser un module d'extraction spécifique.]`;
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Failed to extract text from PDF");
    }
}
