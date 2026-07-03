import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || '',
      clientSecret: process.env.AUTH_GITHUB_SECRET || '',
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      // Minimize session data — only first name, no full profile
      if (session.user) {
        session.user.name = token.name || (session.user.name?.split(' ')[0]) || 'User'
        // Strip image URL for privacy
        session.user.image = undefined
      }
      return session
    },
    jwt({ token, profile }) {
      if (profile) {
        token.name = (profile as any)?.name?.split(' ')[0]
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
})
