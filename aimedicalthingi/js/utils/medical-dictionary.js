
export class MedicalDictionary {
    
    static #FREQUENCY_DICTIONARY = {
        // Basic frequency terms
        'BID': '2 times per day',
        'TID': '3 times per day', 
        'QID': '4 times per day',
        'QD': '1 time per day',
        'QOD': 'Every other day',
        'PRN': 'As needed',
        'AC': 'Before meals',
        'PC': 'After meals',
        'HS': 'At bedtime',
        'Q4H': 'Every 4 hours',
        'Q6H': 'Every 6 hours',
        'Q8H': 'Every 8 hours',
        'Q12H': 'Every 12 hours',
        'QAM': 'Every morning',
        'QPM': 'Every evening',
        'STAT': 'Immediately',
        
        // Case variations
        'bid': '2 times per day',
        'tid': '3 times per day',
        'qid': '4 times per day',
        'qd': '1 times per day',
        'qod': 'Every other day',
        'prn': 'As needed',
        'ac': 'Before meals',
        'pc': 'After meals',
        'hs': 'At bedtime',
        'q4h': 'Every 4 hours',
        'q6h': 'Every 6 hours',
        'q8h': 'Every 8 hours',
        'q12h': 'Every 12 hours',
        'qam': 'Every morning',
        'qpm': 'Every evening',
        'stat': 'Immediately',
        
        // Alternative formats
        'b.i.d': '2 times per day',
        't.i.d': '3 times per day',
        'q.i.d': '4 times per day',
        'q.d': '1 times per day',
        'q.o.d': 'Every other day',
        'p.r.n': 'As needed',
        'a.c': 'Before meals',
        'p.c': 'After meals',
        'h.s': 'At bedtime',
        
        // Common numeric patterns
        '2x daily': '2 times per day',
        '3x daily': '3 times per day',
        '4x daily': '4 times per day',
        '1x daily': '1 times per day',
        'twice daily': '2 times per day',
        'three times daily': '3 times per day',
        'four times daily': '4 times per day',
        'once daily': '1 times per day',
        'twice a day': '2 times per day',
        'three times a day': '3 times per day',
        'four times a day': '4 times per day',
        'once a day': '1 times per day'
    };

    static translateFrequency(frequencyText) {
        if (!frequencyText) return frequencyText;
        
        let translatedText = frequencyText;
        
        const lowerFrequency = frequencyText.toLowerCase().trim();
        if (this.#FREQUENCY_DICTIONARY[lowerFrequency]) {
            return this.#FREQUENCY_DICTIONARY[lowerFrequency];
        }
        
        Object.keys(this.#FREQUENCY_DICTIONARY).forEach(abbrev => {
            const regex = new RegExp(`\\b${abbrev.replace(/\./g, '\\.')}\\b`, 'gi');
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, this.#FREQUENCY_DICTIONARY[abbrev]);
            }
        });
        
        return translatedText;
    }

    static getDictionary() {
        return { ...this.#FREQUENCY_DICTIONARY };
    }


    static hasTranslation(term) {
        if (!term) return false;
        return this.#FREQUENCY_DICTIONARY.hasOwnProperty(term.toLowerCase().trim());
    }

    static getVariations(frequency) {
        const variations = [];
        const targetTranslation = this.translateFrequency(frequency);
        
        Object.entries(this.#FREQUENCY_DICTIONARY).forEach(([key, value]) => {
            if (value === targetTranslation) {
                variations.push(key);
            }
        });
        
        return variations;
    }
}