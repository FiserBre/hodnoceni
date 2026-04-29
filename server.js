import "dotenv/config";
import express from "express";
import pkg from "pg";
import nodemailer from "nodemailer";
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.resend.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || "resend";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : SMTP_PORT === 465;
const FROM_EMAIL =
  process.env.FROM_EMAIL || SMTP_USER || "hodnoceni@fiserbretislav.com";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "fiserbretislav@email.cz";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin123";

app.use(express.json());
app.use(express.static("public"));

let memReviews = [];

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: sslOption(DATABASE_URL),
  });
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT NOW(),
          overall_stars INTEGER NOT NULL,
          email TEXT,
          message TEXT,
          flagged BOOLEAN DEFAULT false
        );
      `);
      console.log("DB ready");
    } catch (e) {
      console.error("DB init error:", e.message);
      pool = null;
    }
  })();
}

function sslOption(cs) {
  return /amazonaws|render|railway|supabase|azure|gcp|neon|timescale|heroku/i.test(
    cs,
  )
    ? { rejectUnauthorized: false }
    : undefined;
}

// Email setup
let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendBadReviewEmail(review) {
  if (!transporter) {
    console.log(
      "[EMAIL SKIPPED - no SMTP config] Bad review from:",
      review.email,
      "Stars:",
      review.overall_stars,
    );
    return;
  }
  await transporter.sendMail({
    from: FROM_EMAIL,
    to: NOTIFY_EMAIL,
    subject: `⚠️ Nová negativní recenze`,
    html: `
      <h2>Negativní recenze</h2>
      <p><strong>Hvězdičky:</strong> ${review.overall_stars} / 5</p>
      <p><strong>Email zákazníka:</strong> ${review.email || "(nevyplněno)"}</p>
      <p><strong>Text recenze:</strong></p>
      <blockquote>${review.message || "(bez textu)"}</blockquote>
    `,
  });
}

app.post("/api/reviews", async (req, res) => {
  const { overall_stars, email, message } = req.body;

  if (!overall_stars || overall_stars < 1 || overall_stars > 5) {
    return res.status(400).json({ ok: false, error: "Neplatné hodnocení." });
  }

  const flagged = overall_stars < 4;
  const review = { overall_stars, email, message, flagged };

  try {
    if (pool) {
      const result = await pool.query(
        `INSERT INTO reviews (overall_stars, email, message, flagged)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [overall_stars, email || null, message || null, flagged],
      );
      review.id = result.rows[0].id;
    } else {
      review.id = memReviews.length + 1;
      review.created_at = new Date().toISOString();
      memReviews.push(review);
    }

    if (flagged) {
      await sendBadReviewEmail(review).catch((e) =>
        console.error("Email error:", e.message),
      );
    }

    res.json({ ok: true, flagged, id: review.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/reviews", async (req, res) => {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: "Neoprávněný přístup." });

  try {
    if (pool) {
      const result = await pool.query(
        "SELECT * FROM reviews ORDER BY created_at DESC",
      );
      res.json({ ok: true, reviews: result.rows });
    } else {
      res.json({ ok: true, reviews: [...memReviews].reverse() });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete("/api/reviews/:id", async (req, res) => {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: "Neoprávněný přístup." });

  const id = parseInt(req.params.id);
  try {
    if (pool) {
      await pool.query("DELETE FROM reviews WHERE id=$1", [id]);
    } else {
      memReviews = memReviews.filter((r) => r.id !== id);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/stats", async (req, res) => {
  const token = req.headers["x-admin-token"];
  if (token !== ADMIN_TOKEN)
    return res.status(401).json({ ok: false, error: "Neoprávněný přístup." });

  try {
    if (pool) {
      const r = await pool.query(`
        SELECT COUNT(*) AS total,
               ROUND(AVG(overall_stars),2) AS avg_stars,
               COUNT(*) FILTER (WHERE flagged) AS negative,
               COUNT(*) FILTER (WHERE overall_stars=5) AS five_star
        FROM reviews
      `);
      res.json({ ok: true, ...r.rows[0] });
    } else {
      const total = memReviews.length;
      const avg = total
        ? (memReviews.reduce((a, r) => a + r.overall_stars, 0) / total).toFixed(
            2,
          )
        : 0;
      const negative = memReviews.filter((r) => r.flagged).length;
      const five_star = memReviews.filter((r) => r.overall_stars === 5).length;
      res.json({ ok: true, total, avg_stars: avg, negative, five_star });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
