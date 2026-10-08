import { describe, expect, it } from "vitest";
import { acceptedVideo, isAnimatedImage, isVideoMime } from "./media";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const pngChunk = (type: string, len = 0) => [...u32(len), ...bytes(type), ...new Array(len).fill(0), 0, 0, 0, 0];
const PNG_SIG = [0x89, ...bytes("PNG"), 0x0d, 0x0a, 0x1a, 0x0a];

describe("isAnimatedImage", () => {
  it("PNG fijo y APNG", () => {
    expect(isAnimatedImage(new Uint8Array([...PNG_SIG, ...pngChunk("IHDR", 13), ...pngChunk("IDAT", 4)]))).toBe(false);
    expect(isAnimatedImage(new Uint8Array([...PNG_SIG, ...pngChunk("IHDR", 13), ...pngChunk("acTL", 8), ...pngChunk("IDAT", 4)]))).toBe(true);
    // Un acTL después del IDAT no cuenta (no es un APNG válido).
    expect(isAnimatedImage(new Uint8Array([...PNG_SIG, ...pngChunk("IHDR", 13), ...pngChunk("IDAT", 4), ...pngChunk("acTL", 8)]))).toBe(false);
  });

  it("WebP fijo y animado", () => {
    const vp8x = (flags: number) => bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8X", u32(10), [flags, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(isAnimatedImage(vp8x(0x10))).toBe(false);
    expect(isAnimatedImage(vp8x(0x12))).toBe(true);
    expect(isAnimatedImage(bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8 ", [0, 0, 0, 0]))).toBe(false);
  });

  it("GIF de un fotograma y animado", () => {
    expect(isAnimatedImage(bytes("GIF89a", new Array(7).fill(0), [0x00, 0x2c, 1, 2, 3]))).toBe(false);
    expect(isAnimatedImage(bytes("GIF89a", new Array(7).fill(0), [0x21, 0xff, 0x0b], "NETSCAPE2.0"))).toBe(true);
    expect(isAnimatedImage(bytes("GIF89a", new Array(7).fill(0), [0x00, 0x2c, 1, 2, 0x00, 0x2c]))).toBe(true);
  });

  it("AVIF fijo y animado", () => {
    expect(isAnimatedImage(bytes(u32(20), "ftyp", "avif", [0, 0, 0, 0], "mif1"))).toBe(false);
    expect(isAnimatedImage(bytes(u32(20), "ftyp", "avis", [0, 0, 0, 0], "msf1"))).toBe(true);
  });

  it("archivos raros o cortos no rompen", () => {
    expect(isAnimatedImage(new Uint8Array())).toBe(false);
    expect(isAnimatedImage(bytes("GIF"))).toBe(false);
    expect(isAnimatedImage(new Uint8Array([...PNG_SIG, ...u32(0xffffffff), ...bytes("IHDR")]))).toBe(false);
  });
});

describe("vídeo", () => {
  it("tipos aceptados", () => {
    expect(acceptedVideo("video/webm")).toBe(true);
    expect(acceptedVideo("video/mp4")).toBe(true);
    expect(acceptedVideo("video/quicktime")).toBe(true);
    expect(acceptedVideo("video/x-msvideo")).toBe(false);
    expect(isVideoMime("video/webm")).toBe(true);
    expect(isVideoMime("image/png")).toBe(false);
    expect(isVideoMime(undefined)).toBe(false);
  });
});
