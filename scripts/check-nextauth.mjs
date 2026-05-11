import NextAuth from 'next-auth';
import { authConfig } from '../src/server/auth/config.js';

console.log('NextAuth type:', typeof NextAuth);
console.log('NextAuth name:', NextAuth?.name);

const result = NextAuth(authConfig);
console.log('NextAuth result type:', typeof result);
console.log('NextAuth result:', Object.keys(result));
console.log('handler is function?', typeof result === 'function');
console.log('handler.apply type:', typeof (result && result.apply));
