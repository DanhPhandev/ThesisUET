# CodeUET Frontend — Next.js App Router + Tailwind CSS

Đây là phiên bản được tái cấu trúc từ project gốc `frontend(2).zip`.

## Yêu cầu

- Node.js 20+ (khuyến nghị Node.js 22)
- Backend Spring Boot riêng biệt có thể truy cập từ Next.js

## Chạy ở máy local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Mở http://localhost:3000. Nếu sử dụng PowerShell, có thể chạy:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Trong `.env.local`:

```env
API_INTERNAL_URL=http://localhost:8080
```

Next.js proxy `/api/v1/*` sang `${API_INTERNAL_URL}/api/v1/*` (trong `next.config.mjs`). Frontend gọi API bằng URL tương đối, vì vậy tránh được các vấn đề CORS thường gặp khi gọi trực tiếp backend từ trình duyệt.

```bash
npm run lint   # Kiểm tra TypeScript
npm run build  # Build production
npm run start
```

Backend và frontend chạy riêng trên máy; đặt `API_INTERNAL_URL=http://localhost:8080`. Chỉ clangd và Judge0 (nếu dùng chấm bài) chạy trong Docker.

## Cấu trúc

```text
src/
├── app/
│   ├── (auth)/login, register
│   ├── practice/[slug]/, problems/[slug]/
│   ├── contests/[slug]/arena/[label], standings
│   ├── submissions/[id]/, leaderboard/, profile/, settings/
│   ├── management/, setter/, admin/
│   ├── layout.tsx, globals.css
│   └── page.tsx
├── components/
│   ├── layout/       # Header, Footer, SiteShell, LegacyPage
│   ├── ui/           # Button, Input, Loading, Status, NotFound
│   └── problems/     # ProblemCard, CodeEditor
├── features/
│   ├── auth/         # AuthProvider, LoginForm, API auth
│   ├── problems/     # Home, ProblemList, ProblemDetails
│   ├── submissions/  # SubmissionList, SubmissionDetails
│   ├── contests/     # ContestList, ContestDetails, Arena, Standings, Leaderboard
│   ├── users/        # Profile, Settings
│   └── management/   # Setter, Admin, ContestEditor
├── hooks/            # useAuth, useApi
├── lib/              # api.ts, api-error.ts, legacy.json
├── types/            # Domain types
└── providers/        # ToastProvider
```

## Thông báo API với `react-hot-toast`

Toaster toàn cục được đặt trong `src/providers/ToastProvider.tsx` và sử dụng ở `src/app/layout.tsx`.

Client tập trung tại `src/lib/api.ts`:

- Thất bại của GET, POST, PUT, PATCH, DELETE: `toast.error()` (lỗi network/HTTP và message từ backend).
- Thành công của POST, PUT, PATCH, DELETE: `toast.success()`; GET thành công **không** hiện toast để tránh spam khi tải danh sách, tìm kiếm, polling.
- `silent: true`: tắt thông báo cho refresh token, polling hoặc các request nền.
- Toast ID theo method/path giúp hạn chế thông báo trùng khi request diễn ra đồng thời.

Ví dụ:

```tsx
import { api } from "@/lib/api";

async function createProblem(payload: unknown) {
  // Tự động toast.success khi thành công, toast.error khi thất bại
  return api.post("/problems", payload, {
    successMessage: "Tạo bài tập thành công",
  });
}

async function loadProblems() {
  return api.get("/problems?page=0&size=15");
}
```

`AuthProvider` sử dụng refresh token cookie (`credentials: 'include'`), access token trong bộ nhớ. Các route riêng có `RequireAuth` sẽ chuyển về `/login?next=...` khi chưa xác thực, và `RequireAuth role="SETTER" / role="ADMIN"` kiểm tra quyền UI.

## Các đường dẫn quan trọng

| Route                                    | Trang                         |
| ---------------------------------------- | ----------------------------- |
| `/`                                      | Trang chủ                     |
| `/login`, `/register`                    | Đăng nhập, đăng ký            |
| `/practice`, `/practice/[slug]`          | Danh sách và chi tiết bài tập |
| `/problems`, `/problems/[slug]`          | Tương thích URL cũ            |
| `/submissions`, `/submissions/[id]`      | Bài đã nộp                    |
| `/contests`, `/contests/[slug]`          | Cuộc thi                      |
| `/contests/[slug]/arena/[label]`         | Phòng thi và đề thi           |
| `/contests/[slug]/standings`             | Bảng điểm cuộc thi            |
| `/leaderboard`                           | Bảng xếp hạng                 |
| `/profile`, `/u/[username]`, `/settings` | Hồ sơ, cài đặt                |
| `/management/*`, `/setter/*`, `/admin/*` | Quản lý và quản trị           |

