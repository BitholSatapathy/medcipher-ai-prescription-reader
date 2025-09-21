
import { MedicalDictionary } from '../utils/medical-dictionary.js';
import { GeminiApiService } from '../services/gemini-api.service.js';
import { MedicineApiService } from '../services/medicine-api.service.js';
import { TextCleaner } from '../utils/text-cleaner.js';
import { HtmlRenderer } from './html-renderer.js';

const GEMINI_API_KEY = "AIzaSyA3F0kFruG8GDlVv18l23rl6WQCo71gUoI";
const MEDICINE_API_URL = "http://127.0.0.1:5000";

export class PrescriptionParser {
    constructor(patientInfoParser, medicationParser, otherNotesParser) {
        this.patientInfoParser = patientInfoParser;
        this.medicationParser = medicationParser;
        this.otherNotesParser = otherNotesParser;
    }

    async parse(cleanedText) {
        const lines = TextCleaner.extractLines(cleanedText);

        const patientInfo = this.patientInfoParser.parse(lines);
        let medications = await this.medicationParser.parseFromLines(lines);
        
        // Try alternative parsing methods if no medications found
        if (medications.length === 0) {
            medications = await this.medicationParser.parseFromRegex(cleanedText);
        }
        if (medications.length === 0) {
            medications = await this.medicationParser.parseFromBlocks(cleanedText);
        }

        const otherNotes = this.otherNotesParser.parse(lines);

        return { patientInfo, medications, otherNotes };
    }
}

export class PatientInfoParser {
    constructor() {
        this.fieldMappings = {
            'Patient Name:': 'name',
            'Doctor Name:': 'doctor',
            'Clinic/Hospital Name:': 'clinic',
            'Hospital Name:': 'clinic', 
            'Clinic Name:': 'clinic',   
            'Address:': 'address',
            'Date of Prescription:': 'date',
            'Prescription Date:': 'date', 
            'Date:': 'date'              
        };
    }

    parse(lines) {
        const patientInfo = {};
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            Object.entries(this.fieldMappings).forEach(([key, field]) => {
                if (trimmedLine.includes(key)) {
                    const value = trimmedLine.split(key)[1]
                        ?.replace(/\*/g, '')
                        .trim();
                    if (value && value !== 'Not visible' && value !== 'N/A') {
                        patientInfo[field] = value;
                    }
                }
            });
        });

        return patientInfo;
    }
}

export class MedicationParser {
    // MedicationParser now receives a specific medicineApiService instance
    constructor(medicineApiService) {
        this.medicineApiService = medicineApiService; 
        this.allFieldMappings = {
            'Name:': 'name',
            'Medicine Name:': 'name', 
            'Drug Name:': 'name',     
            'Dosage:': 'dosage',
            'Dose:': 'dosage',       
            'Strength:': 'dosage',   
            'Frequency:': 'frequency',
            'Times per day:': 'frequency', 
            'Duration:': 'duration',
            'Period:': 'duration',   
            'Instructions:': 'instructions',
            'Directions:': 'instructions', 
            'Notes:': 'instructions'       
        };
    }

    async parseFromLines(lines) {
        const medications = [];
        let currentMedication = {};
        let insideMedicationSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (this._isMedicationSectionStart(trimmedLine)) {
                insideMedicationSection = true;
                continue;
            }

            if (this._isMedicationSectionEnd(trimmedLine)) {
                insideMedicationSection = false;
                if (this._isValidMedication(currentMedication)) {
                    medications.push(await this._processMedication(currentMedication));
                    currentMedication = {};
                }
                continue;
            }

            if (insideMedicationSection) {
                if (this._isNewMedicationStart(trimmedLine)) {
                    if (this._isValidMedication(currentMedication)) {
                        medications.push(await this._processMedication(currentMedication));
                    }
                    currentMedication = {};
                }
                this._parseField(trimmedLine, currentMedication);
            }
        }

        // Handle last medication
        if (this._isValidMedication(currentMedication)) {
            medications.push(await this._processMedication(currentMedication));
        }

