# CodeUET — Hướng dẫn cài đặt và chạy project

CodeUET là nền tảng luyện tập lập trình trực tuyến, tổ chức cuộc thi và chấm bài tự động. Người học chỉ có thể sử dụng **C++** và **Python 3** để chạy/nộp bài. **Java 21 chỉ dùng để phát triển backend Spring Boot**, không phải ngôn ngữ chấm bài.

> **Cách triển khai tại máy cá nhân:** chạy **backend** và **frontend** riêng, PostgreSQL cài sẵn hoặc dùng server có sẵn; Docker Compose chỉ dùng cho **Judge0** (chấm bài) và **clangd** (gợi ý C++). Không cần Docker để chạy Spring Boot/Next.js.

## 1. Yêu cầu môi trường

| Công cụ                         | Phiên bản/ghi chú                    | Mục đích                       |
| ------------------------------- | ------------------------------------ | ------------------------------ |
| Java JDK                        | **21**                               | Chạy backend Spring Boot 3.3.6 |
| Apache Maven                    | **3.9+**                             | Build/chạy backend             |
| Node.js và npm                  | **Node.js 22** khuyến nghị           | Chạy frontend Next.js 15.4.6   |
| PostgreSQL                      | **16** khuyến nghị                   | Database chính của CodeUET     |
| Docker Desktop + Docker Compose | Tùy chọn, bật WSL 2 nếu dùng Windows | Chạy Judge0 và clangd          |
| DBeaver/pgAdmin                 | Tùy chọn                             | Quản lý PostgreSQL             |

Kiểm tra trong PowerShell:

```powershell
java -version
mvn -version
node -v
npm -v
docker compose version
```

Nếu không sử dụng Docker, bạn vẫn có thể mở website, đăng nhập, tạo bài và quản lý tài khoản; **Run/Submit cần có Judge0**, còn gợi ý C++ cần clangd. **Pyright gợi ý Python chạy ngay trong trình duyệt**, không cần container.

## 2. Cấu trúc thư mục

```text
CodeUET/
├── backend/                       # Spring Boot / Maven / REST API
│   ├── pom.xml
│   └── src/main/resources/
│       ├── application.yml       # Cấu hình mặc định
│       └── db/migration/         # Flyway migrations V1, V2, V3
├── frontend/                      # Next.js / React / Tailwind CSS
│   ├── package.json
│   └── .env.example
├── language-server/               # clangd WebSocket bridge
├── docker-compose.language.yml    # Chỉ chạy clangd
├── docker-compose.judge.yml       # Chỉ chạy Judge0 + DB/Redis riêng
├── judge0.conf                    # Cấu hình Judge0 local
├── SEED_10_PROBLEMS.md            # Hướng dẫn 10 bài tập mẫu
└── README.md
```

Các lệnh dưới đây giả định bạn **đã giải nén ZIP và đang đứng ở thư mục `CodeUET/`**, nơi có hai file `docker-compose.*.yml`.

## 3. Chuẩn bị PostgreSQL

### Cách A — Dùng database hiện có

Nếu PostgreSQL của bạn đang chạy ở cổng **5433**, database **course**, username **admin**, giữ nguyên database và cấu hình tương ứng tại mục 4. Đây là **ví dụ theo cấu hình mặc định trong project**; hãy thay bằng thông tin thật của bạn. **Không xóa dữ liệu hoặc tạo lại bảng thủ công.**

### Cách B — Tạo database mới

Kết nối PostgreSQL bằng tài khoản quản trị qua DBeaver/pgAdmin/psql, sau đó thực hiện lần lượt:

```sql
CREATE USER codeuet WITH PASSWORD 'replace_with_a_strong_password';
CREATE DATABASE codeuet OWNER codeuet;
```

Địa chỉ JDBC khi PostgreSQL chạy ở cổng **5432** là:

```text
jdbc:postgresql://localhost:5432/codeuet
```

Backend sử dụng **Flyway** tự tạo/cập nhật schema khi khởi động, bao gồm extension `citext`, các bảng dữ liệu và migration vô hiệu hóa Java để nộp bài. Tài khoản database phải có đủ quyền tạo đối tượng trong database. Nếu dùng database cũ có schema chưa được Flyway quản lý, **hãy sao lưu và kiểm tra lịch sử migration trước**, không chạy lại V1 lên dữ liệu đã tồn tại.

