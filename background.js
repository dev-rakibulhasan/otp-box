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
    current: currentIndex,
    total: phoneNumbers.length,
  });

  await chrome.storage.local.set({
    currentProgress: currentIndex,
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
      sendLogToSidePanel(`Cookies cleared for ${phoneNumber}`, "info");

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
    const listener = (updatedTabId, changeInfo, tab) => {
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
    }, 20000);
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
        cacheStorage: true,
        cookies: true,
        indexedDB: true,
        localStorage: true,
        serviceWorkers: true,
        webSQL: true,
      }
    );
    // console.log("Cleared all Facebook browsing data");
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

// This function will be injected into the page
function fillRegistrationForm(phoneNumber) {
  // Predefined male first names
  const firstNames = [
    "James",
    "John",
    "Robert",
    "Michael",
    "William",
    "David",
    "Richard",
    "Joseph",
    "Thomas",
    "Christopher",
    "Daniel",
    "Matthew",
    "Anthony",
    "Mark",
    "Donald",
    "Steven",
    "Andrew",
    "Paul",
    "Joshua",
    "Kenneth",
    "Kevin",
    "Brian",
    "George",
    "Timothy",
    "Ronald",
    "Edward",
    "Jason",
    "Jeffrey",
    "Ryan",
    "Jacob",
    "Gary",
    "Nicholas",
    "Eric",
    "Jonathan",
    "Stephen",
    "Larry",
    "Justin",
    "Scott",
    "Brandon",
    "Benjamin",
    "Samuel",
    "Raymond",
    "Gregory",
    "Alexander",
    "Patrick",
    "Frank",
    "Dennis",
    "Jerry",
    "Tyler",
    "Aaron",
    "Jose",
    "Adam",
    "Nathan",
    "Douglas",
    "Zachary",
    "Peter",
    "Kyle",
    "Walter",
    "Ethan",
    "Jeremy",
    "Harold",
    "Keith",
    "Christian",
    "Roger",
    "Noah",
    "Gerald",
    "Carl",
    "Terry",
    "Sean",
    "Austin",
    "Arthur",
    "Lawrence",
    "Jesse",
    "Dylan",
    "Bryan",
    "Joe",
    "Jordan",
    "Billy",
    "Bruce",
    "Albert",
    "Willie",
    "Gabriel",
    "Logan",
    "Alan",
    "Juan",
    "Wayne",
    "Elijah",
    "Randy",
    "Roy",
    "Vincent",
    "Ralph",
    "Eugene",
    "Russell",
    "Bobby",
    "Mason",
    "Philip",
    "Louis",
    "Derek",
    "Bradley",
    "Lucas",
    "Connor",
    "Ethan",
  ];

  // Predefined male surnames
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
    "Thomas",
    "Taylor",
    "Moore",
    "Jackson",
    "Martin",
    "Lee",
    "Thompson",
    "White",
    "Harris",
    "Sanchez",
    "Clark",
    "Ramirez",
    "Lewis",
    "Robinson",
    "Walker",
    "Young",
    "Allen",
    "King",
    "Wright",
    "Scott",
    "Torres",
    "Nguyen",
    "Hill",
    "Flores",
    "Green",
    "Adams",
    "Nelson",
    "Baker",
    "Hall",
    "Rivera",
    "Campbell",
    "Mitchell",
    "Carter",
    "Roberts",
    "Gomez",
    "Phillips",
    "Evans",
    "Turner",
    "Diaz",
    "Parker",
    "Cruz",
    "Edwards",
    "Collins",
    "Reyes",
    "Stewart",
    "Morris",
    "Morales",
    "Murphy",
    "Cook",
    "Rogers",
    "Gutierrez",
    "Ortiz",
    "Morgan",
    "Cooper",
    "Peterson",
    "Bailey",
    "Reed",
    "Kelly",
    "Howard",
    "Ramos",
    "Kim",
    "Cox",
    "Ward",
    "Richardson",
    "Watson",
    "Brooks",
    "Chavez",
    "Wood",
    "James",
    "Bennett",
    "Gray",
    "Mendoza",
    "Ruiz",
    "Hughes",
    "Price",
    "Alvarez",
    "Castillo",
    "Sanders",
    "Patel",
    "Myers",
    "Long",
    "Ross",
    "Foster",
    "Jimenez",
    "Powell",
  ];

  // Helper function to get random element from array
  function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Helper function to generate random date before 2000
  function getRandomDateBefore2000() {
    const year = 1970 + Math.floor(Math.random() * 30); // 1970-1999
    const month = 1 + Math.floor(Math.random() * 12); // 1-12
    const day = 1 + Math.floor(Math.random() * 28); // 1-28 (safe for all months)
    return { day, month, year };
  }

  // Helper function to generate strong password
  function generateStrongPassword() {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const all = uppercase + lowercase + numbers + special;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < 16; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  // Helper function to set input value and trigger events
  function setInputValue(element, value) {
    if (!element) return false;

    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  // Helper function to set select value
  function setSelectValue(element, value) {
    if (!element) return false;

    element.value = value;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // Wait for page to be ready
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Element not found: " + selector));
      }, timeout);
    });
  }

  // Main execution
  (async function () {
    try {
      // Generate random data
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const dateOfBirth = getRandomDateBefore2000();
      const password = generateStrongPassword();

      // Wait a bit for page to fully load
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Fill first name
      const firstNameInput =
        document.querySelector('input[name="firstname"]') ||
        document.querySelector("#u_0_8_Ez");
      if (firstNameInput) {
        setInputValue(firstNameInput, firstName);
      }

      // Fill last name
      const lastNameInput =
        document.querySelector('input[name="lastname"]') ||
        document.querySelector("#u_0_a_sT");
      if (lastNameInput) {
        setInputValue(lastNameInput, lastName);
      }

      // Fill date of birth
      const daySelect =
        document.querySelector('select[name="birthday_day"]') ||
        document.querySelector("#day");
      if (daySelect) {
        setSelectValue(daySelect, dateOfBirth.day.toString());
      }

      const monthSelect =
        document.querySelector('select[name="birthday_month"]') ||
        document.querySelector("#month");
      if (monthSelect) {
        setSelectValue(monthSelect, dateOfBirth.month.toString());
      }

      const yearSelect =
        document.querySelector('select[name="birthday_year"]') ||
        document.querySelector("#year");
      if (yearSelect) {
        setSelectValue(yearSelect, dateOfBirth.year.toString());
      }

      // Select gender (Male = value 2)
      const maleRadio = document.querySelector('input[name="sex"][value="2"]');
      if (maleRadio) {
        maleRadio.checked = true;
        maleRadio.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // Fill phone number/email
      const contactInput =
        document.querySelector('input[name="reg_email__"]') ||
        document.querySelector("#u_0_h_Lz");
      if (contactInput) {
        setInputValue(contactInput, phoneNumber);
      }

      // Fill password
      const passwordInput =
        document.querySelector('input[name="reg_passwd__"]') ||
        document.querySelector("#password_step_input");
      if (passwordInput) {
        setInputValue(passwordInput, password);
      }

      // Wait a bit before submitting
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Click sign up button
      const signUpButton =
        document.querySelector('button[name="websubmit"]') ||
        document.querySelector("#u_0_n_gw") ||
        document.querySelector('button[type="submit"]');
      if (signUpButton) {
        signUpButton.click();
      }
    } catch (error) {
      console.error("Error filling form:", error);
    }
  })();
}
