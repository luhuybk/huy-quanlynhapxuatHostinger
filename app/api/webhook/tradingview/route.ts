import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const text = await request.text();

    if (!text.includes("dời SL")) {
      return NextResponse.json({ message: "Đã lọc thông báo" }, { status: 200 });
    }

    let message_thread_id: string | undefined;
    if (text.includes("[Khung H3]")) {
      message_thread_id = process.env.THREAD_ID_H3;
    } else if (text.includes("[Khung D]")) {
      message_thread_id = process.env.THREAD_ID_D;
    } else if (text.includes("[Khung H8]")) {
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
