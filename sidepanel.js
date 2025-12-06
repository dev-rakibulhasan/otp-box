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

// Update clear button visibility
function updateClearButtonVisibility() {
  if (logDiv.children.length === 0) {
    clearLogBtn.style.display = "none";
  } else {
    clearLogBtn.style.display = "block";
  }
}

// Add log entry
function addLog(message, type = "info") {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;
  updateClearButtonVisibility();
}

// Clear log
clearLogBtn.addEventListener("click", () => {
  logDiv.innerHTML = "";
  updateClearButtonVisibility();
});

// Initialize clear button visibility
updateClearButtonVisibility();

// Update status
function updateStatus(status, isRunningState = false) {
  statusDiv.textContent = status;
  statusDiv.className = isRunningState
    ? "status-value running"
    : status === "Stopped"
    ? "status-value stopped"
    : status === "Completed"
    ? "status-value completed"
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
        true,
        "error"
      );
      return;
    }

    if (license.isExpired) {
      const expireDate = new Date(license.expire_date);
      const day = expireDate.getDate();
      const month = expireDate.toLocaleString("en-US", { month: "short" });
      const year = expireDate.getFullYear();
      const formattedDate = `${day} ${month} ${year}`;
      showModal(
        "License Expired",
        `Your license expired on ${formattedDate}. Please renew your license to continue.`,
        true,
        "error"
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
  "https://shop.rakibulhasan.dev/index.php/wp-json/rh-license/verify";
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

// Load and display version from manifest
const manifestData = chrome.runtime.getManifest();
document.getElementById("appVersion").textContent = manifestData.version;

// Set current year for copyright
document.getElementById("copyrightYear").textContent = new Date().getFullYear();

// Verify license button
verifyLicenseBtn.addEventListener("click", async () => {
  const licenseKey = licenseKeyInput.value.trim();

  if (!licenseKey) {
    showModal("Required", "Please enter a license key.", false, "error");
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
          showModal(
            "Activated",
            "License activated successfully!",
            false,
            "success"
          );
          licenseKeyInput.value = "";
        }
      );
    } else {
      // Handle different error codes with appropriate modal titles and types
      let modalTitle = "Verification Failed";
      let modalType = "error";
      let modalMessage = data.message || "License verification failed.";

      if (data.code) {
        switch (data.code) {
          case "missing_license_key":
            modalTitle = "Required";
            modalMessage = "License key is required.";
            break;
          case "missing_product_name":
            modalTitle = "Configuration Error";
            modalMessage = "Product name is missing.";
            break;
          case "invalid_license":
            modalTitle = "Invalid License";
            modalMessage = "License key not found.";
            break;
          case "invalid_product":
            modalTitle = "Product Error";
            modalMessage = "Product not found for this license.";
            break;
          case "product_mismatch":
            modalTitle = "Product Mismatch";
            modalType = "warning";
            modalMessage =
              data.message || "This license is not valid for this product.";
            break;
          case "license_expired":
            modalTitle = "License Expired";
            modalType = "warning";
            modalMessage = data.message || "This license has expired.";
            break;
          case "license_already_used":
            modalTitle = "Already Used";
            modalType = "warning";
            modalMessage = "This license has already been used.";
            break;
          case "database_error":
            modalTitle = "Server Error";
            modalMessage = "Failed to update license status. Please try again.";
            break;
          default:
            modalTitle = "Verification Failed";
            modalMessage = data.message || "License verification failed.";
        }
      }

      showModal(modalTitle, modalMessage, false, modalType);
    }
  } catch (error) {
    showModal(
      "Connection Failed",
      "Failed to connect to license server: " + error.message,
      false,
      "error"
    );
  } finally {
    verifyLicenseBtn.disabled = false;
    verifyLicenseBtn.innerHTML =
      '<span class="btn-icon">✓</span> Verify License';
  }
});

