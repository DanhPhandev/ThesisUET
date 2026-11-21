import Link from "next/link";
export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <Link className="text-xl font-extrabold text-white" href="/">
            Code<span className="text-sky-400">UET</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Luyện lập trình C++ và Python với hệ thống chấm bài tự động.
          </p>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Học tập</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/practice" className="hover:text-white">
              Bài tập
            </Link>
            <Link href="/contests" className="hover:text-white">
              Cuộc thi
            </Link>
            <Link href="/leaderboard" className="hover:text-white">
              Xếp hạng
            </Link>
          </div>
        </div>
        <div>
          <h3 className="mb-3 font-semibold text-white">Tài khoản</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/profile" className="hover:text-white">
              Hồ sơ
            </Link>
            <Link href="/settings" className="hover:text-white">
              Cài đặt
            </Link>
            <Link href="/about" className="hover:text-white">
              Giới thiệu
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">
        Đại học Công nghệ - Đại học Quốc gia Hà Nội. 144 Xuân Thủy, Cầu Giấy, Hà
        Nội.
      </div>
    </footer>
  );
}
