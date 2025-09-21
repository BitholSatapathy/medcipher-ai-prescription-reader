// Custom integration script to bridge your frontend with existing functionality

// Navbar scroll effect
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// File name display functionality
export function showFileName(event) {
  const fileNameDisplay = document.getElementById("fileName");
  const file = event.target.files[0];

  if (file && fileNameDisplay) {
    fileNameDisplay.textContent = `Selected: ${file.name}`;
    fileNameDisplay.style.color = "#10b981"; // Green color to indicate file is ready
  } else if (fileNameDisplay) {
    fileNameDisplay.textContent = "No file chosen";
    fileNameDisplay.style.color = ""; // Reset to default color
  }
}

// Copy text functionality
export function copyText() {
  const output = document.getElementById("output");
  if (output) {
    const textArea = document.createElement("textarea");
    textArea.value = output.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);

    // Show feedback
    const copyBtn = event.target;
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  }
}

// PDF download functionality (placeholder)
export function downloadPdf() {
    const output = document.getElementById('output');
    if (output) {
        // Create a simple text file for now
        const text = output.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prescription-analysis.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
}

// Make functions globally available
window.showFileName = showFileName;
window.copyText = copyText;
window.downloadPdf = downloadPdf;

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});
