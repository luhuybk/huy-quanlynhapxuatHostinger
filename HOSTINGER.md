# Deploy lên Hostinger (Node.js custom environment)

## Vì sao lỗi "Failed to find Server Action" / cache mismatch xảy ra

Đây **không phải** do Server Actions bị Hostinger chặn — Hostinger chạy Node.js
bình thường nên Server Actions hoạt động được. Nguyên nhân thực sự (theo tài
liệu Next.js đi kèm repo, `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`):

1. Next.js **mã hoá payload của mỗi Server Action bằng một key sinh ngẫu nhiên
   mỗi lần `next build`**. Nếu Hostinger rebuild lại app (hoặc bạn chạy nhiều
   process), HTML cũ ở trình duyệt vẫn tham chiếu action ID từ build trước —
   server mới không giải mã được → `Failed to find Server Action`.
   → Cố định bằng biến môi trường `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.
2. Không có `deploymentId` → sau khi redeploy, điều hướng phía client (soft
   navigation) dùng dữ liệu/asset từ bản build cũ đang cache trên trình duyệt.
   → Đặt `DEPLOYMENT_ID` (đổi mỗi lần deploy, ví dụ dùng git commit hash).
3. Auth.js (`next-auth`) từ chối request vì `Host` header phía sau reverse
   proxy Hostinger không khớp domain kỳ vọng → lỗi `UntrustedHost`.
   → Đặt `AUTH_TRUST_HOST=true`.

## Các thay đổi đã áp dụng

- [next.config.ts](next.config.ts)
  - `output: "standalone"` — build ra bundle gọn, không cần `npm install`
    trên server production.
  - `deploymentId` — chống navigate vào bản build cũ sau redeploy.
  - `outputFileTracingIncludes` — đảm bảo Prisma query engine (`.dylib`/`.so`
    binary, được load động chứ không qua `import`/`require` tĩnh) được copy
    vào thư mục `standalone`, nếu không thiếu file này server sẽ crash khi
    gọi DB.
  - `headers()` thêm `X-Accel-Buffering: no` để streaming SSR không bị buffer
    bởi reverse proxy của Hostinger.
- Mọi trang quản trị (`nhap-hang`, `xuat-hang`, `cai-dat`, `nhap-hang-trung`,
  và layout `(app)` bọc chúng) đã có `export const dynamic = "force-dynamic"`
  để không bị Next cache lại dữ liệu cũ.
- Server Actions trong `lib/actions/*.ts` đã được rà soát — tất cả đều là CRUD
  đơn giản với `revalidatePath` đúng chỗ, không có luồng nào đủ phức tạp để
  cần chuyển sang API Route riêng.

## Biến môi trường cần thêm trên Hostinger (xem [.env.example](.env.example))

```bash
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(openssl rand -base64 32)
DEPLOYMENT_ID=<git-commit-hash-hoặc-timestamp, đổi mỗi lần deploy>
AUTH_TRUST_HOST=true
AUTH_URL=https://your-domain.com
```

`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` chỉ cần generate **một lần** rồi giữ
nguyên mãi mãi (không đổi mỗi lần deploy như `DEPLOYMENT_ID`).

## Build & chạy

```bash
npm run start:hostinger
```

Script [scripts/hostinger-start.sh](scripts/hostinger-start.sh) sẽ:

1. `npm run build` (chạy `prisma generate && prisma migrate deploy && next build`)
2. Copy `public/` và `.next/static/` vào `.next/standalone/` — bước bắt buộc
   vì `output: standalone` không tự copy 2 thư mục này.
3. Chạy `node .next/standalone/server.js` (thay cho `next start`).

Nếu Hostinger yêu cầu bạn khai báo "startup file" thay vì chạy script shell,
trỏ nó vào `.next/standalone/server.js` — nhưng bước 1–2 vẫn phải chạy trước
mỗi lần deploy (đưa vào build step/CI của Hostinger).

Đã build-test và chạy thử `server.js` cục bộ để xác nhận: build thành công,
Prisma engine có trong bundle standalone, header buffering đúng, và lỗi
`UntrustedHost` biến mất sau khi set `AUTH_TRUST_HOST`.
