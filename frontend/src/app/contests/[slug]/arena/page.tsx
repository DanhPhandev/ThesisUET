"use client";
import { ContestArena } from "@/features/contests/ContestArena";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <ContestArena slug={String(params.slug)}/>;}
