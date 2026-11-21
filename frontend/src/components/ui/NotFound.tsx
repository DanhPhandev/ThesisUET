"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  api,
  type Problem,
  type Submission,
  type Contest,
  type Page,
  q,
} from "@/lib/api";
import { useAuth, RequireAuth } from "@/features/auth/AuthProvider";
import {
  Banner,
  Alert,
  Empty,
  Loading,
  Difficulty,
  Verdict,
  formatTime,
} from "@/components/ui/Status";
export function NotFound() {
  return (
    <section className="section container">
      <div className="empty">
        <h2>404 - Không tìm thấy trang</h2>
        <Link className="btn btn-primary" href="/">
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}
