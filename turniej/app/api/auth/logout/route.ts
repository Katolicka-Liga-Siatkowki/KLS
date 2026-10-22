import {cookies} from 'next/headers';
import {sameOrigin,sessionCookie} from '@/lib/auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return Response.json({error:'Niedozwolone żądanie.'},{status:403});
 (await cookies()).set(sessionCookie,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 return Response.redirect(new URL('/',request.url),303);
}
