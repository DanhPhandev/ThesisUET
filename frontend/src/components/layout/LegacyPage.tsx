"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type Problem, type Submission, type Contest, type Page, q } from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import { Banner, Alert, Empty, Loading, Difficulty, Verdict, formatTime } from "@/components/ui/Status";
import legacy from "@/lib/legacy.json";
import { NotFound } from "@/components/ui/NotFound";
export function LegacyPage({ name }: { name: string }) {
  const raw = (legacy as Record<string, string>)[name];
  return raw ? (
    <div className="legacy-static" dangerouslySetInnerHTML={{ __html: raw }} />
  ) : (
    <NotFound />
  );
}
