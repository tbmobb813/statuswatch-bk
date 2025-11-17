#!/usr/bin/env node
"use strict"

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Find any user, or create a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({ data: { email: 'test+notify@local', name: 'Test User' } });
    console.log('Created test user', user.id);
  } else {
    console.log('Using existing user', user.id);
  }

  const notif = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'incident_started',
      channel: 'email',
      title: 'Demo alert',
      message: 'This is a test notification inserted by seed-notification.js',
      sent: false
    }
  });

  console.log('Inserted notification', notif.id);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(async ()=>{
  await prisma.$disconnect();
});