Các trang nội dung tĩnh trước đây (courses, blog, about, ...) vẫn được giữ bằng `LegacyPage` và các class tương thích viết bằng Tailwind `@apply`. Tính năng thực tế phụ thuộc vào endpoint backend sẵn có.

**Lưu ý:** `PATCH /api/v1/users/me` hỗ trợ cập nhật từng trường `fullName`, `bio`, `school`. Hãy kiểm tra backend thực tế trước khi thay đổi `User`, `Problem`, `Submission`, `Contest` và DTO request. Các request có quyền phải được backend kiểm tra quyền, không chỉ dựa vào guard phía frontend.

## Trình soạn thảo Python/C++: autocomplete, hover, lỗi trực tiếp

Tích hợp trong `src/components/problems/CodeEditor.tsx`, được sử dụng tự động ở trang **luyện tập** và **phòng thi** qua `features/problems/ProblemDetails.tsx`:

| Ngôn ngữ | Language server                                 | Nơi chạy                                                     | Chức năng                                                                                   |
| -------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Python 3 | Pyright Browser Worker 1.1.299 + 579 type stubs | **Trong trình duyệt**, không cần backend khác                | Gợi ý theo ngữ nghĩa, hover, tham số hàm, phát hiện lỗi, nhảy tới định nghĩa trong file     |
| C++17    | clangd LSP                                      | **Dịch vụ WebSocket** chạy bằng Node.js + clangd hoặc Docker | Gợi ý thành viên/hàm C++, hover, tham số hàm, phát hiện lỗi, nhảy tới định nghĩa trong file |
| Java     | Monaco mặc định                                 | Trình duyệt                                                  | Tô màu cú pháp/gợi ý cơ bản (không có LSP)                                                  |

Khi chọn **C++ (GCC)** hoặc **Python 3**, hệ thống tự kết nối language server. Nhấn `Ctrl + Space` để gợi ý, di chuột lên biến/hàm để xem kiểu/mô tả, hoặc gõ lỗi để xem đường gạch chân trong Monaco. Thanh trạng thái bên dưới editor hiển thị `đang hoạt động`, `đang kết nối`, `chưa kết nối`; khi lỗi kết nối sẽ hiện thông báo với `react-hot-toast`.

**Python:** Các file `public/language/python/pyright.worker.js` và `typeshed.json` đã nằm trong project, không cần cài Pyright hoặc Python riêng để dùng gợi ý. Type stubs được bổ sung từ bộ `typeshed-fallback` trong mã nguồn `monaco-pyright-lsp-main.zip`. Các file giấy phép của Pyright và typeshed ở cùng thư mục.

**C++:** Cần chạy dịch vụ `language-server/` kèm theo bản ZIP hoàn chỉnh, không thể dùng trực tiếp `.vsix` của VS Code trong Monaco. Xem `../README.md` để chạy dịch vụ bằng Docker hoặc bằng Node.js. C++ cũng cần bộ C++ standard headers trên máy chạy clangd để gợi ý tốt cho `<vector>`, `<bits/stdc++.h>`.

Địa chỉ WebSocket mặc định được chọn theo hostname trong trình duyệt: `ws://localhost:6061/lsp` khi frontend chạy ở `http://localhost:3000`, hoặc `wss://...` khi frontend dùng HTTPS. Để cấu hình riêng, thêm vào `.env.local` rồi khởi động lại Next.js:

```env
NEXT_PUBLIC_CLANGD_WS_URL=ws://localhost:6061/lsp
```

Khi triển khai frontend HTTPS, hãy sử dụng **WSS** sau reverse proxy; trình duyệt thường chặn WS không mã hóa từ trang HTTPS. Cũng cần cấu hình `ALLOWED_ORIGINS` của dịch vụ clangd tương ứng.

Các phần code chính:

- `src/lib/language/lsp.ts`: giao tiếp JSON-RPC/LSP, Pyright Web Worker, clangd WebSocket
- `src/lib/language/monaco-lsp.ts`: kết nối Monaco providers cho completion/hover/signature/diagnostics/definition
- `src/components/problems/CodeEditor.tsx`: khởi tạo/đóng phiên khi mount, unmount hoặc đổi ngôn ngữ, thanh trạng thái và toast lỗi
- `public/language/python/`: Pyright worker + typeshed + licenses
- `../language-server/`: WebSocket ↔ clangd stdio, kiểm thử LSP và Dockerfile

**Lưu ý:** Phát hiện lỗi cú pháp/kiểu bằng Pyright/clangd là hỗ trợ tại editor, không thay thế cho việc thực thi, biên dịch và chấm bài bởi backend/Judge0. Nút Chạy thử và Nộp bài vẫn sử dụng API ban đầu.


**Cập nhật hồ sơ:** Đăng nhập, mở `/profile` và chọn “Chỉnh sửa hồ sơ” để sửa họ tên, giới thiệu và trường học trực tiếp. Backend cũng hỗ trợ endpoint cũ `PUT /api/v1/users/me`.
