import { BaseApiService } from './base-api.service.js';

export class MedicineApiService extends BaseApiService {
    constructor(baseUrl = 'http://127.0.0.1:5000') {
        super(baseUrl);
    }

    async getSuggestions(medicineName, maxEditDistance = 3) {
        try {
            const result = await this.makeRequest('/suggest_medicine', {
                method: 'POST',
                body: JSON.stringify({
                    term: medicineName,
                    max_edit_distance: maxEditDistance
                })
            });

            if (result?.length > 0) {
                const suggestion = result[0];
                console.log(`Medicine suggestion for "${medicineName}":`, {
                    original: medicineName,
                    suggested: suggestion.term,
                    confidence: suggestion.confidence,
                    similarity: suggestion.similarity,
                    method: suggestion.method
                });
                return suggestion.term;
            }
            
            return medicineName;
            
        } catch (error) {
            console.error('Error fetching medicine suggestions:', error);
            return medicineName; 
        }
    }

    async batchGetSuggestions(medicineNames, maxEditDistance = 3) {
        try {
            const result = await this.makeRequest('/batch_suggest', {
                method: 'POST',
                body: JSON.stringify({
                    terms: medicineNames,
                    max_edit_distance: maxEditDistance
                })
            });

            if (Array.isArray(result) && result.length === medicineNames.length) {
                console.log('Batch medicine suggestions:', {
                    original: medicineNames,
                    suggested: result
                });
                return result;
            }
            
            console.warn('Batch request failed, falling back to individual requests');
            const suggestions = [];
            for (const name of medicineNames) {
                const suggestion = await this.getSuggestions(name, maxEditDistance);
                suggestions.push(suggestion);
            }
            return suggestions;
            
        } catch (error) {
            console.error('Error fetching batch medicine suggestions:', error);
            
            const suggestions = [];
            for (const name of medicineNames) {
                try {
                    const suggestion = await this.getSuggestions(name, maxEditDistance);
                    suggestions.push(suggestion);
                } catch (individualError) {
                    console.error(`Error with individual suggestion for ${name}:`, individualError);
                    suggestions.push(name);
                }
            }
            return suggestions;
        }
    }

    async getDetailedSuggestion(medicineName) {
        try {
            const result = await this.makeRequest('/suggest_medicine', {
                method: 'POST',
                body: JSON.stringify({
                    term: medicineName,
                    max_edit_distance: 3
                })
            });

            return result?.[0] || { term: medicineName, confidence: 0 };
            
        } catch (error) {
            console.error('Error fetching detailed medicine suggestion:', error);
            return { term: medicineName, confidence: 0, error: error.message };
        }
    }


    async analyzeMedicine(medicineName) {
        try {
            const result = await this.makeRequest('/analyze_medicine', {
                method: 'POST',
                body: JSON.stringify({
                    term: medicineName
                })
            });

            return result;
            
        } catch (error) {
            console.error('Error analyzing medicine:', error);
            return { error: error.message };
        }
    }

    async getHealthStatus() {
        try {
            const result = await this.makeRequest('/health', {
                method: 'GET'
            });

            return result;
            
        } catch (error) {
            console.error('Error checking API health:', error);
            return { status: 'error', error: error.message };
        }
    }
}