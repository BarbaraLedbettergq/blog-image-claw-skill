#!/usr/bin/env node
/**
 * blogimg.js — Blog Image Generator (zero neta-skills dependency)
 *
 * Commands:
 *   node blogimg.js header  <title> [options]          → single hero/OG image
 *   node blogimg.js inline  <section_text> [options]   → single inline image
 *   node blogimg.js post    <title> <section1> [<section2> ...] [options]
 *                                                       → full set: 1 header + N inline images
 *
 * Options:
 *   --style  editorial|tech|lifestyle|minimal|photo    (default: editorial)
 *   --tone   light|dark                                (default: light)
 *   --count  <n>   inline images to generate for `post` command (default: auto)
 *
 * Image sizes:
 *   header  — 1024×576  (16:9, OG / hero)
 *   inline  — 1024×576  (16:9, in-article)
 *
 * Token resolved from: NETA_TOKEN env → ~/.openclaw/workspace/.env → clawhouse .env
 */

import { readFileSync } from 'node:fs';
import { homedir }      from 'node:os';
import { resolve }      from 'node:path';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE = 'https://api.talesofai.cn';

function getToken() {
  if (process.env.NETA_TOKEN) return process.env.NETA_TOKEN;
  const envFiles = [
    resolve(homedir(), '.openclaw/workspace/.env'),
    resolve(homedir(), 'developer/clawhouse/.env'),
  ];
  for (const p of envFiles) {
    try {
      const m = readFileSync(p, 'utf8').match(/NETA_TOKEN=(.+)/);
      if (m) return m[1].trim();
    } catch { /* try next */ }
  }
  throw new Error('API token not found. Add it to ~/.openclaw/workspace/.env');
}

const HEADERS = {
  'x-token': getToken(),
  'x-platform': 'nieta-app/web',
  'content-type': 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: HEADERS,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const log = msg => process.stderr.write(msg + '\n');
const out = data => console.log(JSON.stringify(data));

// ── Style presets ─────────────────────────────────────────────────────────────

const STYLES = {
  editorial:  'editorial photography, professional, high quality, sharp focus, magazine style',
  tech:       'clean tech illustration, modern, minimalist, blue tones, digital art',
  lifestyle:  'lifestyle photography, warm tones, natural light, authentic, inviting',
  minimal:    'minimalist, white background, simple composition, elegant, clean',
  photo:      'photorealistic, cinematic, dramatic lighting, high resolution',
};

const TONES = {
  light: 'bright, airy, light background',
  dark:  'dark, moody, rich shadows',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFlags(args) {
  const flags = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = flags[key] === undefined ? val : [].concat(flags[key], val);
    } else {
      flags._.push(args[i]);
    }
  }
  return flags;
}

async function generateImage(prompt, width, height) {
  const vtokens = [{ type: 'freetext', value: prompt, weight: 1 }];
  const taskUuid = await api('POST', '/v3/make_image', {
    storyId: 'DO_NOT_USE',
    jobType: 'universal',
    rawPrompt: vtokens,
    width,
    height,
    meta: { entrance: 'PICTURE' },
  });
  const task_uuid = typeof taskUuid === 'string' ? taskUuid : taskUuid?.task_uuid;

  let warnedSlow = false;
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    if (!warnedSlow && i >= 14) { log('⏳ Still rendering...'); warnedSlow = true; }
    const result = await api('GET', `/v1/artifact/task/${task_uuid}`);
    if (result.task_status !== 'PENDING' && result.task_status !== 'MODERATION') {
      return { task_uuid, status: result.task_status, url: result.artifacts?.[0]?.url ?? null };
    }
  }
  return { task_uuid, status: 'TIMEOUT', url: null };
}