        return medications;
    }

    async parseFromRegex(text) {
        const medications = [];
        const medicationRegex = /\*\*Medication \d+:\*\*\s*(?:\*\s*(?:Name|Medicine Name|Drug Name):\s*([^\n*]+))?\s*(?:\*\s*(?:Dosage|Dose|Strength):\s*([^\n*]+))?\s*(?:\*\s*(?:Frequency|Times per day):\s*([^\n*]+))?\s*(?:\*\s*(?:Duration|Period):\s*([^\n*]+))?\s*(?:\*\s*(?:Instructions|Directions|Notes):\s*([^\n*]+))?/g;
        let match;

        while ((match = medicationRegex.exec(text)) !== null) {
            const medication = {};
            if (match[1]) medication.name = match[1].trim();
            if (match[2]) medication.dosage = match[2].trim();
            if (match[3]) medication.frequency = match[3].trim();
            if (match[4]) medication.duration = match[4].trim();
            if (match[5]) medication.instructions = match[5].trim();
            
            if (this._isValidMedication(medication)) { 
                 medications.push(await this._processMedication(medication));
            }
        }
        return medications;
    }

    async parseFromBlocks(text) {
        const medications = [];
        const medicationBlocks = text.split(/\*\*Medication \d+:\*\*/);

        for (let i = 1; i < medicationBlocks.length; i++) { 
            const block = medicationBlocks[i];
            const medication = {};
            const blockLines = block.split('\n');

            for (const line of blockLines) {
                this._parseField(line.trim(), medication);
            }

            if (this._isValidMedication(medication)) {
                medications.push(await this._processMedication(medication));
            }
        }

        return medications;
    }

    _parseField(line, medication) {
        Object.entries(this.allFieldMappings).forEach(([key, field]) => { 
            if (line.includes(key)) {
                const value = line.split(key)[1]?.replace(/\*/g, '').trim();
                if (value && value !== 'N/A' && value !== 'Not visible') {
                    medication[field] = value;
                }
            }
        });
    }

    async _processMedication(medication) {
        if (medication.name) {
            // FIXED: Use getSuggestions instead of getMedicineSuggestions
            medication.name = await this.medicineApiService.getSuggestions(medication.name);
        }
        if (medication.frequency) {
            medication.frequency = MedicalDictionary.translateFrequency(medication.frequency);
        }
        return medication;
    }

    _isValidMedication(medication) {
        return medication && medication.name && medication.name.trim().length > 0 && medication.name !== 'Not visible';
    }

    _isMedicationSectionStart(line) {
        const patterns = [
            'Medication(s):',
            'Medications:',
            'Prescribed Medications:',
            'Rx:',
            'Prescriptions:'
        ];
        return patterns.some(pattern => line.includes(pattern));
    }

    _isMedicationSectionEnd(line) {
        const patterns = [
            'Other Notes/Instructions:',
            'Additional Instructions:',
            'Refill Information:',
            'Pharmacy Notes:',
            'Doctor Notes:'
        ];
        return patterns.some(pattern => line.includes(pattern));
    }

    _isNewMedicationStart(line) {
        const patterns = [
            /Medication \d+:/,
            /Medicine \d+:/,
            /Rx \d+:/,
            /^\d+\./, 
            /^\d+\)/  
        ];
        return patterns.some(pattern => pattern.test(line));
    }
}

export class OtherNotesParser {
    constructor() {
        this.fieldMappings = {
            'Refills:': 'refills',
            'Refill:': 'refills', 
            'Label:': 'label',
            'Special Instructions:': 'specialInstructions', 
            'Pharmacy Instructions:': 'pharmacyInstructions', 
            'Additional Notes:': 'additionalNotes' 
        };
    }

    parse(lines) {
        const otherNotes = {};
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            Object.entries(this.fieldMappings).forEach(([key, field]) => {
                if (trimmedLine.includes(key)) {
                    const value = trimmedLine
                        .split(key)[1]
                        ?.replace(/\*/g, '')
                        .trim();
                    if (value && value !== 'Not visible' && value !== 'N/A') {
                        otherNotes[field] = value;
                    }
                }
            });
        });

        return otherNotes;
    }
}

