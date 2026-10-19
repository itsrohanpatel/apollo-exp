import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');
const outDir = path.resolve('C:/Users/rohan/.gemini/antigravity-ide/brain/6abc20e9-6376-46cf-9a1d-7b20d15c9d83/scratch/frames');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Key timestamps in seconds
const timestamps = [
  5,    // 00:05
  15,   // 00:15
  30,   // 00:30
  60,   // 01:00
  90,   // 01:30
  120,  // 02:00
  180,  // 03:00
  240,  // 04:00
  300,  // 05:00
  360,  // 06:00
  420,  // 07:00
  480,  // 08:00
  540,  // 09:00
  600,  // 10:00
  660,  // 11:00
  700,  // 11:40
  720   // 12:00
];

for (const sec of timestamps) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const outFile = path.join(outDir, `frame_${mm}m_${ss}s.jpg`);
  
  try {
    // Extract single frame, scaled to standard 1280x672 to keep size reasonable for viewing
    const cmd = `"${ffmpegPath}" -ss ${sec} -i "${videoFile}" -vframes 1 -vf "scale=1280:-1" -q:v 3 -y "${outFile}"`;
    execSync(cmd, { stdio: 'ignore' });
    console.log(`Extracted: frame_${mm}m_${ss}s.jpg (${fs.statSync(outFile).size} bytes)`);
  } catch (err) {
    console.error(`Error at ${sec}s:`, err.message);
  }
}

console.log('Frame extraction complete.');
