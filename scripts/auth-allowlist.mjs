import pg from "pg";

// Operator-only stdin JSON. No emails or identities are printed or passed in shell arguments.
// {"action":"allow|revoke|disable-user","email":"...","role":"employee|admin","actorId":"UUID"}
export async function applyPolicy(client, input) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Invalid email");
  if (!["allow","revoke","disable-user"].includes(input.action)) throw new Error("Invalid action");
  if (input.action === "allow" && !["employee","admin"].includes(input.role)) throw new Error("Invalid role");
  if (input.actorId && !/^[a-f0-9-]{36}$/i.test(input.actorId)) throw new Error("Invalid audit actor");
  await client.query("BEGIN");
  try {
    if (input.actorId) {
      const actor = await client.query("SELECT id FROM users WHERE id=$1 AND role='admin' AND status='active' FOR SHARE", [input.actorId]);
      if (!actor.rowCount) throw new Error("Invalid audit actor");
    }
    if (input.action === "allow") {
      await client.query(`INSERT INTO auth_allowlist(email,role,status) VALUES($1,$2,'active')
        ON CONFLICT(email) DO UPDATE SET role=EXCLUDED.role,status='active',updated_at=now()`, [email,input.role]);
    } else if (input.action === "revoke") {
      await client.query("UPDATE auth_allowlist SET status='disabled',updated_at=now() WHERE email=$1", [email]);
    } else await client.query("UPDATE users SET status='disabled' WHERE email=$1", [email]);
    // Audit uses a stable policy digest, not the email value.
    const { createHash } = await import("node:crypto");
    await client.query("INSERT INTO audit_events(actor_id,action,target_type,target_id) VALUES($1,$2,'auth-policy',$3)",
      [input.actorId ?? null,"auth."+input.action,createHash("sha256").update(email).digest("hex")]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
if (process.argv[1]?.endsWith("auth-allowlist.mjs")) {
  let source=""; for await (const chunk of process.stdin) { source+=chunk; if(source.length>4096) throw new Error("Input too large"); }
  const pool=new pg.Pool(),client=await pool.connect();
  try { await applyPolicy(client,JSON.parse(source)); console.log("Auth policy updated and audited."); }
  catch { console.error("Auth policy update failed; no input data logged."); process.exitCode=1; }
  finally {client.release();await pool.end();}
}