export class PrescriptionDataValidator {
    static validate(patientInfo, medications, otherNotes) {
        const hasPatientInfo = Object.keys(patientInfo).length > 0; 
        const hasMedications = medications.length > 0;
        const hasOtherNotes = Object.keys(otherNotes).length > 0;

        return {
            isValid: hasPatientInfo || hasMedications || hasOtherNotes,
            hasPatientInfo,
            hasMedications,
            hasOtherNotes
        };
    }
}

export class PrescriptionFormatter {
    constructor() {
        this.geminiApiService = new GeminiApiService(GEMINI_API_KEY);
        this.medicineApiService = new MedicineApiService(MEDICINE_API_URL);

        this.patientInfoParser = new PatientInfoParser();
        this.medicationParser = new MedicationParser(this.medicineApiService); 
        this.otherNotesParser = new OtherNotesParser();
        this.prescriptionParser = new PrescriptionParser(
            this.patientInfoParser,
            this.medicationParser,
            this.otherNotesParser
        );
    }

    async formatPrescriptionDetails(extractedText, errorMessage = null) {
        try {
            if (errorMessage) {
                return HtmlRenderer.renderError(errorMessage);
            }

            if (!extractedText || extractedText.trim().length === 0) {
                return HtmlRenderer.renderError("No prescription text provided");
            }

            if (extractedText.includes("ERROR: Image is not a readable prescription")) {
                return HtmlRenderer.renderError("The uploaded image is not a readable prescription");
            }

            const cleanedText = TextCleaner.clean(extractedText);
            
            if (!cleanedText) {
                return HtmlRenderer.renderError("Could not clean prescription text");
            }

            const { patientInfo, medications, otherNotes } = await this.prescriptionParser.parse(cleanedText);

            console.log('Parsing Results:', {
                patientInfo,
                medications,
                otherNotes
            });

            const validation = PrescriptionDataValidator.validate(patientInfo, medications, otherNotes);
            
            if (!validation.isValid) {
                return HtmlRenderer.renderDebugInfo(
                    extractedText, 
                    cleanedText, 
                    patientInfo, 
                    medications, 
                    otherNotes
                );
            }

            return this._buildHtmlContent(patientInfo, medications, otherNotes);
            
        } catch (error) {
            console.error('Error formatting prescription:', error);
            return HtmlRenderer.renderError(`An error occurred while formatting the prescription: ${error.message}`);
        }
    }

    _buildHtmlContent(patientInfo, medications, otherNotes) {
        const sections = [
            HtmlRenderer.renderPatientInfo(patientInfo),
            HtmlRenderer.renderMedications(medications),
            HtmlRenderer.renderOtherNotes(otherNotes)
        ];

        return sections.join('');
    }

async formatPrescriptionFromImage(imageFile) {
    try {
        if (!imageFile) {
            throw new Error('No image file provided');
        }

        if (!imageFile.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }
        const extractedText = await this.geminiApiService.analyzePrescriptionImage(imageFile);
        
        return await this.formatPrescriptionDetails(extractedText);
        
    } catch (error) {
        console.error('Error analyzing prescription image:', error);
        return HtmlRenderer.renderError(`Failed to analyze prescription image: ${error.message}`);
    }
}

    async getMedicineSuggestions(medicineName, maxEditDistance = 2) {
        try {
            return await this.medicineApiService.getSuggestions(medicineName, maxEditDistance);
        } catch (error) {
            console.error('Error getting medicine suggestions:', error);
            return medicineName; 
        }
    }

    async batchGetMedicineSuggestions(medicineNames, maxEditDistance = 2) {
        try {
            return await this.medicineApiService.batchGetSuggestions(medicineNames, maxEditDistance);
        } catch (error) {
            console.error('Error getting batch medicine suggestions:', error);
            return medicineNames; 
        }
    }
}
//Lag-acy
export async function formatPrescriptionDetails(extractedText, errorMessage) {
    const formatter = new PrescriptionFormatter();
    return await formatter.formatPrescriptionDetails(extractedText, errorMessage);
}

export const defaultFormatter = new PrescriptionFormatter();