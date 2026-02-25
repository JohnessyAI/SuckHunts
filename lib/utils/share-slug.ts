const chars = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateShareSlug(length = 8): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
