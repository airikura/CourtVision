"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "/ffmpeg/ffmpeg-core.js",
    wasmURL: "/ffmpeg/ffmpeg-core.wasm",
  });
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export async function compressVideo(
  file: File,
  onProgress: (pct: number) => void
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress(Math.min(Math.round(progress * 100), 99));
  });

  const inputName = "input" + file.name.slice(file.name.lastIndexOf("."));
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  await ffmpeg.exec([
    "-i", inputName,
    "-vf", "scale=-2:720",   // scale to 720p, preserve aspect ratio
    "-c:v", "libx264",
    "-crf", "28",            // quality: 0 (lossless) to 51 (worst)
    "-preset", "fast",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputName,
  ]);

  const raw = await ffmpeg.readFile(outputName);
  // readFile returns Uint8Array | string; for binary files it's always Uint8Array
  const bytes = raw as Uint8Array;

  // Clean up virtual FS to free memory
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  onProgress(100);
  // Copy into a plain ArrayBuffer (FFmpeg may use SharedArrayBuffer internally)
  const plain = new Uint8Array(bytes.length);
  plain.set(bytes);
  return new Blob([plain.buffer as ArrayBuffer], { type: "video/mp4" });
}
