import { cors } from '../lib/core.js';

export default function handler(req, res) {
  if (!cors(req, res)) { if (!res.writableEnded) res.status(403).json({ error: 'Origin not allowed' }); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null,
    timeZone: 'Australia/Melbourne', hour: 19,
    timing: 'Reminder runs during the 7–8 pm Melbourne hour on Vercel Hobby.' });
}
