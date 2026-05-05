import { describe, expect, it } from 'vitest'
import { agentSkill } from './agentSkill'

const sample = {
  appName: 'demo',
  baseUrl: 'https://demo.example.com',
  description: 'demo is a placeholder.',
  dataModel: 'There is one Thing.',
  capabilities: ['do a thing', 'do another thing'],
}

describe('agentSkill template', () => {
  it('mentions the current base URL but uses <base> placeholders for discovery', () => {
    // Discovery paths are templated with <base> so the agent treats them as
    // substitutable — the operator may have moved the host since the file
    // was generated.
    const md = agentSkill(sample)
    expect(md).toContain('<base>/api/openapi.json')
    expect(md).toContain('<base>/api/agent')
    // The literal base URL only shows up as context (most-recent-known + footer),
    // never embedded in the canonical discovery URL.
    expect(md).toContain('https://demo.example.com')
  })

  it('strips a trailing slash from baseUrl in any literal mention', () => {
    const md = agentSkill({ ...sample, baseUrl: 'https://demo.example.com/' })
    expect(md).not.toContain('https://demo.example.com//')
  })

  it('does not list any specific endpoint path', () => {
    // Bootstrap rule: tell the agent to read the schema, never pin endpoints.
    const md = agentSkill(sample)
    expect(md).not.toMatch(/\/api\/(stocks|things|tasks|users)\b/)
  })

  it('does not embed any token-shaped value', () => {
    const md = agentSkill(sample)
    // JWTs always start with eyJ; ensure we never accidentally bake one in.
    expect(md).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/)
  })

  it('renders the optional capabilities list when provided', () => {
    const md = agentSkill(sample)
    expect(md).toContain('## Typical tasks an operator will give you')
    expect(md).toContain('- do a thing')
  })

  it('omits the capabilities section when none are supplied', () => {
    const md = agentSkill({ ...sample, capabilities: undefined })
    expect(md).not.toContain('## Typical tasks an operator will give you')
  })

  it('includes the failure-modes table so agents self-correct', () => {
    const md = agentSkill(sample)
    expect(md).toContain('| 401 |')
    expect(md).toContain('| 422 |')
  })

  it('tells the agent what to ask the operator for', () => {
    // The whole point of the redesigned guide: it's setup-time instructions.
    const md = agentSkill(sample)
    expect(md).toContain('What you need before you can call anything')
    expect(md).toMatch(/ask the operator/i)
    expect(md).toContain('Authorization: Bearer')
  })
})