// Summarise section text into a short visual prompt (max ~100 chars)
function sectionToPrompt(text) {
  // Strip markdown, take first 120 chars, strip incomplete word at end
  return text.replace(/[#*`>\[\]]/g, '').trim().slice(0, 120).replace(/\s\S*$/, '');
}

// ── Commands ──────────────────────────────────────────────────────────────────

const [,, cmd, ...rawArgs] = process.argv;

// ── header ────────────────────────────────────────────────────────────────────

if (cmd === 'header') {
  const flags    = parseFlags(rawArgs);
  const title    = flags._.join(' ');
  const style    = STYLES[flags.style] ?? STYLES.editorial;
  const tone     = TONES[flags.tone]   ?? TONES.light;

  if (!title) throw new Error('Usage: blogimg.js header <title> [--style editorial|tech|lifestyle|minimal|photo] [--tone light|dark]');

  const prompt = `${title}, hero image, blog header, ${style}, ${tone}, no text, wide banner`;
  log(`🖼️  Generating header image for: "${title}"`);
  log(`⏳ Submitting...`);

  const result = await generateImage(prompt, 1024, 576);
  out({ type: 'header', title, ...result });
}

// ── inline ────────────────────────────────────────────────────────────────────

else if (cmd === 'inline') {
  const flags   = parseFlags(rawArgs);
  const section = flags._.join(' ');
  const style   = STYLES[flags.style] ?? STYLES.editorial;
  const tone    = TONES[flags.tone]   ?? TONES.light;

  if (!section) throw new Error('Usage: blogimg.js inline <section_text> [--style editorial|tech|lifestyle|minimal|photo] [--tone light|dark]');

  const visualPrompt = sectionToPrompt(section);
  const prompt = `${visualPrompt}, inline blog image, ${style}, ${tone}, no text`;
  log(`🖼️  Generating inline image for section: "${visualPrompt.slice(0, 60)}..."`);
  log(`⏳ Submitting...`);

  const result = await generateImage(prompt, 1024, 576);
  out({ type: 'inline', section: visualPrompt, ...result });
}

// ── post ──────────────────────────────────────────────────────────────────────

else if (cmd === 'post') {
  const flags    = parseFlags(rawArgs);
  const [title, ...sections] = flags._;
  const style    = STYLES[flags.style] ?? STYLES.editorial;
  const tone     = TONES[flags.tone]   ?? TONES.light;
  const maxCount = flags.count ? parseInt(flags.count) : sections.length;

  if (!title) throw new Error('Usage: blogimg.js post <title> [section1] [section2] ... [--style ...] [--tone light|dark] [--count n]');

  const results = [];

  // 1. Header image
  log(`\n📰 Blog: "${title}"`);
  log(`🖼️  [1/${1 + maxCount}] Generating header...`);
  const headerPrompt = `${title}, hero image, blog header, ${style}, ${tone}, no text, wide banner`;
  const header = await generateImage(headerPrompt, 1024, 576);
  results.push({ type: 'header', title, ...header });
  log(`✅ Header: ${header.url ?? 'FAILED'}`);

  // 2. Inline images for each section (up to maxCount)
  const picked = sections.slice(0, maxCount);
  for (let i = 0; i < picked.length; i++) {
    const visualPrompt = sectionToPrompt(picked[i]);
    log(`\n🖼️  [${i + 2}/${1 + maxCount}] Inline for: "${visualPrompt.slice(0, 50)}..."`);
    const inlinePrompt = `${visualPrompt}, inline blog image, ${style}, ${tone}, no text`;
    const inline = await generateImage(inlinePrompt, 1024, 576);
    results.push({ type: 'inline', section: visualPrompt, index: i + 1, ...inline });
    log(`✅ Inline ${i + 1}: ${inline.url ?? 'FAILED'}`);
  }

  out(results);
}

else {
  process.stderr.write([
    'Usage:',
    '  node blogimg.js header <title> [--style editorial|tech|lifestyle|minimal|photo] [--tone light|dark]',
    '  node blogimg.js inline <section_text> [--style ...] [--tone light|dark]',
    '  node blogimg.js post <title> [section1] [section2] ... [--style ...] [--tone light|dark] [--count n]',
    '',
    'Styles: editorial | tech | lifestyle | minimal | photo',
    'Tones:  light | dark',
  ].join('\n') + '\n');
  process.exit(1);
}
