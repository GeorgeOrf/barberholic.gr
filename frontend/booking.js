// booking.js
document.addEventListener("DOMContentLoaded", () => {
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const startHour = 10;
  const endHour = 18;
  
  const RENDER_URL = "https://barberholic-gr.onrender.com"

  // 1️⃣ Γέμισμα ημερομηνιών (επόμενες 7 μέρες)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const optionDate = new Date();
    optionDate.setDate(today.getDate() + i);

    const yyyy = optionDate.getFullYear();
    const mm = String(optionDate.getMonth() + 1).padStart(2, "0");
    const dd = String(optionDate.getDate()).padStart(2, "0");

    const optionValue = `${yyyy}-${mm}-${dd}`;
    const opt = document.createElement("option");
    opt.value = optionValue;
    opt.innerText = optionValue;
    dateInput.appendChild(opt);
  }

  // 2️⃣ Συνάρτηση για να γεμίζει ώρες (αποκλείει ήδη κλεισμένες)
  async function fillTimes(date) {
    timeInput.innerHTML = "";

    try {
      const res = await fetch(`${RENDER_URL}/appointments?date=${date}`);
      const appointments = await res.json();
      const bookedHours = appointments.map(ev => new Date(ev.start.dateTime).getHours());

      for (let h = startHour; h < endHour; h++) {
        if (!bookedHours.includes(h)) {
          const opt = document.createElement("option");
          const hourStr = h.toString().padStart(2, "0") + ":00";
          opt.value = hourStr;
          opt.innerText = hourStr;
          timeInput.appendChild(opt);
        }
      }
    } catch (err) {
      alert("Σφάλμα φόρτωσης ωρών: " + err.message);
    }
  }

  // 3️⃣ Γέμισμα ωρών για την πρώτη διαθέσιμη ημερομηνία
  if (dateInput.value) fillTimes(dateInput.value);
  else fillTimes(dateInput.options[0].value);

  // 4️⃣ Όταν αλλάζει ημερομηνία, ανανεώνουμε τις ώρες
  dateInput.addEventListener("change", () => fillTimes(dateInput.value));

  // 5️⃣ Κλείσιμο ραντεβού
  const bookBtn = document.getElementById("bookBtn");
  bookBtn.addEventListener("click", async () => {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const date = dateInput.value;
    const time = timeInput.value;

    if (!name || !phone || !date || !time) {
      alert("Συμπλήρωσε όλα τα πεδία!");
      return;
    }

    try {
      // Για κλείσιμο ραντεβού
      const response = await fetch(`${RENDER_URL}/appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, date, time })
      });

      const data = await response.json();
      if (data.success) {
        alert("Το ραντεβού κλείστηκε!");
        // Ανανεώνουμε τις ώρες ώστε να αφαιρεθεί η κλεισμένη ώρα
        fillTimes(date);
      } else {
        alert("Σφάλμα: " + data.error);
      }
    } catch (err) {
      alert("Σφάλμα δικτύου: " + err.message);
    }
  });
});