// Deactivate license button
deactivateLicenseBtn.addEventListener("click", () => {
  showConfirmModal(
    "Deactivate License",
    "Are you sure you want to deactivate this license? You will need to reactivate it to use the extension.",
    "warning",
    () => {
      chrome.storage.local.remove(STORAGE_KEY, () => {
        loadLicense();
        showModal(
          "Success",
          "License deactivated successfully.",
          false,
          "success"
        );
      });
    }
  );
});

// Load and display license
function loadLicense() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const encryptedData = result[STORAGE_KEY];

    if (!encryptedData) {
      // No license
      licenseStatus.className = "license-status";
      licenseStatus.innerHTML = `
        <div class="status-icon" style="color: #9e9e9e;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="status-text" style="color: #757575;">No license activated</div>
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
      <div class="status-icon" style="color: #f44336;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="status-text" style="color: #c62828;">License Expired</div>
    `;
    } else {
      licenseStatus.className = "license-status active";
      licenseStatus.innerHTML = `
      <div class="status-icon" style="color: #4caf50;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <div class="status-text" style="color: #2e7d32;">License Active</div>
    `;
    }

    // Display license info
    licenseName.textContent = license.name;
    licenseEmail.textContent = license.email;
    licenseProduct.textContent = PRODUCT_NAME;

    // Format expire date
    if (license.expire_date === "Never") {
      licenseExpire.textContent = "Never";
    } else {
      const expireDate = new Date(license.expire_date);
      const day = expireDate.getDate();
      const month = expireDate.toLocaleString("en-US", { month: "short" });
      const year = expireDate.getFullYear();
      licenseExpire.textContent = `${day} ${month} ${year}`;
    }

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

// Store modal action callback
let modalActionCallback = null;

// Show modal with type (error, success, info, warning)
function showModal(title, message, showActionButton, type = "info") {
  // Remove all type classes
  licenseModal.classList.remove(
    "modal-error",
    "modal-success",
    "modal-info",
    "modal-warning"
  );

  // Add type class
  licenseModal.classList.add(`modal-${type}`);

  // Get icon based on type
  const icons = {
    error: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    success: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    info: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`,
    warning: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  };

  // Update modal content with icon
  const modalBody = licenseModal.querySelector(".modal-body");
  modalBody.innerHTML = `
    <div class="modal-icon">${icons[type]}</div>
    <p>${message}</p>
  `;

  modalTitle.textContent = title;

  if (showActionButton) {
    modalAction.classList.remove("hidden");
    modalAction.textContent = "Go to License";
    modalAction.className = "btn btn-primary";

    // Set callback to switch to license tab
    modalActionCallback = () => {
      closeModal();
      document.querySelector('.tab-btn[data-tab="license"]').click();
    };
  } else {
    modalAction.classList.add("hidden");
    modalActionCallback = null;
  }

  licenseModal.classList.remove("hidden");
}

// Show confirmation modal with callback
function showConfirmModal(title, message, type = "warning", onConfirm) {
  // Remove all type classes
  licenseModal.classList.remove(
    "modal-error",
    "modal-success",
    "modal-info",
    "modal-warning"
  );

  // Add type class
  licenseModal.classList.add(`modal-${type}`);

  // Get icon based on type
  const icons = {
    error: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    success: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    info: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`,
    warning: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
  };

  // Update modal content with icon
  const modalBody = licenseModal.querySelector(".modal-body");
  modalBody.innerHTML = `
    <div class="modal-icon">${icons[type]}</div>
    <p>${message}</p>
  `;

  modalTitle.textContent = title;

  // Show action button and change it to "Deactivate"
  modalAction.classList.remove("hidden");
  modalAction.textContent = "Deactivate";
  modalAction.className = "btn btn-danger";

  // Set callback for confirmation
  modalActionCallback = () => {
    closeModal();
    if (onConfirm) onConfirm();
  };

  licenseModal.classList.remove("hidden");
}

// Close modal
function closeModal() {
  licenseModal.classList.add("hidden");
}

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);

// Handle modal action button click
modalAction.addEventListener("click", () => {
  if (modalActionCallback) {
    modalActionCallback();
  }
});

// Close modal on outside click
licenseModal.addEventListener("click", (e) => {
  if (e.target === licenseModal) {
    closeModal();
  }
});
