import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import bcrypt from 'bcrypt';
import { User } from './app/lib/definitions';
import postgres from 'postgres';
 
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
//定义一个函数，根据email从数据库中获取用户信息
async function getUser(email: string) {
  //从数据库中获取用户信息
  try{
   const user = await sql<User[]> `SELECT * FROM users WHERE email = ${email}`;
  return user[0];
  }catch(error){
    console.error('Error fetching user from database:', error);
    return null;
  }
  
}
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        //验证用户凭据
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
        //如果验证成功，获取数据库中相应的用户信息并返回
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          //根据email从数据库中获取用户信息
          const user = await getUser(email);
          if (!user) return null;
          //进行密码匹配，如果匹配成功，返回用户信息，否则返回null
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
});