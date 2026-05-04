import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRouter } from './useRouter'

describe('useRouter', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('navigate() updates window.location and the hook state', () => {
    const { result } = renderHook(() => useRouter())
    expect(result.current.path).toBe('/')

    act(() => result.current.navigate('/stocks'))
    expect(window.location.pathname).toBe('/stocks')
    expect(result.current.path).toBe('/stocks')
  })

  it('two independent useRouter instances stay in sync via the custom event', () => {
    // Regression: previously each useRouter had its own private state,
    // so a navigate() in component A would not re-render component B.
    const { result: a } = renderHook(() => useRouter())
    const { result: b } = renderHook(() => useRouter())

    act(() => a.current.navigate('/profile'))
    expect(a.current.path).toBe('/profile')
    expect(b.current.path).toBe('/profile')
  })

  it('responds to popstate (browser back/forward)', () => {
    const { result } = renderHook(() => useRouter())
    act(() => result.current.navigate('/stocks'))
    act(() => {
      window.history.replaceState({}, '', '/profile')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(result.current.path).toBe('/profile')
  })
})
