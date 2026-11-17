import './globals.css';
export const metadata = {title:'Centrum Turnieju | Siatkówka',description:'Terminarz, wyniki na żywo i zarządzanie turniejem siatkówki.',applicationName:'Gramy Razem - Turnieje',manifest:'/manifest.webmanifest',icons:{icon:[{url:'/icons/favicon.png',sizes:'32x32',type:'image/png'},{url:'/icons/icon-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/icons/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,title:'Gramy Razem - Turnieje',statusBarStyle:'default'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#292f3b'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pl"><body>{children}</body></html>}
