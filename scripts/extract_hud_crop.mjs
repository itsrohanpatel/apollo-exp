import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');
const outDir = path.resolve('scratch/frames');

if (!fs.existsSync(ffmpegPath) || !fs.existsSync(videoFile)) {
  console.log('Skipping extract_hud_crop: ffmpeg or video not found.');
  process.exit(0);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const times = [440, 460, 480, 500, 520, 540, 560, 580];
for (const sec of times) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const outFile = path.join(outDir, `detail_${mm}m_${ss}s.jpg`);
  const cmd = `"${ffmpegPath}" -ss ${sec} -i "${videoFile}" -vframes 1 -vf "crop=600:150:in_w-620:in_h-170" -q:v 2 -y "${outFile}"`;
  execSync(cmd, { stdio: 'ignore' });
  console.log(`Cropped HUD: detail_${mm}m_${ss}s.jpg`);
}
