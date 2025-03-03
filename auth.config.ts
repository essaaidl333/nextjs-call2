import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },callbacks: {
    
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    
    // session({ session, user }) {
    //   // I skipped the line below coz it gave me a TypeError
    //   // session.accessToken = token.accessToken;
    //   session.user.id = user.id;

    //   return session;
    // },
   
  },
  providers: [Google],
  
  secret: process.env.NEXT_PUBLIC_SECRET, // Add providers with an empty array for now
} satisfies NextAuthConfig;