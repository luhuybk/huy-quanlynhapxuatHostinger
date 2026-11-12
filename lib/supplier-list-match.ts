// Ghép danh sách hàng hãng gửi (dán từ Zalo/Messenger) với các mã trong kho.
//
// Mỗi dòng kiểu "MARVIS WHITENING MINT E 85 ML 2X6": bỏ tên brand, quy cách
// (2X6), dung tích (85 ML) rồi so phần chữ còn lại với tên mã. Dung tích chỉ
// dùng để phân xử khi hai mã cùng tên khác size (kem 85ml vs nước súc 120ml).

export type MatchSku = { id: string; name: string; size: string | null };
export type LineMatch = { line: string; sku: MatchSku | null };

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

// Tách chữ và số: "85ML" -> số 85; "2X6" (quy cách thùng) bỏ hẳn.
function parse(text: string, drop: Set<string>) {
  const words: string[] = [];
  const numbers: string[] = [];
  const cleaned = fold(text)
    .replace(/\b\d+\s*x\s*\d+\b/g, " ")
    .replace(/(\d+(?:[.,]\d+)?)\s*(ml|g|gr|gram|l|oz)\b/g, " $1 ");
  for (const token of cleaned.split(/[^a-z0-9]+/)) {
    if (!token || drop.has(token)) continue;
    if (/^\d+([.,]\d+)?$/.test(token)) numbers.push(token);
    else if (!["ml", "g", "gr", "gram", "oz"].includes(token)) words.push(token);
  }
  return { words, numbers };
}

export function matchSupplierList(text: string, skus: MatchSku[], brandName: string): LineMatch[] {
  const drop = new Set(fold(brandName).split(/[^a-z0-9]+/).filter(Boolean));
  const parsedSkus = skus.map((sku) => ({
    sku,
    ...parse(`${sku.name} ${sku.size ?? ""}`, drop),
  }));

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•.\-*\d)]+(?=[a-zA-Z])/, "").trim())
    .filter((l) => /[a-zA-Z]/.test(l));

  const seen = new Set<string>();
  const result: LineMatch[] = [];
  for (const line of lines) {
    const key = fold(line).replace(/\s+/g, " ");
    if (seen.has(key)) continue; // hãng hay dán trùng một dòng
    seen.add(key);

    const { words, numbers } = parse(line, drop);
    if (words.length === 0) {
      result.push({ line, sku: null });
      continue;
    }
    let best: { sku: MatchSku; score: number } | null = null;
    let tie = false;
    for (const s of parsedSkus) {
      if (s.words.length === 0) continue;
      const shared = words.filter((w) => s.words.includes(w)).length;
      if (shared === 0) continue;
      const lineCover = shared / words.length;
      const skuCover = shared / s.words.length;
      // Phải khớp phần lớn của ít nhất một bên, tránh "MINT" khớp bừa mọi mã.
      if (Math.max(lineCover, skuCover) < 0.75) continue;
      const sizeBonus = numbers.some((n) => s.numbers.includes(n)) ? 0.3 : 0;
      const score = lineCover + skuCover + sizeBonus;
      if (!best || score > best.score + 1e-9) {
        best = { sku: s.sku, score };
        tie = false;
      } else if (Math.abs(score - best.score) < 1e-9) {
        tie = true;
      }
    }
    result.push({ line, sku: best && !tie ? best.sku : null });
  }
  return result;
}