## 4. Khởi động backend Spring Boot

Mở **PowerShell số 1** trong thư mục `CodeUET/`:

```powershell
cd backend

# Ví dụ: PostgreSQL hiện có trên localhost:5433/course.
$env:DB_URL = 'jdbc:postgresql://localhost:5433/course'
$env:DB_USER = 'admin'
$env:DB_PASSWORD = 'YOUR_POSTGRES_PASSWORD'

# Khóa ký JWT phải dài ít nhất 32 ký tự.
$env:JWT_SECRET = 'replace_with_a_long_random_secret_at_least_32_chars'

# Tạo tài khoản quản trị trong database mới (tùy chọn).
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'Admin123456!'

mvn spring-boot:run
```

Nếu dùng database `codeuet` mới ở cổng 5432, **thay ba biến `DB_URL`, `DB_USER`, `DB_PASSWORD`** bằng:

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/codeuet'
$env:DB_USER = 'codeuet'
$env:DB_PASSWORD = 'replace_with_a_strong_password'
```

**Lưu ý về tài khoản admin:** Khi `ADMIN_EMAIL` và `ADMIN_PASSWORD` được thiết lập, bootstrap chỉ tạo tài khoản mới nếu email chưa có; tài khoản mới có `username = admin`, quyền `ADMIN`. Nếu email đã tồn tại, chương trình **không tự nâng quyền**. Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số. Thay các mật khẩu/secret ví dụ trước khi sử dụng và **không commit thông tin thật lên Git**.

Khi backend khởi động thành công, kiểm tra:

- API: `http://localhost:8080`
- Health: `http://localhost:8080/actuator/health`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Danh sách bài: `http://localhost:8080/api/v1/problems`
- Danh sách ngôn ngữ: `http://localhost:8080/api/v1/languages` (chỉ C++ và Python 3)

> **Quan trọng:** Spring Boot đọc các biến `$env:...` trong phiên terminal đang chạy, **không tự động đọc file `.env` ở thư mục gốc**. Mỗi cửa sổ PowerShell mới cần thiết lập lại các biến cần dùng.

## 5. Khởi động frontend Next.js

Mở **PowerShell số 2** tại thư mục `CodeUET/`:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Mở `frontend/.env.local`, cấu hình:

```env
# Next.js chuyển tiếp /api/* tới backend Spring Boot.
API_INTERNAL_URL=http://localhost:8080

# Tùy chọn: C++ clangd LSP khi dùng Docker ở mục 6.
NEXT_PUBLIC_CLANGD_WS_URL=ws://localhost:6061/lsp

# Tùy chọn: Google Login.
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

Mở trình duyệt: **http://localhost:3000**. Giữ cả hai terminal backend và frontend đang chạy. Nếu thay đổi `.env.local`, cần **dừng và chạy lại** `npm run dev`.

Các đường dẫn chính:

| Đường dẫn                    | Chức năng                                               |
| ---------------------------- | ------------------------------------------------------- |
| `/`                          | Trang chủ                                               |
| `/login`, `/register`        | Đăng nhập, đăng ký                                      |
| `/practice` hoặc `/problems` | Luyện tập, lựa chọn C++ / Python                        |
| `/contests`                  | Danh sách cuộc thi                                      |
| `/submissions`               | Lịch sử bài đã nộp (user chỉ xem bài của mình)          |
| `/leaderboard`               | Bảng xếp hạng (hiển thị `fullName`)                     |
| `/profile`                   | Hồ sơ, chỉnh sửa tiểu sử/trường học, xác nhận đăng xuất |
| `/admin/user`                | **ADMIN**: quản lý người dùng và thay đổi quyền         |

## 6. Bật gợi ý C++ bằng clangd (Docker tùy chọn)

Mở **PowerShell số 3** trong **thư mục gốc `CodeUET/`**:

```powershell
docker compose -f docker-compose.language.yml up -d --build
docker compose -f docker-compose.language.yml ps
```

Kiểm tra trong trình duyệt: `http://localhost:6061/health`. WebSocket sử dụng `ws://localhost:6061/lsp`; mặc định chỉ chấp nhận frontend tại `http://localhost:3000` hoặc `http://127.0.0.1:3000`.

