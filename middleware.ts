import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // 使用正则表达式排除测试端点和聊天页面
  matcher: [
    '/api/((?!test-bailian|test-deepseek|test-deepseek-chat|chat).*))',
    '/login', 
    '/register'
  ],
};
