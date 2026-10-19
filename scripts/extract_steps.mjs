import fs from 'fs';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');
const outDir = path.resolve('scratch/frames');

if (!fs.existsSync(ffmpegPath) || !fs.existsSync(videoFile)) {
  console.log('Skipping extract_steps: ffmpeg or video not found.');
  process.exit(0);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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
