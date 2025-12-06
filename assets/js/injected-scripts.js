// This script will be injected into the page as a file
// Phone number is read from chrome.storage.local
(async function () {
  // Get phone number from storage
  const { currentPhoneNumber } = await chrome.storage.local.get(
    "currentPhoneNumber"
  );
  const phoneNumber = currentPhoneNumber;

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
})();
