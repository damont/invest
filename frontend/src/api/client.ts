export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

class ApiClient {
  private baseUrl = ''

  getToken(): string | null {
    return localStorage.getItem('token')
  }

  setToken(token: string) {
    localStorage.setItem('token', token)
  }

  clearToken() {
    localStorage.removeItem('token')
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401) {
      this.clearToken()
      throw new ApiError(401, 'Unauthorized')
    }

    if (!res.ok) {
      const detail = await res.json().catch(() => ({ detail: `API error ${res.status}` }))
      const msg = typeof detail.detail === 'string' ? detail.detail : `API error ${res.status}`
      throw new ApiError(res.status, msg)
    }

    if (res.status === 204) return undefined as T
    return res.json()
  }

  get<T>(path: string) { return this.request<T>('GET', path) }
  post<T>(path: string, body?: unknown) { return this.request<T>('POST', path, body) }
  put<T>(path: string, body: unknown) { return this.request<T>('PUT', path, body) }
  patch<T>(path: string, body: unknown) { return this.request<T>('PATCH', path, body) }
  delete<T>(path: string) { return this.request<T>('DELETE', path) }

  // ----- Auth-flavored helpers -----

  async googleLogin(idToken: string) {
    return this.post<{ access_token: string; token_type: string }>(
      '/api/auth/google',
      { id_token: idToken },
    )
  }

  async verifyEmail(token: string) {
    return this.post<{ access_token: string; token_type: string }>(
      '/api/auth/verify-email',
      { token },
    )
  }

  async resendVerification(email: string) {
    return this.post<{ message: string }>('/api/auth/resend-verification', { email })
  }

  async agentToken(expiresInDays: number) {
    return this.post<{ access_token: string; token_type: string; expires_in_days: number }>(
      '/api/auth/agent-token',
      { expires_in_days: expiresInDays },
    )
  }
}

export const api = new ApiClient()
