// Thu nhỏ ảnh ngay trên trình duyệt trước khi gửi lên: ảnh chụp điện thoại
// cỡ 3-5MB còn khoảng 50-150KB, vừa giới hạn 1MB của server action và nhẹ
// cho database. Cạnh dài tối đa 800px là đủ nét khi phóng to xem.
export async function resizeImage(file: File, maxSide = 800, quality = 0.82): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không xử lý được ảnh");
  // Nền trắng cho ảnh PNG trong suốt, vì JPEG không có độ trong.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Không nén được ảnh");
  return new File([blob], "sku.jpg", { type: "image/jpeg" });
}
