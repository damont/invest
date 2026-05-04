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
  it('embeds the base URL on the discovery URLs and never trailing-slashes', () => {
    const md = agentSkill({ ...sample, baseUrl: 'https://demo.example.com/' })
    expect(md).toContain('GET https://demo.example.com/api/openapi.json')
    expect(md).toContain('https://demo.example.com/api/agent')
    expect(md).not.toContain('https://demo.example.com//api')
  })

  it('does not list any specific endpoint path', () => {
    // Bootstrap rule: tell the agent to read the schema, do not pin endpoints here.
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
    expect(md).toContain('## Typical tasks')
    expect(md).toContain('- do a thing')
  })

  it('omits the capabilities section when none are supplied', () => {
    const md = agentSkill({ ...sample, capabilities: undefined })
    expect(md).not.toContain('## Typical tasks')
  })

  it('includes the failure-modes table so agents self-correct', () => {
    const md = agentSkill(sample)
    expect(md).toContain('| 401 |')
    expect(md).toContain('| 422 |')
  })
})
