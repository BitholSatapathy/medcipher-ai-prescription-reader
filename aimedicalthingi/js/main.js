import {
  elements,
  openModal,
  closeModal,
  showLoading,
  hideLoading,
  setPrescriptionDetails,
} from "./dom-elements.js";
import { ApiService } from "./services/api.service.js";

import { HtmlRenderer } from "./renderers/html-renderer.js";

const GEMINI_API_KEY = "AIzaSyA3F0kFruG8GDlVv18l23rl6WQCo71gUoI";
const MEDICINE_API_URL = "http://127.0.0.1:5000";

// Instance of ApiService
const apiService = new ApiService(GEMINI_API_KEY, MEDICINE_API_URL);

// Global variable to store selected file
let selectedFile = null;

// Event listeners for file inputs - only show filename, don't process
elements.fileInputs.forEach((input) => {
  input.addEventListener("change", (event) => {
    selectedFile = event.target.files[0];
    // Show file name only
    if (window.showFileName) {
      window.showFileName(event);
    }
    // Don't process the file yet
  });
});

// Event listener for analyze button
document.addEventListener("DOMContentLoaded", () => {
  const analyzeButton = document.getElementById("analyzeBtn");
  if (analyzeButton) {
    analyzeButton.addEventListener("click", () => {
      if (selectedFile) {
        // Create a fake event object with the selected file
        const fakeEvent = {
          target: {
            files: [selectedFile],
          },
        };
        handleImageUpload(fakeEvent);
      } else {
        alert("Please select a prescription image first.");
      }
    });
  }

  const modalCloseSpan = document.getElementById("modalCloseSpan");
  if (modalCloseSpan) {
    modalCloseSpan.addEventListener("click", closeModal);
  }

  const modalCloseButton = document.getElementById("modalCloseButton");
  if (modalCloseButton) {
    modalCloseButton.addEventListener("click", closeModal);
  }
});

window.addEventListener("click", (event) => {
  if (event.target === elements.prescriptionModal) {
    closeModal();
  }
});

async function handleImageUpload(event) {
  console.log("handleImageUpload called", event);
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setPrescriptionDetails(
      '<p class="text-red-400">Error: Please select a valid image file.</p>'
    );
    openModal();
    return;
  }

  setPrescriptionDetails("<p>Processing your prescription...</p>");
  openModal();

  try {
    // Complete pipeline in ApiService:
    // 1. Image → Gemini API (text extraction)
    // 2. Raw text → Formatter (initial formatting)
    // 3. Extract medicine names
    // 4. Medicine API (spell checking)
    // 5. Replace corrected names
    // 6. Final formatting → HTML
    const finalFormattedHtml = await apiService.analyzePrescriptionImage(file);
    setPrescriptionDetails(finalFormattedHtml);

    console.log("Prescription processing pipeline completed successfully");
  } catch (error) {
    console.error("Error during prescription processing pipeline:", error);
    const errorMessage = getErrorMessage(error);
    setPrescriptionDetails(
      `<p class="text-red-400">Error: ${errorMessage}</p>`
    );
  } finally {
    hideLoading();
  }
  event.target.value = null;
}

function getErrorMessage(error) {
  const errorMessage = error.message || "Unknown error occurred";

  if (errorMessage.includes("Failed to process prescription")) {
    return "Unable to process the prescription. Please ensure the image is clear and try again.";
  }

  if (errorMessage.includes("Failed to analyze prescription image")) {
    return "Unable to analyze the prescription image. Please ensure the image is clear and try again.";
  }

  if (errorMessage.includes("File must be an image")) {
    return "Please select a valid image file (JPG, PNG, etc.).";
  }

  if (errorMessage.includes("No file provided")) {
        return 'No file was selected. Please choose an image file.';
    }
    
    if (errorMessage.includes('Failed to read file')) {
        return 'Unable to read the selected file. Please try again with a different image.';
    }
    
    if (errorMessage.includes('Gemini API key is required')) {
        return 'Configuration error. Please refresh the page and try again.';
    }
    
    if (errorMessage.includes('Medicine API URL is required')) {
        return 'Medicine database unavailable. Please try again later.';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return 'Network error. Please check your internet connection and try again.';
    }
    return 'Failed to process prescription. Please try again.';
}

function initializeDragAndDrop() {
    elements.fileInputs.forEach(input => {
        const dropZone = input.closest('.upload-area') || input.parentElement;
        
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
                document.body.addEventListener(eventName, preventDefaults, false);
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });
            
            // Handle dropped files
            dropZone.addEventListener('drop', handleDrop, false);
        }
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.currentTarget.classList.add('drag-over');
}

