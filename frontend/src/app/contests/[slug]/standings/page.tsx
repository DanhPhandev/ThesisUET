"use client";
import { Standings } from "@/features/contests/Standings";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <Standings slug={String(params.slug)}/>;}