- **C++:** clangd hỗ trợ completion, hover, diagnostics trong Monaco Editor; cần container này.
- **Python 3:** Pyright Web Worker được tích hợp trong frontend; không cần Docker.
- **clangd không phải hệ thống chấm bài:** để nhấn **Chạy thử/Nộp bài**, cần Judge0 ở mục 7.

Dừng clangd:

```powershell
docker compose -f docker-compose.language.yml down
```

## 7. Bật chấm bài C++/Python bằng Judge0 (Docker tùy chọn)

Vẫn trong **thư mục gốc `CodeUET/`**, chạy:

```powershell
docker compose -f docker-compose.judge.yml up -d
docker compose -f docker-compose.judge.yml ps
```

Kiểm tra: `http://localhost:2358/languages`. Compose này khởi động `judge0-server`, `judge0-workers`, `judge0-db` và `judge0-redis`. Database `judge0-db` là **database riêng của Judge0**, không thay thế PostgreSQL ứng dụng CodeUET ở mục 3.

Backend mặc định kết nối Judge0 tại `http://localhost:2358`. Nếu Judge0 chạy ở địa chỉ khác, trước khi khởi động backend, đặt:

```powershell
$env:JUDGE0_URL = 'http://localhost:2358'
```

Dừng Judge0:

```powershell
docker compose -f docker-compose.judge.yml down
```

> Judge0 sử dụng container `privileged`. Chỉ chạy môi trường phát triển tin cậy; cổng 2358 được bind vào `127.0.0.1` để hạn chế truy cập từ bên ngoài. **Không dùng `down -v` nếu muốn giữ volume dữ liệu Judge0.**

## 8. Tạo bài mẫu và thử chức năng

Khi backend khởi động với `SEED_PRACTICE_PROBLEMS=true` (mặc định), project thử nạp **10 bài tập mẫu** (3 EASY, 5 MEDIUM, 2 HARD), mỗi bài có testcase ví dụ và testcase ẩn. Script chỉ nạp những `slug` chưa tồn tại; cần có ít nhất một tài khoản **ADMIN/SETTER** trong database để làm tác giả. Tài liệu: [`SEED_10_PROBLEMS.md`](SEED_10_PROBLEMS.md).

Để tắt tự động nạp bài, đặt biến này **trước khi chạy backend**:

```powershell
$env:SEED_PRACTICE_PROBLEMS = 'false'
```

Quy trình kiểm tra sau khi chạy đủ các dịch vụ:

1. Đăng nhập `http://localhost:3000/login` bằng tài khoản admin (hoặc đăng ký user khác).
2. Mở `/practice`, chọn một bài và chọn **C++ (GCC)** hoặc **Python 3**.
3. Thử **Chạy thử** và **Nộp bài**; kiểm tra kết quả và lịch sử tại `/submissions`.
4. Vào `/profile` để cập nhật `fullName`, `bio`, `school`, thử hộp thoại xác nhận đăng xuất.
5. Đăng nhập tài khoản `ADMIN`, mở **`/admin/user`**, tìm user khác, chọn quyền `USER`, `SETTER` hoặc `ADMIN`, sau đó xác nhận cập nhật. Có thể khóa/mở khóa tài khoản từ cùng màn hình.

**Bảo vệ tài khoản:** admin không thể tự thay đổi quyền hoặc tự khóa chính mình; backend cũng ngăn hạ quyền/khóa admin hoạt động cuối cùng. Người dùng phải đăng nhập lại hoặc làm mới phiên để giao diện phản ánh quyền mới.

## 9. Tổng hợp cổng dịch vụ

| Dịch vụ             | Cổng               | Địa chỉ                   |
| ------------------- | ------------------ | ------------------------- |
| Frontend Next.js    | `3000`             | `http://localhost:3000`   |
| Backend Spring Boot | `8080`             | `http://localhost:8080`   |
| PostgreSQL CodeUET  | `5433` hoặc `5432` | Theo `DB_URL`             |
| clangd bridge       | `6061`             | `ws://localhost:6061/lsp` |
| Judge0 API          | `2358`             | `http://localhost:2358`   |

