import re
from difflib import SequenceMatcher
from collections import defaultdict
import unicodedata

class MedicationMatcher:
    def __init__(self, medication_file_path):
        """
        Initialize with medication file path
        medication_file_path: path to the text file containing medication names
        """
        self.original_medications = self._load_medications(medication_file_path)
        self.medications = [self._normalize_text(med) for med in self.original_medications]
        self.med_dict = {self._normalize_text(med): med for med in self.original_medications}
        
        self.soundex_index = self._build_soundex_index()
        self.first_char_index = self._build_first_char_index()
        self.word_index = self._build_word_index()
    
    def _load_medications(self, file_path):
        """Load medications from file, handling encoding issues"""
        medications = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                medications = [line.strip() for line in f if line.strip()]
        except UnicodeDecodeError:
            for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        medications = [line.strip() for line in f if line.strip()]
                    break
                except UnicodeDecodeError:
                    continue
        
        return medications
    
    def _normalize_text(self, text):
        """Normalize text by removing special characters and normalizing unicode"""
        if not text:
            return ""
        
        text = unicodedata.normalize('NFKD', text)
        

        text = text.lower()
        
        text = re.sub(r'[^\w\s\d.+-]', ' ', text) 
        text = re.sub(r'\s+', ' ', text)  
        text = text.strip()
        
        return text
    
    def _extract_base_name(self, med_name):
        """Extract base medication name (remove dosage, formulation info)"""
        normalized = self._normalize_text(med_name)
        

        formulation_words = [
            'tablet', 'capsule', 'injection', 'syrup', 'suspension', 'drops',
            'cream', 'ointment', 'gel', 'solution', 'powder', 'sr', 'xl', 'er',
            'dsr', 'mr', 'la', 'od', 'bd', 'forte'
        ]
        

        normalized = re.sub(r'\d+\s*(mg|ml|mcg|g|iu|units?)\b', '', normalized)
        

        words = normalized.split()
        filtered_words = [w for w in words if w not in formulation_words]
        
        return ' '.join(filtered_words).strip()
    
    def _build_word_index(self):
        """Build word-based index for better partial matching"""
        word_map = defaultdict(list)
        for med in self.medications:
            words = med.split()
            for word in words:
                if len(word) > 2:  
                    word_map[word].append(med)
            

            base_name = self._extract_base_name(med)
            if base_name and base_name != med:
                base_words = base_name.split()
                for word in base_words:
                    if len(word) > 2:
                        word_map[word].append(med)
        
        return word_map
        
    def _build_soundex_index(self):
        """Build soundex index for phonetic matching"""
        soundex_map = defaultdict(list)
        for med in self.medications:
            soundex_code = self._soundex(med.split()[0]) 
            soundex_map[soundex_code].append(med)
        return soundex_map
    
    def _build_first_char_index(self):
        """Build first character index for faster searching"""
        char_map = defaultdict(list)
        for med in self.medications:
            if med:
                char_map[med[0]].append(med)
        return char_map
    
    def _soundex(self, word):
        """Simple soundex implementation for phonetic matching"""
        if not word:
            return "0000"
        
        word = word.upper()
        soundex_map = {
            'B': '1', 'F': '1', 'P': '1', 'V': '1',
            'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
            'D': '3', 'T': '3',
            'L': '4',
            'M': '5', 'N': '5',
            'R': '6'
        }
        
        result = word[0]
        prev_code = soundex_map.get(word[0], '0')
        
        for char in word[1:]:
            code = soundex_map.get(char, '0')
            if code != '0' and code != prev_code:
                result += code
            prev_code = code
            
        result = result[:4].ljust(4, '0')
        return result
    
    def _preprocess_input(self, query):
        """Preprocess input query"""
        if not query:
            return ""
        
        normalized = self._normalize_text(query)
        
        return normalized
    
    def _calculate_similarity_score(self, query, candidate):
        """Calculate comprehensive similarity score"""
        if not query or not candidate:
            return 0.0
        
        base_score = SequenceMatcher(None, query, candidate).ratio()
        
        prefix_bonus = 0.0
        min_len = min(len(query), len(candidate))
        if min_len > 0:
            common_prefix = 0
            for i in range(min_len):
                if query[i] == candidate[i]:
                    common_prefix += 1
                else:
                    break
            prefix_bonus = (common_prefix / min_len) * 0.3
        
        char_bonus = 0.0
        query_chars = set(query.replace(' ', ''))
        candidate_chars = set(candidate.replace(' ', ''))
        if query_chars and candidate_chars:
            common_chars = len(query_chars & candidate_chars)
            char_bonus = (common_chars / len(query_chars)) * 0.2
        
        length_penalty = 0.0
        if len(query) > 0:
            length_diff = abs(len(query) - len(candidate)) / max(len(query), len(candidate))
            length_penalty = length_diff * 0.1
        
        final_score = base_score + prefix_bonus + char_bonus - length_penalty
        return max(0.0, min(1.0, final_score))
    
    def _get_candidate_pool(self, query):
        """Get a smaller pool of candidates for efficient matching"""
        candidates = set()
        
        if query:
            first_char = query[0]
            candidates.update(self.first_char_index.get(first_char, []))
            
            query_words = query.split()
            if query_words:
                soundex_code = self._soundex(query_words[0])
                candidates.update(self.soundex_index.get(soundex_code, []))
            
            for word in query_words:
                if len(word) > 2:
                    candidates.update(self.word_index.get(word, []))
                    for indexed_word in self.word_index:
                        if (word in indexed_word or indexed_word in word) and abs(len(word) - len(indexed_word)) <= 2:
                            candidates.update(self.word_index[indexed_word])
        
        if len(candidates) < 100:
            if query:
                for i in range(max(0, ord(query[0]) - 2), min(128, ord(query[0]) + 3)):
                    char = chr(i)
                    candidates.update(self.first_char_index.get(char, []))
        if len(candidates) < 50:
            candidates.update(self.medications)
        
        return list(candidates)
    
    def find_best_match(self, query, min_similarity=0.3):
        """
        Find the best matching medication name
        
        Args:
            query: Input medication name (potentially misspelled)
            min_similarity: Minimum similarity threshold (0.0 to 1.0)
        
        Returns:
            Original medication name if match found, empty string otherwise
        """
        if not query or not query.strip():
            return ""
        
        processed_query = self._preprocess_input(query)
        if not processed_query:
            return ""
        candidates = self._get_candidate_pool(processed_query)
        
        best_match = ""
        best_score = 0.0

        for candidate in candidates:
            score1 = self._calculate_similarity_score(processed_query, candidate)

            base_candidate = self._extract_base_name(candidate)
            score2 = self._calculate_similarity_score(processed_query, base_candidate) if base_candidate else 0
            score = max(score1, score2 * 0.9) 
            
            if score > best_score and score >= min_similarity:
                best_score = score
                best_match = candidate
        if best_match:
            return self.med_dict.get(best_match, best_match)
        
        return ""


if __name__ == "__main__":
    matcher = MedicationMatcher("medicines_V3.txt")

    test_cases = [
        "Paracetmol",
        "Las Honten BL 40",
        "Amoxcillin", 
        "Lorattadin",
        "Aspirine",
        "Cetrizine",
        "Omeprazole",
        "Metformin",
        "Ventolin",
        "Zantac",
        "para",
        "zolpride",  # Should match "zolpride D 30mg" or similar
        "qutomine",  # Should match "Ǫutomine" variants
        "albert",    # Should match "α-Bert 150"
        "icoclav",   # Should match "⁠Icoclav 625"
        "icopan",    # Should match "⁠Icopan-DSR"
        "xyz123",    # Should return empty
        ""           # Should return empty
    ]
    
    print("Testing Medication Matcher with your file:")
    print("=" * 60)
    for test in test_cases:
        result = matcher.find_best_match(test)
        print(f"'{test}' -> '{result}'")
    
    print(f"\nTotal medications loaded: {len(matcher.original_medications)}")