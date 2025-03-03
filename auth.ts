import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

import Credentials from 'next-auth/providers/credentials';
//import sql from '@/app/lib/db_config';


import Google from "next-auth/providers/google";




export const {handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google,
  
  ],
  callbacks: { 
  },
  secret: process.env.NEXTAUTH_SECRET,

});