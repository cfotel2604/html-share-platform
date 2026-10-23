import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { parseEnv } from 'node:util';

export function privateDirectory(value, checkout = process.cwd()) {
  if (!value) throw new Error('Set --private-dir outside the checkout');
  const directory = resolve(value), path = relative(resolve(checkout), directory);
  if (!(path === '..' || path.startsWith('..' + sep) || isAbsolute(path))) {
    throw new Error('Use a private directory outside the checkout');
  }
  return directory;
}

export async function readEnv(path) {
  return parseEnv(await readFile(path, 'utf8'));
}

export async function writeEnv(path, values) {
  // JSON quoting preserves literal values and prevents newline injection.
  const text = Object.entries(values).map(([key, value]) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || typeof value !== 'string' || /[\r\n\0]/.test(value)) {
      throw new Error('Invalid private environment setting');
    }
    return `${key}=${JSON.stringify(value)}`;
  }).join('\n') + '\n';
  await writeFile(path, text, { mode: 0o600 });
}

export function desktopConfig(values) {
  const publishable = values.CLERK_PUBLISHABLE_KEY || values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (values.CLERK_PUBLISHABLE_KEY && values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      values.CLERK_PUBLISHABLE_KEY !== values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error('Conflicting Clerk publishable keys');
  }
  if (!publishable?.startsWith('pk_test_') || !values.CLERK_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Desktop pilot requires Clerk Development keys from the same instance');
  }
  const emails = [];
  for (const [key, role] of [['HSP_PILOT_ADMIN_EMAIL', 'admin'], ['HSP_PILOT_EMPLOYEE_EMAIL', 'employee']]) {
    const email = values[key]?.trim().toLowerCase();
    if (!email && role === 'employee') continue;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a valid private pilot allowlist email');
    if (emails.some(entry => entry.email === email)) throw new Error('Pilot roles require distinct emails');
    emails.push({ email, role });
  }
  return { publishable, emails, secret: values.CLERK_SECRET_KEY };
}

export async function healthReady(origin, serviceToken, { attempts = 8, delay = 2000, fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await fetcher(origin + '/internal/health', {
        headers: { 'X-HSP-Service-Token': serviceToken }, redirect: 'error', signal: AbortSignal.timeout(5000),
      });
      if (result.ok && (await result.json()).status === 'ready') return;
      await result.body?.cancel();
    } catch { /* Secret/deployment propagation is bounded; never print response bodies. */ }
    if (attempt + 1 < attempts) await sleep(delay);
  }
  throw new Error('Pilot Worker D1 health failed after bounded retries');
}
