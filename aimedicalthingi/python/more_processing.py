import re
from typing import List, Set

class CombinationMedicationProcessor:
    def __init__(self):
        # Dosage patterns - comprehensive list covering various formats
        self.dosage_patterns = [
            r'\d+(?:\.\d+)?\s*mg',           # 250mg, 250.5mg
            r'\d+(?:\.\d+)?\s*mcg',          # 500mcg
            r'\d+(?:\.\d+)?\s*μg',           # 500μg (alternative symbol)
            r'\d+(?:\.\d+)?\s*g',            # 1g
            r'\d+(?:\.\d+)?\s*ml',           # 10ml
            r'\d+(?:\.\d+)?\s*mL',           # 10mL (alternative)
            r'\d+(?:\.\d+)?\s*%',            # 0.5%
            r'\d+(?:\.\d+)?\s*iu',           # 10iu
            r'\d+(?:\.\d+)?\s*IU',           # 10IU (alternative)
            r'\d+(?:\.\d+)?\s*units?',       # 2units, 2unit
            r'BL\s*\d+',                     # BL 40
            r'Bl\s*\d+',                     # Bl 40
            r'\d+(?:\.\d+)?\s*L',            # 1L, 0.5L
            r'\d+(?:\.\d+)?\s*cc',           # 10cc
            r'\d+(?:\.\d+)?\s*gm',           # 250gm
            r'\d+(?:\.\d+)?\s*kg',           # 1kg
            r'\d+(?:\.\d+)?\s*meq',          # 10meq
            r'\d+(?:\.\d+)?\s*mmol',         # 5mmol
            r'\d+(?:\.\d+)?\s*ppm',          # 100ppm
        ]
        

        self.forms = [
            'tablet', 'tablets', 'tab', 'tabs',
            'capsule', 'capsules', 'cap', 'caps',
            'injection', 'injections', 'inj',
            'syrup', 'syrups',
            'cream', 'creams',
            'ointment', 'ointments',
            'drop', 'drops',
            'solution', 'solutions', 'sol',
            'suspension', 'suspensions', 'susp',
            'powder', 'powders',
            'gel', 'gels',
            'lotion', 'lotions',
            'spray', 'sprays',
            'patch', 'patches',
            'vial', 'vials'
        ]
    
    def extract_dosages(self, text: str) -> List[str]:
        """Extract all dosages from text"""
        dosages = []
        for pattern in self.dosage_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dosages.extend(matches)
        return dosages
    
    def extract_base_name(self, med_name: str) -> str:
        """Extract the base medication name (everything before the first dosage)"""
        # Find the first dosage occurrence
        first_dosage_pos = len(med_name)
        for pattern in self.dosage_patterns:
            match = re.search(pattern, med_name, re.IGNORECASE)
            if match:
                first_dosage_pos = min(first_dosage_pos, match.start())
        
        base_name = med_name[:first_dosage_pos].strip()
        return base_name
    
    def extract_form(self, med_name: str) -> str:
        """Extract medication form from the end of the name"""
        words = med_name.split()
        if words:
            last_word = words[-1].lower()
            if last_word in [form.lower() for form in self.forms]:
                return words[-1]
        return ""
    
    def has_combination_dosage(self, med_name: str) -> bool:
        """Check if medication has combination dosage (contains '/' between dosages)"""
        pattern = r'\d+(?:\.\d+)?\s*(?:mg|mcg|μg|g|ml|mL|%|iu|IU|units?|L|cc|gm|kg|meq|mmol|ppm)\s*/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|μg|g|ml|mL|%|iu|IU|units?|L|cc|gm|kg|meq|mmol|ppm)'
        return bool(re.search(pattern, med_name, re.IGNORECASE))
    
    def process_combination_medication(self, med_name: str) -> List[str]:
        """Process a combination medication and return all variations"""
        variations = []
        
        if '/' in med_name and not self.has_combination_dosage(med_name):
            clean_name = med_name.replace('/', '').strip()
            clean_name = re.sub(r'\s+', ' ', clean_name)  
            variations.append(clean_name)
            return variations
        
        if not self.has_combination_dosage(med_name):
            variations.append(med_name)
            return variations
        
        base_name = self.extract_base_name(med_name)
        form = self.extract_form(med_name)
        dosages = self.extract_dosages(med_name)
        
        if len(dosages) >= 2:
            for dosage in dosages:
                if base_name:
                    med_with_dosage = f"{base_name} {dosage}".strip()
                    variations.append(med_with_dosage)
                    
                    if form:
                        med_with_dosage_form = f"{base_name} {dosage} {form}".strip()
                        variations.append(med_with_dosage_form)
        
        return variations
    
    def process_medication_list(self, medications: List[str]) -> List[str]:
        """Process a list of medications and return expanded variations"""
        all_variations = set()
        processed_combinations = set() 
        
        for med in medications:
            med = med.strip()
            if not med:
                continue
            if self.has_combination_dosage(med):
                processed_combinations.add(med)
                variations = self.process_combination_medication(med)
                all_variations.update(variations)
            else:
                if '/' in med:
                    clean_med = med.replace('/', '').strip()
                    clean_med = re.sub(r'\s+', ' ', clean_med)
                    all_variations.add(clean_med)
                else:
                    all_variations.add(med)
        
        final_variations = all_variations - processed_combinations
        
        return sorted(list(final_variations))
    
    def process_txt_file(self, input_file: str, output_file: str = None):
        """Process medications from text file"""
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            medications = [line.strip() for line in lines if line.strip()]
            
            print(f"Read {len(medications)} medications from {input_file}")
            
            processed_meds = self.process_medication_list(medications)
            
            if output_file is None:
                output_file = 'highly processed meds.txt'
            
            with open(output_file, 'w', encoding='utf-8') as f:
                for med in processed_meds:
                    f.write(med + '\n')
            
            original_count = len(medications)
            processed_count = len(processed_meds)
            
            print(f"Processed {original_count} original medications")
            print(f"Generated {processed_count} medications after splitting combinations")
            print(f"Net change: {processed_count - original_count:+d} medications")
            print(f"Results saved to {output_file}")
            
            return processed_meds
            
        except FileNotFoundError:
            print(f"Error: File '{input_file}' not found")
        except Exception as e:
            print(f"Error processing file: {e}")

