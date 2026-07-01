import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || 'Ov23lil7NUzkWkozbS3Q',
      clientSecret: process.env.AUTH_GITHUB_SECRET || 'd1d9a589b0a5c864898d1d3a7f4d7b95f5d0c644',
    }),
  ],
  secret: process.env.AUTH_SECRET || 'AJe1vFdPfa0/yXfAwmRgXIEpD7b6mPTbd+kzPGrX57s=',
  trustHost: true,
  callbacks: {
    session({ session }) {
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})
