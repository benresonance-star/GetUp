import crypto from 'node:crypto';
import { get, put, del, list } from '@vercel/blob';
import webpush from 'web-push';

export const APP_ORIGIN = 'https://benresonance-star.github.io';
export const APP_URL = APP_ORIGIN + '/GetUp/public/motion12/?flow=tomorrow';
const PREFIX = 'motion12/subscriptions/';

export function cors(req, res) {
  const origin = req.headers.origin;
  if (origin === APP_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', APP_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.statusCode = origin === APP_ORIGIN ? 204 : 403;
    res.end();
    return false;
  }
  return origin === APP_ORIGIN;
}

export function isOwner(code) {
  const expected = process.env.MOTION12_OWNER_CODE;
  if (!expected || typeof code !== 'string') return false;
  const a = crypto.createHash('sha256').update(expected).digest();
  const b = crypto.createHash('sha256').update(code).digest();
  return crypto.timingSafeEqual(a, b);
}

export function validatedSubscription(input) {
  if (!input || typeof input !== 'object') return null;
  const { endpoint, keys } = input;
  if (typeof endpoint !== 'string' || endpoint.length > 2048 || !keys) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!(url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com') ||
      url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com')) return null;
  } catch (_) { return null; }
  const keyPattern = /^[A-Za-z0-9_-]+$/;
  if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string' ||
      keys.p256dh.length < 50 || keys.p256dh.length > 200 ||
      keys.auth.length < 10 || keys.auth.length > 100 ||
      !keyPattern.test(keys.p256dh) || !keyPattern.test(keys.auth)) return null;
  return { endpoint, expirationTime: null, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function blobPath(endpoint) {
  return PREFIX + crypto.createHash('sha256').update(endpoint).digest('hex') + '.json';
}

export async function loadSubscription(endpoint) {
  const result = await get(blobPath(endpoint), { access: 'private', useCache: false });
  return result?.statusCode === 200 ? new Response(result.stream).json() : null;
}

export async function saveSubscription(subscription, lastSentDate = null) {
  const path = blobPath(subscription.endpoint);
  await put(path, JSON.stringify({ subscription, lastSentDate }), {
    access: 'private', allowOverwrite: true, contentType: 'application/json', addRandomSuffix: false
  });
}

export async function deleteSubscription(endpoint) {
  await del(blobPath(endpoint));
}

export async function allSubscriptionBlobs() {
  let cursor;
  const blobs = [];
  do {
    const result = await list({ prefix: PREFIX, limit: 1000, cursor });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function loadBlob(pathname) {
  const result = await get(pathname, { access: 'private', useCache: false });
  return result?.statusCode === 200 ? new Response(result.stream).json() : null;
}

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID keys are not configured');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || APP_ORIGIN, publicKey, privateKey);
}

export async function sendPush(subscription, test = false) {
  configureWebPush();
  const payload = {
    title: test ? 'MOTION12 · Notification test' : 'MOTION12 · Prepare for tomorrow',
    body: test ? 'Your evening Flow reminder is connected.' : 'Review your exercises and choose one focus for the morning.',
    url: APP_URL, tag: test ? 'motion12-push-test' : 'motion12-evening-flow'
  };
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 7200, urgency: 'normal' });
}

export function melbourneClock(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}