# Example usage and testing
def main():
    processor = CombinationMedicationProcessor()
    
    # Test with sample medications
    sample_meds = [
        "A Plus 100mg/500mg",
        "A Plus 100mg/500mg Tablet",
        "Paracetamol 250mg/500mg Capsule",
        "Vitamin B 10mcg/20mcg",
        "Regular Medicine 250mg Tablet",
        "Medicine with / slash",
        "Normal / Medicine",
        "Co-trimoxazole 80mg/400mg Tablet",
        "Amoxicillin 125mg/31.25mg Suspension"
    ]
    
    print("Sample Processing:")
    print("=" * 60)
    
    for med in sample_meds:
        print(f"\nOriginal: {med}")
        variations = processor.process_combination_medication(med)
        if len(variations) > 1 or variations[0] != med:
            print("Split into:")
            for i, var in enumerate(variations, 1):
                print(f"  {i}. {var}")
        else:
            print("  (No changes needed)")
    
    print("\n" + "=" * 60)
    print("Final Processed List:")
    print("=" * 60)
    
    all_processed = processor.process_medication_list(sample_meds)
    for i, med in enumerate(all_processed, 1):
        print(f"{i:2d}. {med}")
    
    print(f"\nOriginal count: {len(sample_meds)}")
    print(f"Processed count: {len(all_processed)}")
    print(f"Net change: {len(all_processed) - len(sample_meds):+d}")

if __name__ == "__main__":
    main()


processor = CombinationMedicationProcessor()
processor.process_txt_file('medicines_final_processed.txt')


