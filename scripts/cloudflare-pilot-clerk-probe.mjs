import { createClerkClient, verifyToken } from '@clerk/backend';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { privateDirectory, readEnv, desktopConfig } from './lib/pilot-config.mjs';

// Uses existing operator-selected Google users/sessions only. No new identity,
// sign-in, token TTL/template override, session revoke or user policy mutation.
// JWTs and provider identities stay in memory; receipt contains booleans only.
try {
  process.env.CLERK_TELEMETRY_DISABLED = '1';
  const arg = process.argv.indexOf('--private-dir');
  const directory = privateDirectory(arg >= 0 ? process.argv[arg + 1] : null);
  const state = JSON.parse(await readFile(resolve(directory, 'resources.json'), 'utf8'));
  const config = desktopConfig(await readEnv(resolve(directory, '.env.desktop')));
  if (state.origins?.studio !== 'http://localhost:3101') throw new Error('Unexpected Desktop Studio origin');
  const client = createClerkClient({ secretKey: config.secret, publishableKey: config.publishable });
  const checks = [];
  for (const { email, role } of config.emails) {
    const users = await client.users.getUserList({ emailAddress: [email], limit: 2 });
    if (users.data.length !== 1) { checks.push({ role, matchingUser: false }); continue; }
    const user = users.data[0];
    const primary = user.emailAddresses.find(item => item.id === user.primaryEmailAddressId);
    const sessions = await client.sessions.getSessionList({ userId: user.id, status: 'active', limit: 10 });
    const check = { role, matchingUser: true,
      googleVerified: primary?.verification?.status === 'verified' && primary.emailAddress.toLowerCase() === email &&
        user.externalAccounts.some(item => item.provider === 'oauth_google' && item.emailAddress?.toLowerCase() === email),
      userEnabled: !user.banned && !user.locked, activeSessions: sessions.data.length };
    if (sessions.data.length) {
      // Provider issuance probe only. The SDK does not expose the browser's
      // last JWT here; a separate authenticated upload must prove seed refresh.
      const chosen = sessions.data[0];
      check.activeSessionFound = Boolean(chosen);
      if (chosen) {
        const fresh = await client.sessions.getToken(chosen.id);
        const claims = await verifyToken(fresh.jwt, { secretKey: config.secret, authorizedParties: [state.origins.studio] });
        check.freshSubjectMatches = claims.sub === user.id;
        check.freshSessionMatches = claims.sid === chosen.id;
        check.freshAzpPresent = typeof claims.azp === 'string';
        check.freshAzpMatches = claims.azp === state.origins.studio;
        check.freshLifetimeOver20s = claims.exp * 1000 > Date.now() + 20000;
      }
    }
    checks.push(check);
  }
  const passed = checks.some(check => check.role === 'admin' && check.googleVerified && check.userEnabled &&
    check.activeSessionFound && check.freshSubjectMatches && check.freshSessionMatches && check.freshAzpMatches && check.freshLifetimeOver20s);
  const report = { checkedAt: new Date().toISOString(), clerkBackend: 'reachable',
    providerMintGate: passed ? 'PASS' : 'PENDING_OR_DENIED', authenticatedUploadGate: 'NOT_TESTED', checks };
  await writeFile(resolve(directory, 'clerk-probe.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch {
  console.error('Clerk provider probe failed; no provider payload logged'); process.exitCode = 1;
}
