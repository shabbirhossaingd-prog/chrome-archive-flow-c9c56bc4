export function buildBlogImageFallbackPrompt(input: {
  title: string;
  excerpt?: string | null;
}) {
  const title = input.title.trim();
  const excerpt = (input.excerpt || "").trim();
  const context = excerpt ? ` Article context: ${excerpt}` : "";

  return `Create a 4:3 premium dark fashion-editorial featured image for a ZZERKOFF journal article titled “${title}”.${context} Visual direction: underground Y2K, gothic chrome, black-on-black styling, metallic highlights, cinematic flash photography, tactile dark surfaces, premium magazine composition, believable accessories and materials, strong negative space, high contrast, refined grain. Keep the artwork clean and image-only. No words, letters, numbers, typography, logos, brand marks, icons, pictograms, badges, stickers, labels, watermarks, QR codes, fake UI, signatures, captions, or text-like marks.`;
}
