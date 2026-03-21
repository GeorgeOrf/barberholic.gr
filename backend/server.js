import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import pool from './db.js';

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

    // Έλεγχος 2+ ωρών από τώρα
    const bookingDateTime = new Date(`${date}T${time}:00`);
    const now = new Date();
    if (bookingDateTime - now < 2 * 60 * 60 * 1000) {
      return res.status(400).json({ error: "Τα ραντεβού πρέπει να κλείνονται τουλάχιστον 2 ώρες πριν" });
    }

    // insert στο database
    const result = await pool.query(
      `INSERT INTO appointments
      (client_name, phone, email, service_id, date, time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [client_name, phone, email, service_id, date, time]
    );

    const appointment = result.rows[0];

    // --- Δημιουργία event στο Google Calendar ---
    const endTime = calculateEndTime(time, duration);
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID, // βάλτο στο .env
      requestBody: {
        summary: `Haircut: ${client_name}`,
        start: { dateTime: `${date}T${time}:00`, timeZone: "Europe/Athens" },
        end: { dateTime: `${date}T${endTime}:00`, timeZone: "Europe/Athens" },
        description: `Service: ${serviceName}, Phone: ${phone}, Email: ${email}`,
      }
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment
    });

  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "This time slot is already booked" });
    }

    console.error(err);
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

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Barber backend is running!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});