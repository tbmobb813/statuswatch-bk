#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
'use strict'

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const sendgrid = require('@sendgrid/mail');

const prisma = new PrismaClient();

async function sendEmailDryRun(to, subject, _html) {
  console.log(`DRY-RUN email to=${to} subject=${subject}`);
}

async function sendSlackWebhook(url, payload) {
  await axios.post(url, payload, { timeout: 10000 });
}

async function deliverNotification(notif) {
  const title = notif.title || 'StatusWatch';
  const message = notif.message || '';

  // Load user preferences
  const prefs = await prisma.alertPreference.findUnique({ where: { userId: notif.userId } });
  const user = await prisma.user.findUnique({ where: { id: notif.userId } });

  // Email
  if (prefs && prefs.emailEnabled && user && user.email) {
    if (process.env.SENDGRID_API_KEY) {
      try {
        sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
          to: user.email,
          from: process.env.NOTIFY_FROM || 'notifications@statuswatch.local',
          subject: title,
          html: `<p>${message}</p>`
        };
        await sendgrid.send(msg);
        console.log(`Email sent to ${user.email}`);
      } catch (err) {
        console.error('Error sending email:', err && err.message ? err.message : err);
        throw err;
      }
    } else {
      await sendEmailDryRun(user.email, title, message);
    }
  }

  // Slack webhook
  if (prefs && prefs.slackWebhook) {
    try {
      await sendSlackWebhook(prefs.slackWebhook, { text: `*${title}*\n${message}` });
      console.log('Slack webhook sent');
    } catch (err) {
      console.error('Slack webhook error:', err && err.message ? err.message : err);
      // don't throw — continue to mark notification attempted
    }
  }

  // Discord webhook
  if (prefs && prefs.discordWebhook) {
    try {
      await axios.post(prefs.discordWebhook, { content: `**${title}**\n${message}` }, { timeout: 10000 });
      console.log('Discord webhook sent');
    } catch (err) {
      console.error('Discord webhook error:', err && err.message ? err.message : err);
    }
  }
}

const MAX_ATTEMPTS = parseInt(process.env.NOTIFY_MAX_ATTEMPTS || '3', 10);
async function runOnce() {
  let pending = [];
  try {
    // only pick unsent notifications that haven't exceeded attempts
    pending = await prisma.notification.findMany({ where: { sent: false, attempts: { lt: MAX_ATTEMPTS } } });
  } catch (err) {
    // Possible schema mismatch in DB (missing columns). Fall back to raw SQL select to be resilient.
    console.warn('Prisma findMany(notification) failed, falling back to raw SQL. Error:', err && err.message ? err.message : err);
    // Query using quoted identifiers (camelCase columns)
    const rows = await prisma.$queryRawUnsafe(`SELECT id, "userId", "incidentId", type, channel, "createdAt", "sent", "attempts" FROM notifications WHERE "sent" = false AND COALESCE("attempts",0) < ${MAX_ATTEMPTS}`);
    pending = rows.map(r => ({ id: r.id, userId: r.userId, incidentId: r.incidentId, type: r.type, channel: r.channel, createdAt: r.createdAt, attempts: r.attempts || 0 }));
  }

  console.log(`Found ${pending.length} unsent notifications (attempts < ${MAX_ATTEMPTS})`);

  for (const n of pending) {
    try {
      await deliverNotification(n);
      // mark sent; use raw SQL update to avoid schema-mapped failures
      try {
        await prisma.notification.update({ where: { id: n.id }, data: { sent: true, sentAt: new Date() } });
      } catch (innerErr) {
        // fall back to raw SQL update
        console.warn('prisma.notification.update failed, using raw SQL to mark sent:', innerErr && innerErr.message ? innerErr.message : innerErr);
        await prisma.$executeRawUnsafe(`UPDATE notifications SET "sent" = true, "sentAt" = now() WHERE id = '${n.id}'`);
      }
      // small delay
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.error('Delivery attempt failed for notification', n.id, err && err.message ? err.message : err);
      const message = err && (err.message || String(err)) ? (err.message || String(err)) : 'unknown error';
      // increment attempts and set lastError; prefer Prisma update, fallback to raw SQL
      try {
        await prisma.notification.update({ where: { id: n.id }, data: { attempts: { increment: 1 }, lastError: message } });
      } catch (uErr) {
        console.warn('Failed to update attempts via Prisma, using raw SQL:', uErr && uErr.message ? uErr.message : uErr);
        await prisma.$executeRawUnsafe(`UPDATE notifications SET "attempts" = COALESCE("attempts",0) + 1, "lastError" = '${String(message).replace(/'/g, "''")}' WHERE id = '${n.id}'`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    await runOnce();
    process.exit(0);
  }

  // default: run once
  await runOnce();
  process.exit(0);
}

main().catch(err => {
  console.error('Worker error:', err && err.message ? err.message : err);
  process.exit(1);
});
