
const serviceBtn = document.getElementById("serviceBtn");
const serviceOptions = document.getElementById("serviceOptions");
const serviceText = document.getElementById("serviceText");
const options = serviceOptions.querySelectorAll(".option");
let selectedService = "";
let serviceOpen = false;

// Fetch public holidays
async function getHolidays() {
  try {
    const res = await fetch("https://barberholic-gr.onrender.com/holidays");
    if (!res.ok) throw new Error("Failed to fetch holidays from backend");
    const holidays = await res.json();
    return holidays;
  } catch (err) {
    console.error("Error fetching holidays:", err);
    return [];
  }
}

// Toggle dropdown
serviceBtn.addEventListener("click", () => {
  serviceOptions.classList.toggle("hidden");
  serviceOpen = !serviceOpen;
});

// Select option
options.forEach(option => {
  option.addEventListener("click", () => {
    serviceText.textContent = option.textContent;
    selectedService = option.textContent;
    serviceOptions.classList.add("hidden");
  });
});

// Close when clicking outside
document.addEventListener("click", (e) => {
  if (!document.getElementById("serviceDropdown").contains(e.target)) {
    serviceOptions.classList.add("hidden");
    serviceOpen = false;
  }
});

async function loadServices() {
  try {
    const res = await fetch("https://barberholic-gr.onrender.com/services");
    const services = await res.json();

    serviceOptions.innerHTML = ""; // clear old options

    services.forEach(s => {
      const div = document.createElement("div");

      div.className = "option px-3 py-2 text-sm hover:bg-white/10 cursor-pointer";
      div.textContent = s.name;

      // IMPORTANT → store ID from backend
      div.dataset.value = s.id;

      // When user clicks
      div.addEventListener("click", () => {
        serviceText.textContent = s.name;
        selectedService = s.id;
        serviceOptions.classList.add("hidden");
      });

      serviceOptions.appendChild(div);
    });

  } catch (err) {
    console.error("Error loading services:", err);
  }
}

loadServices();

const workingHoursByDay = {
  0: null,              // Κυριακή = κλειστά
  1: { start: 10, end: 18 }, // Δευτέρα
  2: { start: 10, end: 20 }, // Τρίτη
  3: { start: 10, end: 20 }, // Τετάρτη
  4: { start: 10, end: 20 }, // Πέμπτη
  5: { start: 10, end: 20 }, // Παρασκευή
  6: { start: 10, end: 18 }, // Σάββατο
};

// Custom date/time dropdowns
const dateBtn = document.getElementById("dateBtn");
const dateText = document.getElementById("dateText");
const dateOptions = document.getElementById("dateOptions");

const timeBtn = document.getElementById("timeBtn");
const timeText = document.getElementById("timeText");
const timeOptions = document.getElementById("timeOptions");

let selectedDate = "";
let selectedTime = "";

// check if public holiday and populate dates
async function populateDates() {
  const holidays = await getHolidays();

  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const options = { weekday: "long", month: "short", day: "numeric" };
    const text = d.toLocaleDateString("el-GR", options);
    const dateStr = d.toISOString().split("T")[0];

    const div = document.createElement("div");
    div.className = "option px-3 py-2 text-sm hover:bg-white/10 cursor-pointer";
    div.textContent = text;
    div.dataset.value = dateStr;

    if (holidays.includes(dateStr)) {
      div.classList.add("cursor-not-allowed", "text-gray-500", "hover:bg-transparent");
      div.addEventListener("click", () => {
        alert("Αυτή η μέρα είναι αργία, διάλεξε άλλη!");
      });
    } else {
      div.addEventListener("click", async () => {
        dateText.textContent = text;
        selectedDate = div.dataset.value;
        dateOptions.classList.add("hidden");
        await loadTimes(selectedDate);
      });
    }

    dateOptions.appendChild(div);
  }
}

populateDates();

// Toggle date dropdown
dateBtn.addEventListener("click", () => dateOptions.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!document.getElementById("dateDropdown").contains(e.target)) {
    dateOptions.classList.add("hidden");
  }
});

