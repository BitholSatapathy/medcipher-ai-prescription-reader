import { BaseApiService } from './base-api.service.js';

export class GeminiApiService extends BaseApiService {
    constructor(apiKey) {
        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        super(`${baseUrl}?key=${apiKey}`);
        this.apiKey = apiKey;
    }

    async analyzePrescriptionImage(imageFile) {
        try {
            // Convert File to base64
            const { base64Data, mimeType } = await this._fileToBase64(imageFile);
            
            const prompt = this._buildPrescriptionPrompt();
            
            const payload = {
                contents: [{
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.9,
                    topK: 40
                }
            };

            const result = await this.makeRequest('', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            return this._extractTextFromResponse(result);
        } catch (error) {
            throw new Error(`Failed to analyze prescription image: ${error.message}`);
        }
    }


    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            if (!file.type.startsWith('image/')) {
                reject(new Error('File must be an image'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = () => {
                try {

                    const result = reader.result;
                    const base64Data = result.split(',')[1]; 
                    const mimeType = file.type;
                    
                    resolve({ base64Data, mimeType });
                } catch (error) {
                    reject(new Error('Failed to process file'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    _buildPrescriptionPrompt() {
        return `
Analyze the following prescription image and extract ALL information in EXACTLY this structured format. Follow the format precisely with the exact headers and structure shown below:

**Patient Information:**
Patient Name: [Extract patient name or write "Not visible"]
Doctor Name: [Extract doctor name or write "Not visible"] 
Clinic/Hospital Name: [Extract clinic/hospital name or write "Not visible"]
Address: [Extract address or write "Not visible"]
Date of Prescription: [Extract date or write "Not visible"]

**Medication(s):**

**Medication 1:**
* Name: [Medication name or "Not visible"]
* Dosage: [Exact dosage like "100mg - 1 tab" or "Not visible"]
* Frequency: [How often like "BID (twice a day)" or "Not visible"]
* Duration: [How long like "7 days" or "N/A" if not specified]
* Instructions: [Special instructions or "N/A" if none]

**Medication 2:**
* Name: [Medication name or "Not visible"]
* Dosage: [Exact dosage or "Not visible"]
* Frequency: [How often or "Not visible"]
* Duration: [How long or "N/A" if not specified]
* Instructions: [Special instructions or "N/A" if none]

[Continue this pattern for ALL medications found - add Medication 3, 4, 5, etc. as needed]

**Other Notes/Instructions:**
Refills: [Number of refills allowed or "Not visible"]
Label: [Any label instructions or "Not visible"]

IMPORTANT FORMATTING RULES:
1. Use EXACTLY the headers shown above with double asterisks (**)
2. For medications, use the exact format "**Medication X:**" where X is the number
3. Under each medication, use bullet points with single asterisks (*)
4. Always include ALL fields even if "Not visible" or "N/A"
5. If you find more than 2 medications, add them as Medication 3, Medication 4, etc.
6. Do not add any extra text, explanations, or formatting outside this structure
7. If the image is not a prescription or unreadable, write only: "ERROR: Image is not a readable prescription"

Extract every piece of visible text from the prescription, even if handwritten or partially unclear. If text is partially visible, write what you can see followed by "[partially visible]".
        `;
    }

    _extractTextFromResponse(result) {
        if (result.candidates && 
            result.candidates.length > 0 &&
            result.candidates[0].content && 
            result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0 &&
            result.candidates[0].content.parts[0].text) {
            
            return result.candidates[0].content.parts[0].text;
        }

        console.warn("Unexpected Gemini API response structure:", result);
        return "Could not extract details from the prescription due to unexpected API response.";
    }
}