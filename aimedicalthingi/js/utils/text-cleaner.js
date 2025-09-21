export class TextCleaner {
    static clean(extractedText) {
        if (!extractedText || typeof extractedText !== 'string') {
            return '';
        }

        let cleanedText = extractedText.trim();
        cleanedText = this._findPrescriptionStart(cleanedText);
        
        cleanedText = this._removeAiPrefixes(cleanedText);
        
        cleanedText = this._normalizeWhitespace(cleanedText);

        return cleanedText;
    }

    static _findPrescriptionStart(text) {
        const startPatterns = [
            'Patient Name:',
            '***Patient Name:',
            '**Patient Name:',
            '*Patient Name:'
        ];

        for (const pattern of startPatterns) {
            const index = text.indexOf(pattern);
            if (index !== -1) {
                return text.substring(index);
            }
        }

        return text;
    }

    static _removeAiPrefixes(text) {
        const prefixPatterns = [
            /^Here's the extracted information from the prescription image:\s*/i,
            /^The extracted information from the prescription:\s*/i,
            /^Extracted prescription details:\s*/i,
            /^Based on the prescription image, here are the details:\s*/i,
            /^Analysis of the prescription image:\s*/i
        ];

        let cleanedText = text;
        prefixPatterns.forEach(pattern => {
            cleanedText = cleanedText.replace(pattern, '');
        });

        return cleanedText;
    }
//IDK SHIT ABOUT REGEX AHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
    static _normalizeWhitespace(text) {
        return text
            .replace(/\r\n/g, '\n')     // Normalize line endings
            .replace(/\r/g, '\n')       // Handle old Mac line endings
            .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
            .replace(/[ \t]+/g, ' ')    // Normalize spaces and tabs
            .trim();
    }

    static extractLines(text) {
        return this.clean(text)
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }

    static removeMarkdown(text) {
        return text
            .replace(/\*\*/g, '')      // Remove bold markers
            .replace(/\*/g, '')        // Remove italic markers
            .replace(/#{1,6}\s/g, '')  // Remove heading markers
            .trim();
    }
}