"use client";
import { ContestDetails } from "@/features/contests/ContestDetails";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <ContestDetails slug={String(params.slug)}/>;}
