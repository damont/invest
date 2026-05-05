/**
 * Generate a "setup guide" markdown that the user hands to an AI agent
 * (Claude, Codex, openclaw, etc.) so the agent can connect to this app.
 *
 * Design notes (so this can be reused across apps):
 * - The audience is the agent at SETUP time, not at runtime. The markdown
 *   tells it what it needs, what to ask the user for if it doesn't have it,
 *   and how to discover endpoints.
 * - No prescriptive tool-specific commands (curl, jq, env-var names) —
 *   different agents store secrets differently. Stay at the contract level.
 * - No endpoint list — endpoints change. Tell the agent to read the schema.
 * - No embedded token. Token + this guide are separate artifacts.
 *
 * To reuse in another newbuild app: copy this file, change the four args
 * passed in by the calling component (appName / description / dataModel /
 * capabilities).
 */
export interface AgentSkillInput {
  /** Lowercase app slug, used as filename and shown in the title (e.g. "invest"). */
  appName: string
  /** Origin of the app, e.g. "https://invest.example.com". */
  baseUrl: string
  /**
   * One paragraph: what the app is for, who uses it. Describe the *purpose*
   * — no endpoint names, no implementation detail.
   */
  description: string
  /**
   * Short paragraph (or bullet list) describing the data model in plain
   * English — the resources and how they relate. Helps the agent map the
   * OpenAPI paths to real concepts later.
   */
  dataModel: string
  /**
   * Optional list of "things this agent is typically asked to do" — frames
   * the agent's planning loop without locking it to a specific endpoint.
   */
  capabilities?: string[]
}

export function agentSkill(input: AgentSkillInput): string {
  const { appName, baseUrl, description, dataModel, capabilities = [] } = input
  const base = baseUrl.replace(/\/$/, '')

  const capsBlock = capabilities.length
    ? `\n## Typical tasks an operator will give you\n\n${capabilities
        .map((c) => `- ${c}`)
        .join('\n')}\n`
    : ''

  return `# ${appName} — agent setup guide

You are an AI agent (Claude, Codex, openclaw, MCP server, custom script — doesn't
matter which) being asked to work with **${appName}**. This document is your
onboarding: it tells you what the app does, what you need from the operator
before you can talk to it, and how to find the rest on your own.

Read this once. If you're missing anything from "What you need" below, ask the
operator before doing anything else. Don't guess and don't retry.

## What this app is

${description}

${dataModel}

## What you need before you can call anything

Two pieces of information. Neither is encoded in this file.

1. **The app's base URL.** Where the API actually lives. The most recent value
   the app knew about is \`${base}\`, but the operator may have moved it
   (Cloudflare tunnel, different host, etc.) — confirm if you're unsure.

2. **A bearer token (JWT).** The operator mints this themselves from the
   profile page of the running app, under "Agent tokens". It's a long opaque
   string scoped to that operator's user account; it lives for a configurable
   1–365 days.

Store both however your runtime handles secrets (environment variable, MCP
config, secrets file, vault entry — your call). Never log the token, never
echo it back, never write it to a committed file.

### What to ask the operator if you're missing either

Be specific so they know exactly what to hand back:

> I need two things to start working with ${appName}: (1) the base URL where
> it's running, and (2) a bearer token from the "Agent tokens" section of your
> profile page on that app. Can you provide both?

If only the token is missing:

> I have the base URL but not a token. Please open the ${appName} profile page,
> click "Generate" under Agent tokens, pick a duration, and paste the JWT here.

## How to authenticate every request

One header on every call:

\`\`\`
Authorization: Bearer <the token>
\`\`\`

That's the whole auth model. No refresh tokens, no OAuth flow, no per-endpoint
scopes. Same token on every request until it expires.

## How to discover endpoints

**Don't assume endpoint paths.** The app publishes its full API surface as a
standard OpenAPI 3.x schema. Fetch this once at the start of a session and
work from it:

- Machine-readable schema: \`<base>/api/openapi.json\`
- Browsable Swagger UI (for the operator or for your own debugging):
  \`<base>/api/agent\`

The schema includes every endpoint's path and method, request body shape,
response shape, tags grouping related endpoints, and per-endpoint descriptions
that note things like idempotency or special auth behavior.

To plan a task:

1. Pull the schema.
2. Search \`paths\` for endpoints relevant to the task — filter by tag, by
   path keyword, or by method.
3. Read the request and response schemas; match your payload exactly.
4. Make the call with the bearer header.

If something stops working, re-read the schema. It's the source of truth, not
your memory of how it worked last time.

## Idiomatic behavior the app expects

- **Use idempotent endpoints when they exist.** Endpoints whose schema
  description mentions "bulk", "upsert", or "idempotent" can safely be
  re-run; prefer them for backfills over many single-record creates.
- **Stay in your user.** Every resource is scoped to the authenticated user.
  You can't reach another user's data, so don't try.
- **Don't overwrite what the human writes.** If the data model labels
  something as "user-authored", that's for the operator to edit in the UI.
  Agents append to versioned/AI siblings instead. When unsure, the path's
  description in the schema usually says.
- **Respect your cadence.** If you've been scheduled to run daily, don't
  poll hourly without a reason. If hourly, don't burst hundreds of calls.

## Status codes that aren't bugs

| Status | Meaning | What to do |
|---|---|---|
| 401 | Token missing, malformed, or expired | Stop. Ask the operator for a fresh one. Do not retry. |
| 403 | Authenticated but the action is forbidden for this user | Read the response body. Do not retry. |
| 404 | Resource doesn't exist or isn't yours | Don't retry; the ID is stale. |
| 409 | Conflict (usually a unique-key collision) | If your goal was idempotent insert, treat as success. |
| 422 | Payload doesn't match the schema | Re-read the schema for that path, fix the body, retry once. |
| 5xx | Server error | Backoff with jitter. Alert if it persists. |
${capsBlock}
## When you can't make progress

If you've tried what the schema says and it still doesn't work, surface it to
the operator with specifics: which endpoint, what payload, what status, what
the response body said. Don't loop. The operator can:

- Mint a fresh token (profile → Agent tokens → Generate).
- Confirm or correct the base URL.
- Check server logs you can't see.

---

*This guide was generated by ${appName} at \`${base}\`. The endpoint list is
intentionally not pinned here — fetch \`${base}/api/openapi.json\` for that.*
`
}

/**
 * Trigger a browser download of the given markdown content as a file named
 * \`<appName>-agent.md\`.
 */
export function downloadSkill(appName: string, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${appName}-agent.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
