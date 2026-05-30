const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let sheets;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// Set up the admin password (defaults to 'admin123' if you forget to set the .env variable)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

try {
  if (process.env.GOOGLE_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log("✅ Google Sheets API Connected.");
  }
} catch (error) {
  console.error("❌ Google Auth Error:", error.message);
}

// Secure Fetch Data Route (Requires Password)
app.get('/api/data', async (req, res) => {
  if (!sheets) return res.status(500).json({ error: "Configuration missing" });
  
  // Check the password sent from the frontend
  const clientPassword = req.headers['x-admin-password'];
  if (clientPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized: Incorrect Password" });
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:Z', 
    });
    res.status(200).json({ data: response.data.values || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit Data Route (No password needed, so members can submit freely)
app.post('/api/submit', async (req, res) => {
  if (!sheets) return res.status(500).json({ error: "Configuration missing" });
  try {
    const { values } = req.body; 
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:Z',
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Default Route (Participant Form)
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});