function unhighlight(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const fileInput = e.currentTarget.querySelector('input[type="file"]');
        if (fileInput) {
            const event = { target: { files: files, value: null } };
            handleImageUpload(event);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initializeDragAndDrop();
    initializePdfDownload();
});

// PDF Generation Functions
function initializePdfDownload() {
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', generatePDF);
    }
}

async function generatePDF() {
    if (!selectedFile) {
        alert('No prescription image available for PDF generation.');
        return;
    }

    const prescriptionDetails = document.getElementById('prescriptionDetails');
    if (!prescriptionDetails || prescriptionDetails.textContent.includes('No details extracted yet')) {
        alert('No prescription analysis data available. Please analyze a prescription first.');
        return;
    }

    try {
        // Show loading state
        const downloadButton = document.getElementById('downloadPdfButton');
        const originalText = downloadButton.textContent;
        downloadButton.textContent = '⏳ Generating PDF...';
        downloadButton.disabled = true;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Page 1: Prescription Image
        await addImageToPDF(pdf, selectedFile);
        
        // Page 2: Extracted Information
        pdf.addPage();
        await addAnalysisDataToPDF(pdf, prescriptionDetails);
        
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
        const filename = `MedCipher_Prescription_Analysis_${timestamp}.pdf`;
        
        // Download the PDF
        pdf.save(filename);
        
        // Reset button
        downloadButton.textContent = originalText;
        downloadButton.disabled = false;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
        
        // Reset button on error
        const downloadButton = document.getElementById('downloadPdfButton');
        downloadButton.textContent = '📄 Download PDF';
        downloadButton.disabled = false;
    }
}

async function addImageToPDF(pdf, imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const img = new Image();
                img.onload = function() {
                    // Add title and header
                    pdf.setFontSize(20);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('MedCipher - Prescription Analysis', 105, 20, { align: 'center' });
                    
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'normal');
                    pdf.text('Original Prescription Image', 105, 35, { align: 'center' });
                    
                    // Calculate image dimensions to fit on page
                    const pageWidth = 210; // A4 width in mm
                    const pageHeight = 297; // A4 height in mm
                    const margin = 20;
                    const maxWidth = pageWidth - (margin * 2);
                    const maxHeight = pageHeight - 80; // Leave space for header and footer
                    
                    const imgRatio = img.width / img.height;
                    let imgWidth, imgHeight;
                    
                    if (imgRatio > maxWidth / maxHeight) {
                        imgWidth = maxWidth;
                        imgHeight = maxWidth / imgRatio;
                    } else {
                        imgHeight = maxHeight;
                        imgWidth = maxHeight * imgRatio;
                    }
                    
                    const x = (pageWidth - imgWidth) / 2;
                    const y = 45;
                    
                    pdf.addImage(e.target.result, 'JPEG', x, y, imgWidth, imgHeight);
                    
                    // Add footer
                    pdf.setFontSize(10);
                    pdf.setTextColor(128, 128, 128);
                    pdf.text('Generated by MedCipher AI - Page 1 of 2', 105, 280, { align: 'center' });
                    
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
}