## 10. Xử lý lỗi thường gặp

**Lỗi `Port 8080 was already in use`:** Đổi cổng Spring Boot trong terminal backend:

```powershell
$env:PORT = '8081'
mvn spring-boot:run
```

Sau đó sửa `API_INTERNAL_URL=http://localhost:8081` trong `frontend/.env.local` và khởi động lại Next.js.

**Lỗi kết nối PostgreSQL / `Connection refused`:** Kiểm tra PostgreSQL đã chạy, đúng host/port/database/user/password; cấu hình tại `$env:DB_URL`, `$env:DB_USER`, `$env:DB_PASSWORD`.

**Flyway báo `relation already exists` hoặc lỗi schema:** Có thể đang trỏ vào database cũ chưa được Flyway quản lý. Sao lưu DB trước, kiểm tra bảng `flyway_schema_history` và tránh tự ý xóa bảng dữ liệu.

**`mvn` / `java` / `npm` không nhận lệnh:** Kiểm tra đã cài JDK 21, Maven, Node.js và thêm vào `PATH`; mở terminal mới rồi kiểm tra lại phiên bản.

**Lỗi `Objects are not valid as a React child (keys {type,value,null})` tại `/admin/user`:** Bản project này đã sửa trả `email` kiểu `CITEXT` từ backend. Cần **chạy lại cả backend và frontend** đã được cập nhật; không chỉ thay frontend.

**Không thấy 10 bài mẫu:** Kiểm tra `SEED_PRACTICE_PROBLEMS=true`, có tài khoản ADMIN/SETTER trong database và xem log backend; có thể import thủ công theo `SEED_10_PROBLEMS.md`.

**Run/Submit không chấm được:** Kiểm tra `docker compose -f docker-compose.judge.yml ps`, gọi `/languages` của Judge0 và đối chiếu `JUDGE0_URL`. **clangd chỉ gợi ý code**, không thay Judge0.

**C++ không có gợi ý / WebSocket báo lỗi:** Kiểm tra clangd container, `http://localhost:6061/health`, `NEXT_PUBLIC_CLANGD_WS_URL` và frontend đang chạy ở origin được cho phép.

## 11. Kiểm thử và build

```powershell
# Trong CodeUET/frontend
cd frontend
npm run lint      # Script hiện tại kiểm tra TypeScript (tsc --noEmit)
npm run build

# Trong CodeUET/backend
cd ../backend
mvn test
mvn package

# Trong CodeUET/language-server
cd ../language-server
npm ci
npm test
```

Thao tác trên giả định đã cài đầy đủ các dependency và PostgreSQL khả dụng khi kiểm thử cần kết nối database.

## 12. Cấu hình mở rộng và bảo mật

- `GOOGLE_CLIENT_ID` (backend) và `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend): chỉ cần cho Google Login; phải trỏ tới **cùng OAuth Web Client ID**.
- `JWT_SECRET`: đặt một khóa ngẫu nhiên dài ít nhất 32 ký tự, không dùng giá trị mặc định khi triển khai thực tế.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: chỉ dùng để tạo tài khoản admin lúc khởi tạo, không lưu mật khẩu thật trong Git.
- `AVATAR_DIR`: đường dẫn thư mục lưu ảnh đại diện (mặc định `./uploads/avatars` từ nơi chạy backend).
- `SECURE_COOKIE=true`: dùng khi triển khai có HTTPS; cấu hình domain/proxy phù hợp.
- Sao lưu PostgreSQL trước khi nâng cấp phiên bản; lịch sử bài nộp Java cũ được giữ lại, nhưng Java không còn được dùng để nộp bài mới.

**Ghi chú:** README này dựa trên cấu hình mã nguồn của bản `CodeUET-Admin-Users-Role-Fix`; các lệnh là hướng dẫn chạy local và chưa được xác nhận bằng một lần chạy tích hợp đầy đủ trên máy của bạn.
