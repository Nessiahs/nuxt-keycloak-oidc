import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setKeycloakConfig } from './utils/setKeycloakConfig'
import middleware from '../src/runtime/server/middleware/auth'

// ---------------- HOISTED MOCKS ----------------
const {
  mockGetRequestURL,
  mockResolveAuthAction,
  mockResolveTokenState,
  mockAttachAuthContext,
  mockHandleRefreshFlow,
  mockHandleUnauthorized,
  mockCreateError,
} = vi.hoisted(() => ({
  mockGetRequestURL: vi.fn(),
  mockResolveAuthAction: vi.fn(),
  mockResolveTokenState: vi.fn(),
  mockAttachAuthContext: vi.fn(),
  mockHandleRefreshFlow: vi.fn(),
  mockHandleUnauthorized: vi.fn(),
  mockCreateError: vi.fn((err) => err),
}))

// ---------------- MODULE MOCKS ----------------
vi.mock('h3', () => ({
  getRequestURL: mockGetRequestURL,
  defineEventHandler: (fn: any) => fn,
  createError: mockCreateError,
}))

vi.mock('../src/runtime/utils/resolveAuthAction', () => ({
  resolveAuthAction: mockResolveAuthAction,
}))

vi.mock('../src/runtime/utils/resolveTokenState', () => ({
  resolveTokenState: mockResolveTokenState,
}))

vi.mock('../src/runtime/utils/attachAuthContext', () => ({
  attachAuthContext: mockAttachAuthContext,
}))

vi.mock('../src/runtime/utils/handleRefreshFlow', () => ({
  handleRefreshFlow: mockHandleRefreshFlow,
}))

vi.mock('../src/runtime/utils/handleUnauthorized', () => ({
  handleUnauthorized: mockHandleUnauthorized,
}))

// ---------------- TESTS ----------------
describe('auth middleware', () => {
  let event: any

  beforeEach(() => {
    vi.clearAllMocks()

    // 🔥 reset config (global mock)
    setKeycloakConfig({
      mode: 'protect-all',
    })

    event = {
      context: {},
      node: { req: { headers: {} } },
    }
  })

  // ---------------------------------------------------------------------------
  // SKIP INTERNAL ROUTES
  // ---------------------------------------------------------------------------
  it('skips internal oidc routes', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/api/_oidc/login' })

    await middleware(event)

    expect(mockResolveAuthAction).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // ALLOW
  // ---------------------------------------------------------------------------
  it('returns early when action is allow', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'allow',
    })

    await middleware(event)

    expect(mockResolveTokenState).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // UNAUTHORIZED (direct)
  // ---------------------------------------------------------------------------
  it('throws 401 when action is unauthorized', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'unauthorized',
    })

    await expect(middleware(event)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  // ---------------------------------------------------------------------------
  // VALID ACCESS TOKEN
  // ---------------------------------------------------------------------------
  it('attaches context when access token is valid and not expiring', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'redirect',
      isHtmlRequest: true,
    })

    mockResolveTokenState.mockResolvedValue({
      hasAccess: true,
      hasRefresh: false,
      accessPayload: { exp: Math.floor(Date.now() / 1000) + 60 },
    })

    await middleware(event)

    expect(mockAttachAuthContext).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // NO ACCESS TOKEN
  // ---------------------------------------------------------------------------
  it('calls handleUnauthorized when no access token', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'redirect',
      isHtmlRequest: true,
    })

    mockResolveTokenState.mockResolvedValue({
      hasAccess: false,
      hasRefresh: false,
    })

    await middleware(event)

    expect(mockHandleUnauthorized).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // EXPIRING TOKEN + REFRESH SUCCESS
  // ---------------------------------------------------------------------------
  it('refreshes token when expiring and refresh succeeds', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'redirect',
      isHtmlRequest: true,
    })

    mockResolveTokenState.mockResolvedValue({
      hasAccess: true,
      hasRefresh: true,
      accessPayload: { exp: Math.floor(Date.now() / 1000) + 10 },
    })

    mockHandleRefreshFlow.mockResolvedValue(true)

    await middleware(event)

    expect(mockHandleRefreshFlow).toHaveBeenCalled()
    expect(mockHandleUnauthorized).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // EXPIRING TOKEN + REFRESH FAIL
  // ---------------------------------------------------------------------------
  it('falls back to unauthorized if refresh fails', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'redirect',
      isHtmlRequest: true,
    })

    mockResolveTokenState.mockResolvedValue({
      hasAccess: true,
      hasRefresh: true,
      accessPayload: { exp: Math.floor(Date.now() / 1000) + 10 },
    })

    mockHandleRefreshFlow.mockResolvedValue(false)

    await middleware(event)

    expect(mockHandleUnauthorized).toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // NO REFRESH TOKEN
  // ---------------------------------------------------------------------------
  it('falls back to unauthorized if no refresh token', async () => {
    mockGetRequestURL.mockReturnValue({ pathname: '/test' })

    mockResolveAuthAction.mockReturnValue({
      action: 'redirect',
      isHtmlRequest: true,
    })

    mockResolveTokenState.mockResolvedValue({
      hasAccess: true,
      hasRefresh: false,
      accessPayload: { exp: Math.floor(Date.now() / 1000) + 10 },
    })

    await middleware(event)

    expect(mockHandleUnauthorized).toHaveBeenCalled()
  })
})
