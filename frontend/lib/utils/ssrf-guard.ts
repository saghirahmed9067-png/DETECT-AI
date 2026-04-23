/**
 * SSRF Guard — block requests to private/internal IP ranges and loopback.
 * Call before any server-side fetch of user-supplied URLs.
 */

const BLOCKED_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  'metadata.google.internal', '169.254.169.254',
])

function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges
  const v4 = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.)/.test(hostname)
  // IPv6 loopback/link-local
  const v6 = /^(::1|fe80:|fc00:|fd)/.test(hostname.toLowerCase())
  return v4 || v6
}

export function assertSafeUrl(rawUrl: string): void {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL format')
  }

  const { protocol, hostname } = parsed

  if (!['http:', 'https:'].includes(protocol)) {
    throw new Error('Only http and https URLs are allowed')
  }

  if (BLOCKED_HOSTS.has(hostname) || isPrivateIP(hostname)) {
    throw new Error('Scanning internal or private network addresses is not allowed')
  }

  // Block port overrides to sensitive internal ports
  const port = parsed.port ? parseInt(parsed.port) : (protocol === 'https:' ? 443 : 80)
  const blockedPorts = new Set([22, 23, 25, 110, 143, 3306, 5432, 6379, 27017])
  if (blockedPorts.has(port)) {
    throw new Error('Scanning on this port is not allowed')
  }
}
