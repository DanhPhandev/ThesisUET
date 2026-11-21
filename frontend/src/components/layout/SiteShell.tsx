"use client";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
export function SiteShell({children}:{children:React.ReactNode}){
 const path=usePathname()||"";const isAuth=["/login","/register"].some(p=>path===p);
 return <div className="flex min-h-screen flex-col">{!isAuth&&<Header/>}<main className="min-h-[65vh] flex-1">{children}</main>{!isAuth&&<Footer/>}</div>;
}
