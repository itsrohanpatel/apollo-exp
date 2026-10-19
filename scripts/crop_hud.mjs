import fs from 'fs';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');
const outDir = path.resolve('scratch/frames');

if (!fs.existsSync(ffmpegPath) || !fs.existsSync(videoFile)) {
  console.log('Skipping crop_hud: ffmpeg or video not found.');
  process.exit(0);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const times = [400, 440, 470, 480, 500, 520, 540, 570, 600, 630, 660, 690];
for (const sec of times) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const outFile = path.join(outDir, `hud_${mm}m_${ss}s.jpg`);
  const cmd = `"${ffmpegPath}" -ss ${sec} -i "${videoFile}" -vframes 1 -vf "crop=560:90:300:860" -q:v 2 -y "${outFile}"`;
  execSync(cmd, { stdio: 'ignore' });
  console.log(`Saved ${outFile}`);
}
