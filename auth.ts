import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

const providers = []

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  }))
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})
