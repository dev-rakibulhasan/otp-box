const phoneNumbersTextarea = document.getElementById("phoneNumbers");
const phoneCountSpan = document.getElementById("phoneCount");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusDiv = document.getElementById("status");
const progressDiv = document.getElementById("progress");
const logDiv = document.getElementById("log");
const clearLogBtn = document.getElementById("clearLogBtn");

let isRunning = false;

// Update phone count
phoneNumbersTextarea.addEventListener("input", () => {
  const phones = getPhoneNumbers();
  phoneCountSpan.textContent = phones.length;
});

// Get phone numbers from textarea
function getPhoneNumbers() {
  const text = phoneNumbersTextarea.value.trim();
  if (!text) return [];
  return text
    .split("\n")
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);
}

// Add log entry
function addLog(message, type = "info") {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Clear log
clearLogBtn.addEventListener("click", () => {
  logDiv.innerHTML = "";
});

// Update status
function updateStatus(status, isRunningState = false) {
  statusDiv.textContent = status;
  statusDiv.className = isRunningState
    ? "status-value running"
    : status === "Stopped"
    ? "status-value stopped"
    : "status-value";
}

// Update progress
function updateProgress(current, total) {
  progressDiv.textContent = `${current} / ${total}`;
}

// Start button handler
startBtn.addEventListener("click", async () => {
  // Check license first
  checkLicense((license) => {
    if (!license) {
      showModal(
        "License Required",
        "Please activate a valid license to use this feature.",
        true
      );
      return;
    }

    if (license.isExpired) {
      const expireDate = new Date(license.expire_date).toLocaleDateString();
      showModal(
        "License Expired",
        `Your license expired on ${expireDate}. Please renew your license to continue.`,
        true
      );
      return;
    }

    const phones = getPhoneNumbers();

    if (phones.length === 0) {
      addLog("Please enter at least one phone number", "error");
      return;
    }

    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    phoneNumbersTextarea.disabled = true;

    updateStatus("Running...", true);
    updateProgress(0, phones.length);
    addLog(`Starting automation with ${phones.length} phone numbers`, "info");

    // Send message to background script to start the process
    chrome.runtime.sendMessage({
      action: "startAutomation",
      phones: phones,
    });
  });
});

// Stop button handler
stopBtn.addEventListener("click", () => {
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  phoneNumbersTextarea.disabled = false;

  updateStatus("Stopped", false);
  addLog("Automation stopped by user", "warning");

  // Send message to background script to stop
  chrome.runtime.sendMessage({
    action: "stopAutomation",
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateLog") {
    addLog(message.message, message.type || "info");
  } else if (message.action === "updateProgress") {
    updateProgress(message.current, message.total);
  } else if (message.action === "updateStatus") {
    updateStatus(message.status, message.isRunning);
  } else if (message.action === "automationComplete") {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    phoneNumbersTextarea.disabled = false;
    updateStatus("Completed", false);
    addLog("All phone numbers processed!", "success");
  } else if (message.action === "automationStopped") {
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    phoneNumbersTextarea.disabled = false;
    updateStatus("Stopped", false);
  }
});

// Load saved state on popup open
chrome.storage.local.get(
  ["isRunning", "currentProgress", "totalPhones"],
  (result) => {
    if (result.isRunning) {
      isRunning = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      phoneNumbersTextarea.disabled = true;
      updateStatus("Running...", true);
      if (
        result.currentProgress !== undefined &&
        result.totalPhones !== undefined
      ) {
        updateProgress(result.currentProgress, result.totalPhones);
      }
    }
  }
);

// ============================================
// LICENSE MANAGEMENT
// ============================================

const API_ENDPOINT =
  "http://localhost/rh-license/index.php/wp-json/rh-license/verify";
const PRODUCT_NAME = "OTP Box";
const STORAGE_KEY = "obLD";

// Encryption/Decryption functions
function encryptData(data) {
  return btoa(JSON.stringify(data));
}

function decryptData(encryptedData) {
  try {
    return JSON.parse(atob(encryptedData));
  } catch (e) {
    return null;
  }
}

// Tab switching
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.dataset.tab;

    // Remove active class from all tabs
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    // Add active class to clicked tab
    btn.classList.add("active");
    document.getElementById(tabName + "Tab").classList.add("active");
  });
});

// License elements
const licenseKeyInput = document.getElementById("licenseKey");
const verifyLicenseBtn = document.getElementById("verifyLicenseBtn");
const licenseStatus = document.getElementById("licenseStatus");
const licenseInfo = document.getElementById("licenseInfo");
const deactivateLicenseBtn = document.getElementById("deactivateLicenseBtn");

