"use client";
import { ProblemDetails } from "@/features/problems/ProblemDetails";
import { useParams } from "next/navigation";
export default function Page(){const params=useParams(); return <ProblemDetails slug={String(params.slug)}/>;}
