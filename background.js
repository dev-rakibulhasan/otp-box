// Import injected scripts (not obfuscated for chrome.scripting.executeScript compatibility)
importScripts("injected-scripts.js");

let isRunning = false;
let phoneNumbers = [];
let currentIndex = 0;
let currentTabId = null;

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAutomation") {
    startAutomation(message.phones);
  } else if (message.action === "stopAutomation") {
    stopAutomation();
  }
});

// Start automation process
async function startAutomation(phones) {
  isRunning = true;
  phoneNumbers = phones;
  currentIndex = 0;

  // Save state
  await chrome.storage.local.set({
    isRunning: true,
    currentProgress: 0,
    totalPhones: phones.length,
  });

  sendLogToSidePanel("Starting automation process...", "info");
  processNextPhone();
}

// Stop automation
async function stopAutomation() {
  isRunning = false;

  // Close current tab if exists
  if (currentTabId) {
    try {
      await chrome.tabs.remove(currentTabId);
    } catch (e) {
      console.error("Error closing tab:", e);
    }
    currentTabId = null;
  }

  await chrome.storage.local.set({
    isRunning: false,
    currentProgress: 0,
    totalPhones: 0,
  });

  sendMessageToSidePanel({ action: "automationStopped" });
  sendLogToSidePanel("Automation stopped", "warning");
}

// Process next phone in the list
async function processNextPhone() {
  if (!isRunning || currentIndex >= phoneNumbers.length) {
    // All done
    isRunning = false;
    await chrome.storage.local.set({
      isRunning: false,
      currentProgress: 0,
      totalPhones: 0,
    });
    sendMessageToSidePanel({ action: "automationComplete" });
    return;
  }

  const phoneNumber = phoneNumbers[currentIndex];
  sendLogToSidePanel(
    `Processing phone ${currentIndex + 1}/${
      phoneNumbers.length
    }: ${phoneNumber}`,
    "info"
  );

  // Update progress
  sendMessageToSidePanel({
    action: "updateProgress",
    current: currentIndex + 1,
    total: phoneNumbers.length,
  });

  await chrome.storage.local.set({
    currentProgress: currentIndex + 1,
    totalPhones: phoneNumbers.length,
  });

  try {
    // Open Facebook registration page
    const tab = await chrome.tabs.create({
      url: "https://www.facebook.com/r.php",
      active: true,
    });

    currentTabId = tab.id;

    // Wait for page to load
    await waitForTabLoad(tab.id);

    // Inject and execute the form filling script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillRegistrationForm,
      args: [phoneNumber],
    });

    sendLogToSidePanel(`Form filled for ${phoneNumber}`, "success");
    sendLogToSidePanel(`Waiting for navigation to next page...`, "info");

    // Wait for navigation to confirmemail.php
    const navigatedToConfirm = await waitForConfirmEmailPage(tab.id);

    if (navigatedToConfirm) {
      sendLogToSidePanel(`OTP sent to ${phoneNumber}`, "success");
      sendLogToSidePanel(`Waiting 3 seconds...`, "info");

      // Wait 3 seconds on the confirm email page
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Clear cookies for facebook.com
      await clearFacebookCookies();
      sendLogToSidePanel(`Cache cleared for ${phoneNumber}`, "info");

      // Close the tab
      await chrome.tabs.remove(tab.id);
      currentTabId = null;
      sendLogToSidePanel(`Completed processing ${phoneNumber}`, "success");
    } else {
      sendLogToSidePanel(
        `Did not navigate to confirm email page (timeout or error)`,
        "warning"
      );

      // Clear cookies anyway
      await clearFacebookCookies();

      // Close the tab
      await chrome.tabs.remove(tab.id);
      currentTabId = null;
    }

    // Move to next phone
    currentIndex++;

    // Wait a bit before processing next one to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Process next phone
    processNextPhone();
  } catch (error) {
    sendLogToSidePanel(
      `Error processing ${phoneNumber}: ${error.message}`,
      "error"
    );

    // Try to close tab if it exists
    if (currentTabId) {
      try {
        await chrome.tabs.remove(currentTabId);
      } catch (e) {
        console.error("Error closing tab:", e);
      }
      currentTabId = null;
    }

    // Move to next phone even if there was an error
    currentIndex++;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    processNextPhone();
  }
}

// Wait for tab to load
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        // Extra wait to ensure page is fully loaded
        setTimeout(resolve, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Wait for navigation to confirmemail.php
function waitForConfirmEmailPage(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, tab) => {
      if (updatedTabId === tabId) {
        // Check if URL contains confirmemail.php
        if (tab.url && tab.url.includes("facebook.com/confirmemail.php")) {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    // Timeout after 20 seconds if page doesn't navigate
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, 30000);
  });
}

// Clear Facebook cookies
async function clearFacebookCookies() {
  // Get all cookies for different Facebook domains
  const domains = [
    ".facebook.com",
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    ".m.facebook.com",
  ];

  for (const domain of domains) {
    const cookies = await chrome.cookies.getAll({ domain: domain });
    for (const cookie of cookies) {
      const protocol = cookie.secure ? "https:" : "http:";
      const cookieDomain = cookie.domain.startsWith(".")
        ? cookie.domain.substring(1)
        : cookie.domain;
      const url = `${protocol}//${cookieDomain}${cookie.path}`;

      try {
        await chrome.cookies.remove({
          url: url,
          name: cookie.name,
          storeId: cookie.storeId,
        });
        // console.log(`Removed cookie: ${cookie.name} from ${url}`);
      } catch (error) {
        // console.error(`Failed to remove cookie ${cookie.name}:`, error);
      }
    }
  }

  // Also clear cache and other browsing data for facebook.com
  try {
    await chrome.browsingData.remove(
      {
        origins: [
          "https://www.facebook.com",
          "https://facebook.com",
          "https://m.facebook.com",
        ],
      },
      {
        cache: true,
        cacheStorage: true,
        cookies: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true,
      }
    );
    // console.log("Cleared all Facebook browsing data and cache");
  } catch (error) {
    // console.error("Failed to clear browsing data:", error);
  }
}

// Send log message to sidepanel
function sendLogToSidePanel(message, type = "info") {
  sendMessageToSidePanel({
    action: "updateLog",
    message: message,
    type: type,
  });
}

// Send message to sidepanel
function sendMessageToSidePanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Sidepanel might be closed, that's okay
  });
}
