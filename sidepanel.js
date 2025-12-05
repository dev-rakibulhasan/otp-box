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
