const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Google setup
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/calendar"]
});
const calendar = google.calendar({ version: "v3", auth });
const calendarId = "753f8f3a1c5ea6eace22b77326d37ca3b132999d5c269274d6b5aafaa96b7a1c@group.calendar.google.com";

//  Local in-memory lock
const pendingBookings = new Set();

// Get appointments for a date
app.get("/appointments", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Missing date" });

  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59`).toISOString();

  try {
    const response = await calendar.events.list({ calendarId, timeMin: start, timeMax: end });
    // merge with local pending locks so frontend βλέπει και τα locked slots
    const events = response.data.items.map(ev => new Date(ev.start.dateTime).getHours());
    const pending = Array.from(pendingBookings)
      .filter(slot => slot.startsWith(date))
      .map(slot => parseInt(slot.split("-")[1]));
    const bookedHours = [...events, ...pending];
    res.json(bookedHours);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Post appointment
app.post("/appointment", async (req, res) => {
  const { name, phone, date, time } = req.body;
  if (!name || !phone || !date || !time) return res.status(400).json({ error: "Missing data" });

  const slotKey = `${date}-${parseInt(time.split(":")[0])}`;
  if (pendingBookings.has(slotKey)) {
    return res.json({ success: false, error: "Η ώρα μόλις κλείστηκε" });
  }

  //  lock slot immediately
  pendingBookings.add(slotKey);
  // automatic unlock after 5 min (in case something fails)
  setTimeout(() => pendingBookings.delete(slotKey), 5 * 60 * 1000);

  res.json({ success: true }); // άμεση απάντηση στον χρήστη

// async Google Calendar insert
  (async () => {
    try {
      const startDate = new Date(`${date}T${time}:00`);
      const endDate = new Date(startDate.getTime() + 60 * 60000); // 1 ώρα

      const event = {
        summary: `Haircut - ${name}`,
        description: `Phone: ${phone}`,
        start: { dateTime: startDate.toISOString(), timeZone: "Europe/Athens" },
        end: { dateTime: endDate.toISOString(), timeZone: "Europe/Athens" }
      };

      await calendar.events.insert({ calendarId, resource: event });
      console.log(`Google Calendar event created for ${slotKey}`);
      pendingBookings.delete(slotKey); // unlock after success
    } catch (err) {
      console.error("Google Calendar failed:", err);
      // leave slot unlocked after 5 min timeout
    }
  })();
});

app.listen(3000, () => console.log("Server running on port 3000"));