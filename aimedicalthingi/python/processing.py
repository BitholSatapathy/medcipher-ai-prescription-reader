import re
import pandas as pd
from typing import Set, List

class MedicationProcessor:
    def __init__(self):
        # Dosage patterns - comprehensive list covering various formats
        self.dosage_patterns = [
            r'\b\d+(?:\.\d+)?\s*mg\b',           # 250mg, 250.5mg
            r'\b\d+(?:\.\d+)?\s*mcg\b',          # 500mcg
            r'\b\d+(?:\.\d+)?\s*μg\b',           # 500μg (alternative symbol)
            r'\b\d+(?:\.\d+)?\s*g\b',            # 1g
            r'\b\d+(?:\.\d+)?\s*ml\b',           # 10ml
            r'\b\d+(?:\.\d+)?\s*mL\b',           # 10mL (alternative)
            r'\b\d+(?:\.\d+)?\s*%\b',            # 0.5%
            r'\b\d+(?:\.\d+)?\s*iu\b',           # 10iu
            r'\b\d+(?:\.\d+)?\s*IU\b',           # 10IU (alternative)
            r'\b\d+(?:\.\d+)?\s*units?\b',       # 2units, 2unit
            r'\bBL\s*\d+\b',                     # BL 40
            r'\bBl\s*\d+\b',                     # Bl 40
            r'\b\d+(?:\.\d+)?\s*L\b',            # 1L, 0.5L
            r'\b\d+(?:\.\d+)?\s*cc\b',           # 10cc
            r'\b\d+(?:\.\d+)?\s*gm\b',           # 250gm
            r'\b\d+(?:\.\d+)?\s*kg\b',           # 1kg
            r'\b\d+(?:\.\d+)?\s*meq\b',          # 10meq
            r'\b\d+(?:\.\d+)?\s*mmol\b',         # 5mmol
            r'\b\d+(?:\.\d+)?\s*ppm\b',          # 100ppm
            r'\b\d+/\d+\b',                      # 5/10 (ratio dosages)
        ]
        
        # Common medication forms
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
        
        # Create regex pattern for forms (case insensitive)
        self.forms_pattern = r'\b(?:' + '|'.join(self.forms) + r')\b'
    
    def remove_dosage(self, med_name: str) -> str:
        """Remove dosage information from medication name"""
        result = med_name
        for pattern in self.dosage_patterns:
            result = re.sub(pattern, '', result, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', result).strip()  # Clean up extra spaces
    
    def remove_forms(self, med_name: str) -> str:
        """Remove medication forms from medication name"""
        result = re.sub(self.forms_pattern, '', med_name, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', result).strip()  # Clean up extra spaces
    
    def remove_both(self, med_name: str) -> str:
        """Remove both dosage and forms from medication name"""
        result = self.remove_dosage(med_name)
        result = self.remove_forms(result)
        return result
    
    def generate_variations(self, med_name: str) -> Set[str]:
        """Generate all variations of a medication name"""
        variations = set()
        
        # Original name
        original = med_name.strip()
        if original:
            variations.add(original)
        
        # Without dosage
        no_dosage = self.remove_dosage(original)
        if no_dosage and no_dosage != original:
            variations.add(no_dosage)
        
        # Without forms
        no_forms = self.remove_forms(original)
        if no_forms and no_forms != original:
            variations.add(no_forms)
        
        # Without both dosage and forms (base name)
        base_name = self.remove_both(original)
        if base_name and base_name not in variations:
            variations.add(base_name)
        
        # Remove any empty strings
        variations = {v for v in variations if v and v.strip()}
        
        return variations
    
    def process_medication_list(self, medications: List[str]) -> List[str]:
        """Process a list of medications and return all variations"""
        all_variations = set()
        
        for med in medications:
            variations = self.generate_variations(med)
            all_variations.update(variations)
        
        return sorted(list(all_variations))
    
    def process_txt_file(self, input_file: str, output_file: str = None):
        """Process medications from text file"""
        try:
            # Read text file
            with open(input_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Clean and filter non-empty lines
            medications = [line.strip() for line in lines if line.strip()]
            
            print(f"Read {len(medications)} medications from {input_file}")
            
            # Process medications
            processed_meds = self.process_medication_list(medications)
            
            # Set output file name if not provided
            if output_file is None:
                output_file = input_file.replace('.txt', '_processed.txt')
            
            # Save to text file
            with open(output_file, 'w', encoding='utf-8') as f:
                for med in processed_meds:
                    f.write(med + '\n')
            
            print(f"Processed {len(medications)} original medications")
            print(f"Generated {len(processed_meds)} total variations")
            print(f"Results saved to {output_file}")
            
            return processed_meds
            
        except FileNotFoundError:
            print(f"Error: File '{input_file}' not found")
        except Exception as e:
            print(f"Error processing file: {e}")
    
    def process_csv(self, input_file: str, output_file: str, med_column: str = 'medication'):
        """Process medications from CSV file"""
        try:
            # Read CSV
            df = pd.read_csv(input_file)
            
            if med_column not in df.columns:
                raise ValueError(f"Column '{med_column}' not found in CSV")
            
            # Get unique medications
            medications = df[med_column].dropna().unique().tolist()
            
            # Process medications
            processed_meds = self.process_medication_list(medications)
            
            # Create output DataFrame
            output_df = pd.DataFrame({'medication': processed_meds})
            
            # Save to CSV
            output_df.to_csv(output_file, index=False)
            
            print(f"Processed {len(medications)} original medications")
            print(f"Generated {len(processed_meds)} total variations")
            print(f"Results saved to {output_file}")
            
        except Exception as e:
            print(f"Error processing CSV: {e}")

# Example usage and testing
def main():
    processor = MedicationProcessor()
    
    # Example: Process medicines_final.txt
    print("Processing medicines_final.txt...")
    print("=" * 50)
    
    # Uncomment the line below to process your actual file
    processor.process_txt_file('medicines_final.txt')
    
    # Test with sample medications for demonstration
    sample_meds = [
        "Amoxycillin 500mg Capsule",
        "Paracetamol 250mg Tablet",
        "Insulin 10IU Injection",
        "Hydrocortisone 0.5% Cream",
        "Vitamin D BL 40 Drops",
        "Cough Syrup 100ml Solution"
    ]
    
    print("Sample Processing (for demonstration):")
    print("=" * 50)
    
    for med in sample_meds:
        variations = processor.generate_variations(med)
        print(f"\nOriginal: {med}")
        print("Variations:")
        for i, var in enumerate(sorted(variations), 1):
            print(f"  {i}. {var}")
    
    print("\n" + "=" * 50)
    print("All Unique Medications:")
    print("=" * 50)
    
    all_processed = processor.process_medication_list(sample_meds)
    for i, med in enumerate(all_processed, 1):
        print(f"{i:2d}. {med}")

if __name__ == "__main__":
    main()

# Usage instructions:
"""
To use this program with your medicines_final.txt file:

1. For your text file:
   processor = MedicationProcessor()
   processor.process_txt_file('medicines_final.txt')
   # This will create medicines_final_processed.txt with all variations

2. You can also specify a custom output file:
   processor.process_txt_file('medicines_final.txt', 'expanded_medicines.txt')

3. For individual medication processing:
   processor = MedicationProcessor()
   variations = processor.generate_variations("Amoxycillin 500mg Capsule")

4. To process and get results in memory:
   processor = MedicationProcessor()
   with open('medicines_final.txt', 'r') as f:
       medications = [line.strip() for line in f if line.strip()]
   processed = processor.process_medication_list(medications)
"""