async function addAnalysisDataToPDF(pdf, prescriptionDetailsElement) {
    // Add title and header
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('MedCipher - Analysis Results', 105, 20, { align: 'center' });
    
    // Add disclaimer
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100, 100, 100);
    const disclaimerText = 'Important: This AI analysis is a helpful tool, but please verify all information with healthcare professionals.';
    const disclaimerLines = pdf.splitTextToSize(disclaimerText, 170);
    pdf.text(disclaimerLines, 20, 35);
    
    // Extract and format the analysis data
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Extracted Information:', 20, 55);
    
    // Get the formatted content
    const textContent = convertHtmlToFormattedText(prescriptionDetailsElement.innerHTML);
    
    if (!textContent || textContent.trim().length === 0) {
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'normal');
        pdf.text('No prescription data available for PDF export.', 20, 70);
        return;
    }
    
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    
    const lines = textContent.split('\n');
    let yPos = 65;
    const lineHeight = 5;
    const pageHeight = 280; // Leave space for footer
    
    lines.forEach(line => {
        // Check if we need a new page
        if (yPos > pageHeight) {
            pdf.addPage();
            yPos = 20;
        }
        
        const trimmedLine = line.trim();
        if (trimmedLine === '') {
            yPos += lineHeight * 0.5; // Half line height for empty lines
            return;
        }
        
        // Check if this is a section header (contains = signs)
        if (trimmedLine.includes('=')) {
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(12);
            yPos += lineHeight * 0.5; // Extra space before headers
        } else if (trimmedLine.endsWith(':') || /^[A-Z\s]+$/.test(trimmedLine)) {
            // This is likely a section title
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(37, 99, 235); // Blue color for headers
        } else if (trimmedLine.match(/^\d+\./)) {
            // This is a numbered item (medication)
            pdf.setFont(undefined, 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
        } else if (trimmedLine.startsWith('   ')) {
            // This is a sub-item (medication details)
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(80, 80, 80);
        } else {
            // Regular text
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(11);
            pdf.setTextColor(0, 0, 0);
        }
        
        // Split long lines if necessary
        const maxWidth = trimmedLine.startsWith('   ') ? 160 : 170;
        const wrappedLines = pdf.splitTextToSize(trimmedLine, maxWidth);
        
        wrappedLines.forEach((wrappedLine, index) => {
            if (yPos > pageHeight) {
                pdf.addPage();
                yPos = 20;
            }
            
            const xPos = trimmedLine.startsWith('   ') ? 25 : 20; // Indent sub-items
            pdf.text(wrappedLine, xPos, yPos);
            yPos += lineHeight;
        });
        
        yPos += 1; // Small gap between items
    });
    
    // Add footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Generated by MedCipher AI - Page 2 of 2', 105, 290, { align: 'center' });
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 105, 295, { align: 'center' });
}

function convertHtmlToFormattedText(html) {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let formattedText = '';
    
    // Process each section card
    const sectionCards = tempDiv.querySelectorAll('.section-card');
    
    sectionCards.forEach((card, index) => {
        if (index > 0) formattedText += '\n\n';
        
        // Get section title
        const title = card.querySelector('.section-title');
        if (title) {
            const titleText = title.textContent.trim();
            formattedText += `${titleText.toUpperCase()}\n`;
            formattedText += `${'='.repeat(titleText.length)}\n\n`;
        }
        
        // Process info grid (patient information)
        const infoGrid = card.querySelector('.info-grid');
        if (infoGrid) {
            const infoItems = infoGrid.querySelectorAll('.info-item');
            infoItems.forEach(item => {
                const label = item.querySelector('.info-label');
                const value = item.querySelector('.info-value');
                if (label && value) {
                    const labelText = label.textContent.trim().replace(':', '');
                    const valueText = value.textContent.trim();
                    if (valueText && valueText !== 'Not available' && valueText !== 'N/A') {
                        formattedText += `${labelText}: ${valueText}\n`;
                    }
                }
            });
        }
        
        // Process medication list
        const medicationList = card.querySelector('.medication-list');
        if (medicationList) {
            const medications = medicationList.querySelectorAll('.medication-item');
            medications.forEach((med, medIndex) => {
                if (medIndex > 0) formattedText += '\n';
                
                const medName = med.querySelector('.medication-name');
                if (medName) {
                    formattedText += `${medIndex + 1}. ${medName.textContent.trim()}\n`;
                }
                
                const detailsGrid = med.querySelector('.medication-details-grid');
                if (detailsGrid) {
                    const details = detailsGrid.querySelectorAll('.medication-detail-item');
                    details.forEach(detail => {
                        const label = detail.querySelector('.medication-label');
                        const value = detail.querySelector('.medication-value');
                        if (label && value) {
                            const labelText = label.textContent.trim().replace(':', '');
                            const valueText = value.textContent.trim();
                            if (valueText && valueText !== 'Not available' && valueText !== 'N/A') {
                                formattedText += `   ${labelText}: ${valueText}\n`;
                            }
                        }
                    });
                }
            });
        }
        
        // Process other content (like notes)
        const noteText = card.querySelector('.note-text');
        if (noteText) {
            formattedText += `\n${noteText.textContent.trim()}\n`;
        }
    });
    
    // If no structured content found, fall back to cleaning raw text
    if (!formattedText.trim()) {
    let rawText = tempDiv.textContent || tempDiv.innerText || "";
    rawText = rawText
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/þ/g, "")
      .replace(/[^\x20-\x7E\n\r\t]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return rawText;
  }

  return formattedText.trim();
}

console.log("Main.js loaded with pipeline configuration:");
console.log("- Gemini API configured:", !!GEMINI_API_KEY);
console.log("- Medicine API URL:", MEDICINE_API_URL);
console.log("- Pipeline flow: Image → Gemini → Format → Medicine API → Display");
console.log('- Pipeline flow: Image → Gemini → Format → Medicine API → Display');