// License info elements
const licenseName = document.getElementById("licenseName");
const licenseEmail = document.getElementById("licenseEmail");
const licenseProduct = document.getElementById("licenseProduct");
const licenseExpire = document.getElementById("licenseExpire");
const licenseStatusText = document.getElementById("licenseStatusText");

// Modal elements
const licenseModal = document.getElementById("licenseModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalAction = document.getElementById("modalAction");

// Load license on startup
loadLicense();

// Verify license button
verifyLicenseBtn.addEventListener("click", async () => {
  const licenseKey = licenseKeyInput.value.trim();

  if (!licenseKey) {
    showModal("Error", "Please enter a license key.", false);
    return;
  }

  verifyLicenseBtn.disabled = true;
  verifyLicenseBtn.textContent = "Verifying...";

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        license_key: licenseKey,
        product_name: PRODUCT_NAME,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Save license data encrypted
      const licenseData = {
        key: licenseKey,
        name: data.license.person_name,
        email: data.license.email,
        product_id: data.license.product_id,
        expire_date: data.license.expire_date,
        activated_at: new Date().toISOString(),
      };

      chrome.storage.local.set(
        { [STORAGE_KEY]: encryptData(licenseData) },
        () => {
          loadLicense();
          showModal("Success", "License activated successfully!", false);
          licenseKeyInput.value = "";
        }
      );
    } else {
      showModal("Error", data.message || "License verification failed.", false);
    }
  } catch (error) {
    showModal(
      "Error",
      "Failed to connect to license server: " + error.message,
      false
    );
  } finally {
    verifyLicenseBtn.disabled = false;
    verifyLicenseBtn.innerHTML =
      '<span class="btn-icon">✓</span> Verify License';
  }
});

// Deactivate license button
deactivateLicenseBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to deactivate this license?")) {
    chrome.storage.local.remove(STORAGE_KEY, () => {
      loadLicense();
      showModal("Success", "License deactivated successfully.", false);
    });
  }
});

// Load and display license
function loadLicense() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const encryptedData = result[STORAGE_KEY];

    if (!encryptedData) {
      // No license
      licenseStatus.className = "license-status";
      licenseStatus.innerHTML = `
        <div class="status-icon">🔒</div>
        <div class="status-text">No license activated</div>
      `;
      licenseInfo.classList.add("hidden");
      return;
    }

    const license = decryptData(encryptedData);

    if (!license) {
      chrome.storage.local.remove(STORAGE_KEY, () => {
        loadLicense();
      });
      return;
    }

    // Check if expired
    const isExpired =
      license.expire_date !== "Never" &&
      new Date() > new Date(license.expire_date);

    if (isExpired) {
      licenseStatus.className = "license-status expired";
      licenseStatus.innerHTML = `
      <div class="status-icon">⚠️</div>
      <div class="status-text">License Expired</div>
    `;
    } else {
      licenseStatus.className = "license-status active";
      licenseStatus.innerHTML = `
      <div class="status-icon">✓</div>
      <div class="status-text">License Active</div>
    `;
    }

    // Display license info
    licenseName.textContent = license.name;
    licenseEmail.textContent = license.email;
    licenseProduct.textContent = PRODUCT_NAME;
    licenseExpire.textContent = license.expire_date;
    licenseStatusText.textContent = isExpired ? "Expired" : "Active";
    licenseStatusText.style.color = isExpired ? "#f44336" : "#4CAF50";

    licenseInfo.classList.remove("hidden");
  });
}

// Check license status (async with callback)
function checkLicense(callback) {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const encryptedData = result[STORAGE_KEY];

    if (!encryptedData) {
      callback(null);
      return;
    }

    const license = decryptData(encryptedData);

    if (!license) {
      chrome.storage.local.remove(STORAGE_KEY, () => {
        callback(null);
      });
      return;
    }

    // Check if expired
    const isExpired =
      license.expire_date !== "Never" &&
      new Date() > new Date(license.expire_date);

    callback({ ...license, isExpired });
  });
}

// Show modal
function showModal(title, message, showActionButton) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;

  if (showActionButton) {
    modalAction.classList.remove("hidden");
  } else {
    modalAction.classList.add("hidden");
  }

  licenseModal.classList.remove("hidden");
}

// Close modal
function closeModal() {
  licenseModal.classList.add("hidden");
}

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);

modalAction.addEventListener("click", () => {
  closeModal();
  // Switch to license tab
  document.querySelector('.tab-btn[data-tab="license"]').click();
});

// Close modal on outside click
licenseModal.addEventListener("click", (e) => {
  if (e.target === licenseModal) {
    closeModal();
  }
});
