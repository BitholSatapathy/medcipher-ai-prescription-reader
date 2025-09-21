import { MedicineApiService } from "./medicine-api.service.js";
import { GeminiApiService } from "./gemini-api.service.js";
import { formatPrescriptionDetails } from "../renderers/formatter.js";

export class ApiService {
  constructor(geminiApiKey, medicineApiUrl) {
    if (!geminiApiKey) {
      throw new Error("Gemini API key is required");
    }
    if (!medicineApiUrl) {
      throw new Error("Medicine API URL is required");
    }

    // Initialize both services
    this.geminiService = new GeminiApiService(geminiApiKey);
    this.medicineService = new MedicineApiService(medicineApiUrl);
  }

  async analyzePrescriptionImage(imageFile) {
    try {
      console.log("Step 1: Extracting text from image using Gemini...");
      const rawExtractedText = await this.geminiService.analyzePrescriptionImage(imageFile);
      console.log("Gemini extracted text:", rawExtractedText);

      console.log("Step 2: Formatting text and spell-checking medicines...");
      const formattedHtml = await this.formatWithSpellCheck(rawExtractedText);

      return formattedHtml;

        } catch (error) {
            console.error('Error in prescription processing pipeline:', error);
            throw new Error(`Failed to process prescription: ${error.message}`);
        }
    }

    async formatWithSpellCheck(rawText) {
        try {
            const initialFormatted = await formatPrescriptionDetails(rawText);
            
            const medicineNames = this.extractMedicineNames(rawText);
            console.log('Extracted medicine names:', medicineNames);

            const correctedMedicines = await this.spellCheckMedicines(medicineNames);
            console.log('Spell-checked medicines:', correctedMedicines);

            const correctedText = this.replaceMedicineNames(rawText, medicineNames, correctedMedicines);
            
            return await formatPrescriptionDetails(correctedText);

        } catch (error) {
            console.error('Error in formatting and spell-checking:', error);
            return await formatPrescriptionDetails(rawText);
        }
    }

    extractMedicineNames(text) {
        const medicineNames = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.includes('Name:') && !line.includes('Patient Name:') && !line.includes('Doctor Name:')) {
                const nameMatch = line.split('Name:')[1];
                if (nameMatch) {
                    const name = nameMatch.replace(/\*/g, '').trim();
                    if (name && name !== 'Not visible' && name !== 'N/A') {
                        medicineNames.push(name);
                    }
                }
            }
        }
        
        return medicineNames;
    }
    async spellCheckMedicines(medicineNames) {
        if (medicineNames.length === 0) {
            return [];
        }

        try {
            if (medicineNames.length > 1) {
                return await this.medicineService.batchGetSuggestions(medicineNames);
            } else {
                const corrected = await this.medicineService.getSuggestions(medicineNames[0]);
                return [corrected];
            }
        } catch (error) {
            console.error('Error spell-checking medicines:', error);
            // Return original names if spell-check fails
            return medicineNames;
        }
    }

    replaceMedicineNames(originalText, originalNames, correctedNames) {
        let correctedText = originalText;
        
        for (let i = 0; i < originalNames.length && i < correctedNames.length; i++) {
            const original = originalNames[i];
            const corrected = correctedNames[i];
            
            if (original !== corrected) {
                correctedText = correctedText.replace(
                    new RegExp(`\\b${original}\\b`, 'gi'), 
                    corrected
                );
                console.log(`Corrected: "${original}" → "${corrected}"`);
            }
        }
        
        return correctedText;
    }

    async getMedicineSuggestions(medicineName, maxEditDistance = 2) {
        try {
            return await this.medicineService.getSuggestions(medicineName, maxEditDistance);
        } catch (error) {
            console.error(`Error getting suggestions for ${medicineName}:`, error);
            return medicineName; 
        }
    }

    async batchGetMedicineSuggestions(medicineNames, maxEditDistance = 2) {
        try {
            return await this.medicineService.batchGetSuggestions(medicineNames, maxEditDistance);
        } catch (error) {
            console.error('Error getting batch medicine suggestions:', error);
            return medicineNames; 
        }
    }
}