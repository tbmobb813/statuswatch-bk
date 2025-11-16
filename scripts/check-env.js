#!/usr/bin/env node
'use strict'
const fs = require('fs');
const path = require('path');

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // remove optional surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function tryLoadEnv() {
  // Priority: .env.local then .env
  const cwd = process.cwd();
  const candidates = ['.env.local', '.env'];
  for (const f of candidates) {
    const full = path.join(cwd, f);
    if (fs.existsSync(full)) {
      console.log(`Loading env from ${f}`);
      const parsed = parseEnvFile(full);
      for (const k of Object.keys(parsed)) {
        if (process.env[k] === undefined) process.env[k] = parsed[k];
      }
      return true;
    }
  }
  return false;
}

function findPrismaProvider() {
  const schema = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (!fs.existsSync(schema)) return null;
  const text = fs.readFileSync(schema, 'utf8');
  // find datasource block
  const m = text.match(/datasource[\s\S]*?\{([\s\S]*?)\}/m);
  if (!m) return null;
  const block = m[1];
  const pm = block.match(/provider\s*=\s*"([^"]+)"/);
  return pm ? pm[1] : null;
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set — trying to load .env.local or .env');
    tryLoadEnv();
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Error: DATABASE_URL was not found.\n\nPlease create a .env or .env.local with DATABASE_URL set.');
    process.exitCode = 2;
    return;
  }

  const provider = findPrismaProvider();
  if (provider) {
    const mismatch = (provider === 'sqlite' && !url.startsWith('file:')) ||
      (provider === 'postgresql' && !url.startsWith('postgres')) ||
      (provider === 'mysql' && !url.startsWith('mysql')) ||
      (provider === 'sqlserver' && !url.startsWith('sqlserver'));
    if (mismatch) {
      console.warn(`Warning: prisma provider is '${provider}' but DATABASE_URL looks like '${url}'.`);
    }
  }

  console.log('DATABASE_URL OK');
}

if (require.main === module) main();
