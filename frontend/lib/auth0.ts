import { Auth0Client } from '@auth0/nextjs-auth0/server'

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_ISSUER_BASE_URL?.replace('https://', '') ?? '',
  clientId: process.env.AUTH0_CLIENT_ID ?? '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET ?? '',
  appBaseUrl: process.env.AUTH0_BASE_URL ?? 'https://detectai-platform.netlify.app',
  secret: process.env.AUTH0_SECRET ?? 'placeholder-secret-for-build',
  authorizationParameters: {
    scope: 'openid profile email',
    redirect_uri: `${process.env.AUTH0_BASE_URL ?? 'https://detectai-platform.netlify.app'}/api/auth/callback`,
  },
})