// Load available times for selected date
async function loadTimes(date) {
  timeOptions.innerHTML = "";

  const holidays = await getHolidays();
  if (holidays.includes(date)) {
    const div = document.createElement("div");
    div.textContent = "Closed (Holiday)";
    div.className = "option px-3 py-2 text-sm cursor-not-allowed text-gray-500";
    timeOptions.appendChild(div);
    return;
  }

  const res = await fetch(`https://barberholic-gr.onrender.com/appointments?date=${date}`);
  const booked = await res.json();

  const dayOfWeek = new Date(date).getDay();
  const hours = workingHoursByDay[dayOfWeek];

  if (!hours) {
    const div = document.createElement("div");
    div.textContent = "Closed";
    div.className = "option px-3 py-2 text-sm cursor-not-allowed text-gray-500";
    timeOptions.appendChild(div);
    return;
  }

  const { start, end } = hours;
  const allTimes = [];
  let currentHour = start;
  let currentMin = 0;

  while (currentHour < end) {
    const timeStr = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`;
    allTimes.push(timeStr);

    currentMin += 45;
    if (currentMin >= 60) {
      currentMin -= 60;
      currentHour++;
    }
  }

  const avaliable = allTimes.filter(t => !booked.some(b => b.time.startsWith(t)));

  const now = new Date();
  const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const avaliableFiltered = avaliable.filter(t => {
    const [hour, minute] = t.split(":").map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(hour, minute, 0, 0);
    return slotDate >= minBookingTime;
  });

  if (avaliableFiltered.length === 0) {
    const div = document.createElement("div");
    div.textContent = "No available times";
    div.className = "option px-3 py-2 text-sm cursor-not-allowed text-gray-500";
    timeOptions.appendChild(div);
  } else {
    avaliableFiltered.forEach(t => {
      const div = document.createElement("div");
      div.className = "option px-3 py-2 text-sm hover:bg-white/10 cursor-pointer";
      div.textContent = t;
      div.dataset.value = t;
      div.addEventListener("click", () => {
        timeText.textContent = t;
        selectedTime = t;
        timeOptions.classList.add("hidden");
      });
      timeOptions.appendChild(div);
    });
  }
}

// Toggle time dropdown
timeBtn.addEventListener("click", () => timeOptions.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!document.getElementById("timeDropdown").contains(e.target)) {
    timeOptions.classList.add("hidden");
  }
});

// Submit form to backend
const form = document.getElementById("booking-form");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    client_name: document.getElementById("client_name").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    service_id: parseInt(selectedService),
    date: selectedDate,
    time: selectedTime
  };

  if (!selectedService) {
    alert("Please select a service");
    return;
  }

  const res = await fetch("https://barberholic-gr.onrender.com/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (res.ok) {
    const dateTime = `${data.date} στις ${data.time}`;
    showBookingModal(dateTime);
    form.reset();
    timeSelect.innerHTML = "";
  } else {
    message.textContent = `${result.error}`
  }

});

// Modal
const modal = document.getElementById("bookingModal");
const modalContent = document.getElementById("modalContent");
const checkIcon = document.getElementById("checkIcon");
const closeBtn = document.getElementById("closeModal");
const modalMessage = document.getElementById("modalMessage");

function showBookingModal(dateTime) {
  modalMessage.innerHTML = `Έχετε κλείσει ραντεβού για <br> ${dateTime} με επιτυχία! <br> Αν έγινε κάποιο λάθος καλέστε στο 2312 955 747`;

  modal.classList.remove("hidden");

  // trigger animation
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");

    modalContent.classList.remove("scale-75", "opacity-0");
    modalContent.classList.add("scale-100", "opacity-100");

    // check icon pop animation
    setTimeout(() => {
      checkIcon.classList.remove("scale-0");
      checkIcon.classList.add("scale-100");
    }, 150);

  }, 10);
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

function closeModal() {
  modal.classList.add("opacity-0");
  modalContent.classList.add("scale-75", "opacity-0");
  checkIcon.classList.add("scale-0");

  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
}

closeBtn.addEventListener("click", closeModal);