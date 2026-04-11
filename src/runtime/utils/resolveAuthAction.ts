export type AuthAction = 'allow' | 'unauthorized' | 'redirect'

// Route-level configuration for Keycloak protection
// Defined via Nuxt routeRules
export type KeycloakRouteRules = {
  keycloak?: boolean
}

export type DecisionInput = {
  rules?: KeycloakRouteRules
  mode: 'protect-all' | 'protect-selected'
  accept?: string
}

export type AuthDecision = {
  action: AuthAction
  isProtected: boolean
  isHtmlRequest: boolean
}

// Resolves how a request should be handled based on:
// - global module mode (protect-all vs protect-selected)
// - route-level overrides (rules.auth)
// - request type (HTML vs API)
//
// This function is the central decision engine of the auth flow.
export function resolveAuthAction(input: DecisionInput): AuthDecision {
  const { rules = {}, mode, accept = '' } = input

  // Extract route-level flag (can be true | false | undefined)
  const keycloak = rules.keycloak

  // Determine whether the route is protected:
  // - protect-all: everything protected unless explicitly disabled
  // - protect-selected: only protected if explicitly enabled
  const isProtected = mode === 'protect-all' ? keycloak !== false : keycloak === true

  // Note:
  // Accept header is used as a heuristic to distinguish browser navigation
  // from programmatic/API requests. This may not be 100% reliable in all cases.
  // Detect HTML requests via Accept header
  // → used to decide between redirect (browser) and 401 (API)
  const isHtmlRequest = accept.toLowerCase().includes('text/html')

  let action: AuthAction

  // Not protected → always allow
  if (!isProtected) {
    action = 'allow'

    // Protected + HTML → redirect to login
  } else if (isHtmlRequest) {
    action = 'redirect'

    // Protected + non-HTML (API, fetch, etc.) → return 401
  } else {
    action = 'unauthorized'
  }

  return {
    action,
    isProtected,
    isHtmlRequest,
  }
}
