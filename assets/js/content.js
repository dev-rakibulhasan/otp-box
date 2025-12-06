// Content script for Facebook automation
// This script runs on Facebook pages and listens for messages from the background script

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillForm") {
    fillForm(message.data);
    sendResponse({ success: true });
  }
  return true;
});

// Monitor page changes
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Notify background script about URL change
    chrome.runtime
      .sendMessage({
        action: "urlChanged",
        url: currentUrl,
      })
      .catch(() => {});
  }
}).observe(document, { subtree: true, childList: true });
