import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Endpoint này nằm ngoài lớp đăng nhập (proxy.ts bỏ qua /api) nên phải tự
    // kiểm tra mật khẩu, nếu không ai biết link cũng bắn tin vào Telegram được.
    // TradingView gọi kèm ?secret=... — đặt WEBHOOK_SECRET trong .env.
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error("TradingView webhook: chưa đặt WEBHOOK_SECRET");
      return NextResponse.json({ message: "Chưa cấu hình" }, { status: 503 });
    }
    if (new URL(request.url).searchParams.get("secret") !== secret) {
      return NextResponse.json({ message: "Không hợp lệ" }, { status: 401 });
    }

    const text = await request.text();

    if (!text.includes("dời SL")) {
      return NextResponse.json({ message: "Đã lọc thông báo" }, { status: 200 });
    }

    let message_thread_id: string | undefined;
    if (text.includes("[3H]")) {
      message_thread_id = process.env.THREAD_ID_H3;
    } else if (text.includes("[D]")) {
      message_thread_id = process.env.THREAD_ID_D;
    } else if (text.includes("[8H]")) {
      message_thread_id = process.env.THREAD_ID_H8;
    }

    const body: Record<string, unknown> = {
      chat_id: process.env.TELEGRAM_MAIN_CHAT_ID,
      text,
      parse_mode: "HTML",
    };

    if (message_thread_id) {
      body.message_thread_id = message_thread_id;
    }

    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    return NextResponse.json({ message: "Đã gửi thông báo" }, { status: 200 });
  } catch (error) {
    console.error("TradingView webhook error:", error);
    return NextResponse.json({ message: "Lỗi xử lý webhook" }, { status: 200 });
  }
}
