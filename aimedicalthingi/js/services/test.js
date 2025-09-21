import { MedicineApiService } from './medicine-api.service.js';

const medicineApi = new MedicineApiService();

async function runTests() {
    console.log("--- Starting API Tests ---");

    // Test Cases
    const testCases = [
        "Paracetmol",      // Typo
        "Las Honten BL 40", // some f-ed up shit gemini gave      
        "Amoxcillin",      // Typo
        "Lorattadin",      // Typo
        "Aspirine",        // Typo
        "Cetrizine",       // Typo
        "Omeprazole",      // Correct
        "Metformin",       // Correct
        "Ventolin",        // Correct
        "Zantac",          // Correct
        "para",            // Partial match
        "paracetamol 500mg", // Dosage
        "parasetamol 250mg"  // Typo with dosage
    ];

    // --- Individual Suggestion Tests ---
    console.log("\n--- Individual Suggestion Tests ---");
    for (const term of testCases) {
        console.log(`\nTesting: "${term}"`);
        try {
            const suggestedTerm = await medicineApi.getSuggestions(term);
            console.log(`  Original: "${term}" -> Suggested: "${suggestedTerm}"`);
            if (suggestedTerm === term) {
                console.log(`  (Note: API returned original term, possibly no good match or already correct)`);
            }
        } catch (error) {
            console.error(`  Error for "${term}":`, error.message);
        }
    }

    console.log("\nBatch Suggestion Test ");
    try {
        console.log(`\nBatch testing: [${testCases.map(t => `"${t}"`).join(', ')}]`);
        const batchResults = await medicineApi.batchGetSuggestions(testCases);
        console.log("Batch Results:");
        batchResults.forEach((result, index) => {
            console.log(`  Original: "${testCases[index]}" -> Suggested: "${result}"`);
        });
    } catch (error) {
        console.error("Error during batch suggestion test:", error.message);
    }

    console.log("\n Health Check Test");
    try {
        const healthResponse = await fetch('http://127.0.0.1:5000/health');
        const healthData = await healthResponse.json();
        console.log("Health Check Status:", healthData);
    } catch (error) {
        console.error("Error fetching health status:", error.message);
    }

    console.log("\n--- API Tests Complete ---");
}

// Run the tests
runTests();