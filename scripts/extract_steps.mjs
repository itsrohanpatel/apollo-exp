import { execSync } from 'child_process';
import path from 'path';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');
const outDir = path.resolve('C:/Users/rohan/.gemini/antigravity-ide/brain/6abc20e9-6376-46cf-9a1d-7b20d15c9d83/scratch/frames');

const times = [530, 540, 550, 570, 590, 610, 630, 650, 670, 680, 690, 700];
for (const sec of times) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const outFile = path.join(outDir, `step_${mm}m_${ss}s.jpg`);
  // Crop HUD and left table
  const cmd = `"${ffmpegPath}" -ss ${sec} -i "${videoFile}" -vframes 1 -vf "scale=1280:-1" -q:v 2 -y "${outFile}"`;
  execSync(cmd, { stdio: 'ignore' });
  console.log(`Saved ${outFile}`);
}
