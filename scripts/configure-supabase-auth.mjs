/**
 * Apply Supabase Auth settings for SportSync registration.
 *
 * Requires SUPABASE_ACCESS_TOKEN (from `npx supabase login` / dashboard access token).
 *
 * Sets:
 * - mailer_autoconfirm = true (instant session on client signUp)
 * - site_url = http://localhost:3000
 * - uri_allow_list = localhost + NEXT_PUBLIC_APP_URL callbacks
 */
import fs from 'node:fs';

function loadEnvFiles(...paths) {
  const env = {};
  for (const path of paths) {
    if (!fs.existsSync(path)) continue;
    for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const i = line.indexOf('=');
      env[line.slice(0, i)] = line.slice(i + 1).replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnvFiles('.env', '.env.local');
const token = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'jnxpmtaystxywjxxyexh';
const appUrl = (env.NEXT_PUBLIC_APP_URL || 'https://sportsync-ct5.pages.dev').replace(/\/$/, '');

const manual = {
  dashboardProviders: `https://supabase.com/dashboard/project/${projectRef}/auth/providers`,
  dashboardUrlConfig: `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`,
  confirmEmail: 'OFF (Enable email confirmations = false)',
  siteUrl: 'http://localhost:3000',
  redirectAllowList: [
    'http://localhost:3000/**',
    'http://localhost:3000/auth/callback',
    `${appUrl}/**`,
    `${appUrl}/auth/callback`,
  ],
};

if (!token) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        reason: 'SUPABASE_ACCESS_TOKEN missing',
        note: 'App registration still works via POST /api/auth/signup (admin createUser + email_confirm).',
        manual,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const body = {
  mailer_autoconfirm: true,
  site_url: 'http://localhost:3000',
  uri_allow_list: [
    'http://localhost:3000',
    'http://localhost:3000/**',
    'http://localhost:3000/auth/callback',
    appUrl,
    `${appUrl}/**`,
    `${appUrl}/auth/callback`,
  ].join(','),
};

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text.slice(0, 500) };
}

console.log(
  JSON.stringify(
    {
      ok: res.ok,
      http: res.status,
      mailer_autoconfirm: json.mailer_autoconfirm ?? null,
      site_url: json.site_url ?? null,
      uri_allow_list: json.uri_allow_list ?? null,
      error: res.ok ? null : json,
      manual: res.ok ? undefined : manual,
    },
    null,
    2,
  ),
);

process.exit(res.ok ? 0 : 1);
