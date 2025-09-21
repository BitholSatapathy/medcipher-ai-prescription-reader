export class HtmlRenderer {
    static renderPatientInfo(patientInfo) {
        const fields = [
            { key: 'name', label: 'Name' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'clinic', label: 'Clinic' },
            { key: 'address', label: 'Address' },
            { key: 'date', label: 'Date Issued' }
        ];

        const infoItems = fields.map(field => 
            this._renderInfoItem(field.label, patientInfo[field.key])
        ).join('');

        return `
            <div class="section-card">
                <h3 class="section-title">Patient Information</h3>
                <div class="info-grid">
                    ${infoItems}
                </div>
            </div>
        `;
    }

    static renderMedications(medications) {
        if (!medications || medications.length === 0) {
            return this._renderEmptyMedications();
        }

        const medicationItems = medications.map(med => 
            this._renderMedicationItem(med)
        ).join('');

        return `
            <div class="section-card">
                <h3 class="section-title">Medication Details</h3>
                <div class="medication-list">
                    ${medicationItems}
                </div>
            </div>
        `;
    }

    static renderOtherNotes(otherNotes) {
        if (!otherNotes || Object.keys(otherNotes).length === 0) {
            return this._renderEmptyOtherNotes();
        }

        const noteItems = [];
        
        if (otherNotes.refills) {
            noteItems.push(this._renderInfoItem('Refills', otherNotes.refills));
        }
        
        if (otherNotes.label) {
            noteItems.push(this._renderInfoItem('Label', otherNotes.label));
        }

        return `
            <div class="section-card">
                <h3 class="section-title">Refill Information</h3>
                <div class="info-grid">
                    ${noteItems.join('')}
                </div>
                <p class="note-text">Please contact your doctor or clinic to request a refill. Refills are not available online for this prescription.</p>
                <button class="contact-button">Contact Clinic for Refill!</button>
            </div>
        `;
    }

    static renderDebugInfo(extractedText, cleanedText, patientInfo, medications, otherNotes) {
        return `
            <div class="debug-container">
                <h3 class="debug-title">⚠️ Parsing Failed - Debug Information</h3>
                <p class="debug-message">Could not extract prescription details. Here's the raw data for debugging:</p>

                <details class="debug-details">
                    <summary class="debug-summary">🔍 Original AI Response</summary>
                    <pre class="debug-pre">${this._escapeHtml(extractedText)}</pre>
                </details>

                <details class="debug-details">
                    <summary class="debug-summary">🧹 Cleaned Text</summary>
                    <pre class="debug-pre">${this._escapeHtml(cleanedText)}</pre>
                </details>

                <details class="debug-details">
                    <summary class="debug-summary">🔧 Parsing Results</summary>
                    <div class="debug-results">
                        <p><strong>Patient Info Found:</strong></p>
                        <pre>${this._escapeHtml(JSON.stringify(patientInfo, null, 2))}</pre>
                        <p><strong>Medications Found:</strong></p>
                        <pre>${this._escapeHtml(JSON.stringify(medications, null, 2))}</pre>
                        <p><strong>Other Notes Found:</strong></p>
                        <pre>${this._escapeHtml(JSON.stringify(otherNotes, null, 2))}</pre>
                    </div>
                </details>
            </div>
        `;
    }

    static renderError(errorMessage) {
        return `
            <div class="error-container">
                <h3 class="error-title">❌ Error</h3>
                <p class="error-message">${this._escapeHtml(errorMessage)}</p>
            </div>
        `;
    }

    // Private helper methods
    static _renderInfoItem(label, value) {
        return `
            <div class="info-item">
                <span class="info-label">${label}:</span>
                <span class="info-value">${value || 'N/A'}</span>
            </div>
        `;
    }

    static _renderMedicationItem(medication) {
        const optionalFields = [];
        
        if (medication.duration) {
            optionalFields.push(`
                <div class="medication-detail-item">
                    <span class="medication-label">Duration:</span>
                    <span class="medication-value">${medication.duration}</span>
                </div>
            `);
        }
        
        if (medication.instructions) {
            optionalFields.push(`
                <div class="medication-detail-item medication-instructions">
                    <span class="medication-label">Instructions:</span>
                    <span class="medication-value">${medication.instructions}</span>
                </div>
            `);
        }

        return `
            <div class="medication-item">
                <h4 class="medication-name">${medication.name || 'Unknown Medication'}</h4>
                <div class="medication-details-grid">
                    <div class="medication-detail-item">
                        <span class="medication-label">Dosage:</span>
                        <span class="medication-value">${medication.dosage || 'N/A'}</span>
                    </div>
                    <div class="medication-detail-item">
                        <span class="medication-label">Frequency:</span>
                        <span class="medication-value">${medication.frequency || 'N/A'}</span>
                    </div>
                    ${optionalFields.join('')}
                </div>
            </div>
        `;
    }

    static _renderEmptyMedications() {
        return `
            <div class="section-card">
                <h3 class="section-title">Medication Details</h3>
                <p class="alert-message">No medications found in the prescription text.</p>
            </div>
        `;
    }

    static _renderEmptyOtherNotes() {
        return `
            <div class="section-card">
                <h3 class="section-title">Refill Information</h3>
                <p class="alert-message">No refill information found in the prescription.</p>
            </div>
        `;
    }

    static _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}