import os
import sys
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from symspellpy import SymSpell, Verbosity

app = Flask(__name__)
CORS(app)
sym_spell = None
full_med_map = {} 

base_name_to_full_names_map = {}

MEDS_FILE_PATH = r"D:\project\Ai_medical_prescribe-main\aimedicalthingi\Temp_database\medicines_V3.txt"
MIN_SUGGESTION_CONFIDENCE = 0.1


def get_base_name(med_name):
    name = re.sub(
        r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|iu|units?|bl\s*\d+)\b",
        "",
        med_name,
        flags=re.IGNORECASE
    )
    name = re.sub(
        r"\b(tablet|capsule|injection|syrup|cream|ointment|drop|solution|suspension|powder|gel|lotion|spray|patch|vial)\b",
        "",
        name,
        flags=re.IGNORECASE
    )
    # Normalize spaces (multiple spaces to single, trim) and lowercase
    return " ".join(name.split()).strip().lower()


def has_dosage(text):
    return bool(re.search(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|%|iu|units?|bl\s*\d+)\b", text, flags=re.IGNORECASE))

def calculate_max_edit_distance_for_lookup(query_length):
    if query_length <= 5:
        return 1
    elif query_length <= 8:
        return 2
    elif query_length <= 12:
        return 3
    else:
        return 4 

def load_medicine_names(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            med_names = [line.strip() for line in f if line.strip()]
        print(f"Loaded {len(med_names)} raw medicine names from {filepath}")
        return med_names
    except FileNotFoundError:
        print(f"Error: Medicine file '{filepath}' not found.", file=sys.stderr)
        return []
    except Exception as e:
        print(f"Error reading medicine file: {e}", file=sys.stderr)
        return []


def initialize_symspell():

    global sym_spell, full_med_map, base_name_to_full_names_map
    if sym_spell is not None:
        print("SymSpell already initialized.")
        return True

    print("Initializing SymSpell dictionary and mappings (this may take a moment for 2L entries)...")
    medicine_names_raw = load_medicine_names(MEDS_FILE_PATH)
    if not medicine_names_raw:
        print("Error: No medicines loaded. SymSpell cannot be initialized.", file=sys.stderr)
        return False
    sym_spell = SymSpell(max_dictionary_edit_distance=4, prefix_length=7)
    added_to_symspell_lower = set()

    for original_name in medicine_names_raw:
        lower_name = original_name.lower()
        if lower_name not in added_to_symspell_lower:
            sym_spell.create_dictionary_entry(original_name, 1) 
            added_to_symspell_lower.add(lower_name)
            full_med_map[lower_name] = original_name
        base_name = get_base_name(original_name)
        if base_name and base_name != lower_name:

            if base_name not in added_to_symspell_lower:
                sym_spell.create_dictionary_entry(base_name, 1)
                added_to_symspell_lower.add(base_name)
            if base_name not in base_name_to_full_names_map:
                base_name_to_full_names_map[base_name] = []
            if original_name not in base_name_to_full_names_map[base_name]: 
                base_name_to_full_names_map[base_name].append(original_name)

    print(f"SymSpell dictionary loaded with {len(sym_spell.words)} entries (full names & unique base names).")
    print(f"Full medication map has {len(full_med_map)} entries.")
    print(f"Base to full names map has {len(base_name_to_full_names_map)} entries.")
    return True

with app.app_context():
    initialize_symspell()


@app.route("/suggest_medicine", methods=["POST"])
def suggest_medicine():
    """
    API endpoint to suggest a medicine name based on user input.
    Applies strict confidence thresholding.
    """
    if sym_spell is None:
        return jsonify({"error": "SymSpell dictionary not initialized."}), 500

    data = request.get_json()
    input_term = data.get("term", "").strip()
    if not input_term:
        print("  No 'term' provided in request. Returning empty.")
        return jsonify([]) 

    print(f"\n--- SUGGESTION REQUEST FOR: '{input_term}' ---")

    try:
        input_term_lower = input_term.lower()
        is_input_with_dosage = has_dosage(input_term)

        if is_input_with_dosage:
            lookup_query = input_term_lower
            print(f"  Input has dosage. Querying full term: '{lookup_query}'")
        else:
            lookup_query = get_base_name(input_term)
            if not lookup_query: 
                lookup_query = input_term_lower
            print(f"  Input has no dosage. Querying base name: '{lookup_query}'")

        if not lookup_query: 
            print("  Processed query became empty. Returning empty result.")
            return jsonify([])

        max_dist_for_lookup = calculate_max_edit_distance_for_lookup(len(lookup_query))

        suggestions = sym_spell.lookup(
            lookup_query,
            Verbosity.CLOSEST, 
            max_edit_distance=max_dist_for_lookup,
            transfer_casing=False 
        )

        best_match_term = ""
        best_match_confidence = 0.0
        method = "no_match_found"
        alternatives_output = [] 

        if suggestions:
            best_raw_suggestion = suggestions[0]
            current_confidence = 1 - (best_raw_suggestion.distance / max(1, max_dist_for_lookup))

            print(f"  SymSpell best raw suggestion: '{best_raw_suggestion.term}' (distance={best_raw_suggestion.distance}, raw_confidence={current_confidence:.2f})")

            if current_confidence >= MIN_SUGGESTION_CONFIDENCE:
                matched_symspell_term_lower = best_raw_suggestion.term.lower()
                if matched_symspell_term_lower in full_med_map:
                    best_match_term = full_med_map[matched_symspell_term_lower]
                    method = "direct_full_name_match"
                    print(f"  Matched directly to a full name: '{best_match_term}'")
                elif matched_symspell_term_lower in base_name_to_full_names_map:
                    possible_full_names = base_name_to_full_names_map[matched_symspell_term_lower]
                    if possible_full_names:
                        best_match_term = possible_full_names[0]
                        method = "base_name_mapped_to_full"
                        print(f"  Matched to base name. Mapped to full name: '{best_match_term}'")
                    else:
                        best_match_term = best_raw_suggestion.term 
                        method = "base_match_no_full_mapping"
                        print(f"  Matched to base name, but no full mapping found. Returning raw match: '{best_match_term}'")
                else:
                    best_match_term = best_raw_suggestion.term 
                    method = "unclassified_symspell_match"
                    print(f"  Matched unclassified term: '{best_match_term}'")

                best_match_confidence = current_confidence
                seen_terms_for_alternatives = {best_match_term.lower()} 
                for s in suggestions[1:4]:
                    alt_confidence = 1 - (s.distance / max(1, max_dist_for_lookup))
                    if alt_confidence >= MIN_SUGGESTION_CONFIDENCE:
                        alt_term_lower = s.term.lower()
                        final_alt_term = s.term 

                        if alt_term_lower in full_med_map:
                            final_alt_term = full_med_map[alt_term_lower]
                        elif alt_term_lower in base_name_to_full_names_map:
                            if base_name_to_full_names_map[alt_term_lower]:
                                final_alt_term = base_name_to_full_names_map[alt_term_lower][0]
                        
                        if final_alt_term.lower() not in seen_terms_for_alternatives:
                            alternatives_output.append({
                                "term": final_alt_term,
                                "confidence": round(alt_confidence, 2)
                            })
                            seen_terms_for_alternatives.add(final_alt_term.lower())
                    else:
                        print(f"  Skipping alternative '{s.term}' due to low confidence ({alt_confidence:.2f})")

                alternatives_output.sort(key=lambda x: x['confidence'], reverse=True)
            else:
                print(f"  Best raw suggestion '{best_raw_suggestion.term}' has confidence {current_confidence:.2f}, which is below threshold {MIN_SUGGESTION_CONFIDENCE}. No match returned.")
        else:
            print(f"  No suggestions found by SymSpell for '{lookup_query}'. Returning empty.")

        if not best_match_term:
            return jsonify([])
        return jsonify([{
            "term": best_match_term,
            "confidence": round(best_match_confidence, 2),
            "method": method,
            "alternatives": alternatives_output
        }])

    except Exception as e:
        print(f"An unexpected error occurred during suggestion processing: {e}", file=sys.stderr)
        return jsonify({"error": str(e), "message": "Internal server error during suggestion processing."}), 500


@app.route("/batch_suggest", methods=["POST"])
def batch_suggest():
    if sym_spell is None:
        return jsonify({"error": "SymSpell dictionary not initialized."}), 500

    data = request.get_json()
    terms = data.get("terms", [])
    if not terms:
        return jsonify({"error": "No 'terms' list provided"}), 400

    results = []
    for term in terms:
        with app.test_request_context("/suggest_medicine", method="POST", json={"term": term}):
            response = suggest_medicine()
            if response.status_code == 200 and isinstance(response.get_json(), list) and len(response.get_json()) > 0:
                results.append(response.get_json()[0]["term"])
            else:
                results.append("")
    return jsonify(results)


@app.route("/health", methods=["GET"])
def health_check():
    """API endpoint for health checks."""
    return jsonify({
        "status": "ok",
        "symspell_initialized": sym_spell is not None,
        "symspell_dictionary_size": len(sym_spell.words) if sym_spell else 0,
        "full_med_map_size": len(full_med_map) if full_med_map else 0,
        "base_to_full_names_map_size": len(base_name_to_full_names_map) if base_name_to_full_names_map else 0,
        "medicine_file": MEDS_FILE_PATH,
        "min_suggestion_confidence_threshold": MIN_SUGGESTION_CONFIDENCE
    }), 200

if __name__ == "__main__":
    if not os.path.exists(MEDS_FILE_PATH):
        print(f"Warning: Medicine file not found at {MEDS_FILE_PATH}. Please ensure it exists.", file=sys.stderr)
    print("\nStarting Flask server...")
    app.run(debug=True, port=5000)