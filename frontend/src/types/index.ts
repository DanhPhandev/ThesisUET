export type Role = "USER" | "SETTER" | "ADMIN";
export type User = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  school?: string | null;
  role: Role;
  status: string;
};
export type Problem = {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags?: string | { name: string; slug: string }[];
  visibility?: string;
  submission_count?: number;
  accepted_count?: number;
  input_format?: string;
  output_format?: string;
  constraints_text?: string;
  samples?: { id: number; input: string; expected_output: string }[];
  time_limit_ms?: number;
  memory_limit_mb?: number;
};
export type Submission = {
  id: number;
  username: string; // profile URL identifier
  full_name?: string | null;
  problem_title: string;
  problem_slug: string;
  language: string;
  verdict: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  created_at: string;
  source_code?: string;
  compile_output?: string;
  tests?: {
    order_index: number;
    verdict: string;
    time_ms: number;
    memory_kb: number;
  }[];
};
export type Contest = {
  id: number;
  slug: string;
  title: string;
  description: string;
  rule: string;
  status: string;
  start_time: string;
  end_time: string;
  phase: string;
  participants: number;
  registered?: boolean;
  problems?: {
    label: string;
    problem_id: number;
    title: string;
    difficulty: string;
  }[];
};
export type Page<T> = {
  content: T[];
  page: number;
  totalElements: number;
  totalPages: number;
};
