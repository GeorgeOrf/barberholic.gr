import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import pool from './db.js';
import ical from 'node-ical';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Google setup
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/calendar"]
});
const calendar = google.calendar({ version: "v3", auth });

function calculateEndTime(startTime, duration) {
  let [hour, minute] = startTime.split(":").map(Number);
  minute += duration;

  if (minute >= 60) {
    hour += Math.floor(minute / 60);
    minute = minute % 60;
  }

  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

app.post("/book", async (req, res) => {
  let googleEventId = null;

  try {
    const { client_name, phone, email, service_id, date, time } = req.body;

    const serviceRes = await pool.query(
      "SELECT name, duration FROM services WHERE id = $1",
      [service_id]
    );

    const service = serviceRes.rows[0];

    if (!service) {
      return res.status(400).json({ error: "Invalid service" });
    }

    const serviceName = service.name;
    const duration = service.duration;

    // validation
    if (!client_name || !phone || !service_id || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Έλεγχος 2+ ώρες πριν
    const bookingDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (bookingDateTime - now < 2 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "Τα ραντεβού πρέπει να κλείνονται τουλάχιστον 2 ώρες πριν" });
    }

    // --- Create event in Google Calendar ---
    const endTime = calculateEndTime(time, duration);

    const eventResponse = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: `Haircut: ${client_name}`,
        start: { dateTime: `${date}T${time}:00`, timeZone: "Europe/Athens" },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: "Europe/Athens" },
        description: `Service: ${serviceName}, Phone: ${phone}, Email: ${email}`,
      }
    });

    googleEventId = eventResponse.data.id;

    // --- Insert into DB ---
    const result = await pool.query(
      `INSERT INTO appointments
      (client_name, phone, email, service_id, date, time, google_event_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [client_name, phone, email, service_id, date, time, googleEventId]
    );

    const appointment = result.rows[0];

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment
    });

  } catch (err) {
    console.error(err);

    // rollback αν κάτι πάει στραβά
    if (googleEventId) {
      try {
        await calendar.events.delete({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          eventId: googleEventId
        });
        console.log("Rolled back Google event");
      } catch (deleteErr) {
        console.error("Failed to delete Google event:", deleteErr);
      }
    }

    if (err.code === "23505") {
      return res.status(400).json({ error: "This time slot is already booked" });
    }

    res.status(500).json({ error: "Server error" });
  }
});

app.get("/appointments", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required " });
    }

    const result = await pool.query(
      `SELECT time FROM appointments WHERE date = $1`,
      [date]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error " });
  }
});

app.get("/services", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM services ORDER BY id"
    );
    console.log("services rows:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get('/holidays', async (req, res) => {
  try {
    const data = await ical.async.fromURL(
      "https://calendar.google.com/calendar/ical/en.greek%23holiday%40group.v.calendar.google.com/public/basic.ics"
    );

    const holidays = Object.values(data)
      .filter(event => event.type === 'VEVENT')
      .map(event => event.start.toISOString().split('T')[0]);

    res.json(holidays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});
// Check if event was deleted and delete in db
app.post('/api/calendar/webhook', async (req, res) => {
  try {
    const resourceState = req.headers['x-goog-resource-state'];

    console.log('Webhook triggered:', resourceState);

    // If something changed (including deletion)
    if (resourceState === 'exists' || resourceState === 'not_exists') {

      // Fetch latest events from Google
      const events = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
      });

      const googleEvents = events.data.items.map(e => e.id);

      // Get all DB events
      const dbRes = await pool.query(`SELECT google_event_id FROM appointments`);
      const dbEvents = dbRes.rows.map(r => r.google_event_id);

      // Find deleted ones
      const deletedEvents = dbEvents.filter(id => !googleEvents.includes(id));

      for (const id of deletedEvents) {
        console.log("Deleting from DB:", id);
        await pool.query(
          `DELETE FROM appointments WHERE google_event_id = $1`,
          [id]
        );
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

async function startWebhook() {
  try {
    const response = await calendar.events.watch({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        id: `channel-${Date.now()}`, // unique
        type: 'web_hook',
        address: 'https://barberholic-gr.onrender.com/api/calendar/webhook'
      }
    });

    console.log("Webhook started:", response.data);

  } catch (err) {
    console.error("Error starting webhook:", err);
  }
}

// Test route
app.get("/", (req, res) => {
  res.send("Barber backend is running!");
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startWebhook();
});