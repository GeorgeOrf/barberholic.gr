const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/calendar"]
});

const calendar = google.calendar({ version: "v3", auth });
const calendarId = "753f8f3a1c5ea6eace22b77326d37ca3b132999d5c269274d6b5aafaa96b7a1c@group.calendar.google.com";

app.post("/appointment", async (req, res) => {
  const { name, phone, date, time } = req.body;
  if (!name || !phone || !date || !time) return res.status(400).json({ error: "Missing data" });

  const startDate = new Date(`${date}T${time}:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60000); // 1 ώρα

  const event = {
    summary: `Haircut - ${name}`,
    description: `Phone: ${phone}`,
    start: { dateTime: startDate.toISOString(), timeZone: "Europe/Athens" },
    end: { dateTime: endDate.toISOString(), timeZone: "Europe/Athens" }
  };

  try {
    await calendar.events.insert({ calendarId: calendarId, resource: event });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/appointments", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Missing date" });

  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59`).toISOString();

  try {
    const response = await calendar.events.list({ calendarId: calendarId, timeMin: start, timeMax: end });
    res.json(response.data.items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));