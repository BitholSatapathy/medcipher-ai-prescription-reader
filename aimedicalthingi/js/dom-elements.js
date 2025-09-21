export const elements = {
  currentYear: document.getElementById("currentYear"),
  prescriptionModal: document.getElementById("prescriptionModal"),
  prescriptionDetailsDiv: document.getElementById("prescriptionDetails"),
  loadingIndicator: document.getElementById("loadingIndicator"),
  fileInputs: [
    document.getElementById("prescriptionUploadNav"),
    document.getElementById("prescriptionUploadHero"),
    document.getElementById("prescriptionUploadCTA"),
  ],
};

export function openModal() {
  elements.prescriptionModal.classList.add("is-visible");
}

export function closeModal() {
  elements.prescriptionModal.classList.remove("is-visible");
}

export function showLoading(
  message = "Processing Prescription... Please Wait."
) {
  elements.loadingIndicator.classList.add("is-visible");
}

export function hideLoading() {
  elements.loadingIndicator.classList.remove("is-visible");
}

export function setPrescriptionDetails(htmlContent) {
  const prescriptionDetailsDiv = elements.prescriptionDetailsDiv;

  // Check if it's empty state content
  const isEmpty =
    !htmlContent ||
    htmlContent.includes("Processing") ||
    htmlContent.includes("Upload and analyze") ||
    htmlContent.includes("No details extracted") ||
    htmlContent.trim().length < 100;

  if (isEmpty) {
    // Show empty state
    prescriptionDetailsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📄</div>
                <p>Upload and analyze a prescription to see detailed results here</p>
            </div>
        `;
  } else {
    // Show actual content
    prescriptionDetailsDiv.innerHTML = htmlContent;
  }

  // Show/hide PDF button based on whether there are actual results
  const pdfButton = document.getElementById("downloadPdfButton");
  if (pdfButton) {
    pdfButton.style.display = isEmpty ? "none" : "inline-block";
  }
}

if (elements.currentYear) {
  elements.currentYear.textContent = new Date().getFullYear();
}
