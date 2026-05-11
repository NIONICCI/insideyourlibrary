// ============================================================
// Inside Your Library — server.js
// Static homepage + /api/waitlist endpoint to Brevo list #4
// ============================================================

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_WAITLIST_LIST = parseInt(process.env.BREVO_WAITLIST_LIST || '4', 10);

app.use(express.json());

// --- Static assets (index.html, images, logo, etc.) ---
// Files served from the repo root.
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// ------------------------------------------------------------
// POST /api/waitlist
// Body: { email: string, source?: string }
// Adds the contact to Brevo waitlist list (#4 by default).
// ------------------------------------------------------------
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email, source } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const trimmed = email.trim().toLowerCase();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!emailValid) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!BREVO_API_KEY) {
      console.error('[waitlist] BREVO_API_KEY not configured');
      return res.status(500).json({ error: 'Waitlist not configured.' });
    }

    // Brevo: create-or-update contact and add to the waitlist list.
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        email: trimmed,
        listIds: [BREVO_WAITLIST_LIST],
        updateEnabled: true,
        attributes: {
          SOURCE: source || 'iyl-homepage'
        }
      })
    });

    // Brevo returns 201 (created) or 204 (updated). Both are success.
    if (brevoResponse.ok || brevoResponse.status === 204) {
      console.log(`[waitlist] subscribed: ${trimmed} (source: ${source || 'iyl-homepage'})`);
      return res.status(200).json({ ok: true });
    }

    // Duplicate-contact responses from Brevo are also treated as success.
    const errorPayload = await brevoResponse.json().catch(() => ({}));
    if (errorPayload && errorPayload.code === 'duplicate_parameter') {
      console.log(`[waitlist] already subscribed: ${trimmed}`);
      return res.status(200).json({ ok: true });
    }

    console.error('[waitlist] Brevo error:', brevoResponse.status, errorPayload);
    return res.status(502).json({ error: 'Could not subscribe right now. Please try again shortly.' });

  } catch (err) {
    console.error('[waitlist] unexpected error:', err);
    return res.status(500).json({ error: 'Something went quiet. Please try again.' });
  }
});

// ------------------------------------------------------------
// Health check (useful for Railway)
// ------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'insideyourlibrary',
    brevoConfigured: !!BREVO_API_KEY,
    waitlistListId: BREVO_WAITLIST_LIST
  });
});

// ------------------------------------------------------------
// Catch-all: serve index.html for unknown routes
// (lets you add /metaphysical-wing.html etc. later without breaking anything)
// ------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[IYL] listening on port ${PORT}`);
  console.log(`[IYL] Brevo configured: ${!!BREVO_API_KEY}`);
  console.log(`[IYL] Waitlist list ID: ${BREVO_WAITLIST_LIST}`);
});
