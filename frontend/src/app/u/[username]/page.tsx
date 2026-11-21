"use client";
import { Profile } from "@/features/users/Profile";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <Profile username={String(params.username)}/>;}
