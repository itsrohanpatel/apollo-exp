import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ffmpegPath = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const videoFile = path.resolve('Recording 2026-10-18 140847.mp4');

console.log('FFmpeg path:', ffmpegPath);
console.log('Video file exists:', fs.existsSync(videoFile));

try {
  execSync(`"${ffmpegPath}" -i "${videoFile}"`, {
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch (err) {
  const stderr = err.stderr ? err.stderr.toString() : '';
  const durationMatch = stderr.match(/Duration:\s*(\d{2}:\d{2}:\d{2}\.\d+)/);
  console.log('Duration match:', durationMatch ? durationMatch[1] : 'unknown');
  console.log('Video stream details:');
  const lines = stderr.split('\n');
  for (const l of lines) {
    if (l.includes('Duration:') || l.includes('Stream #')) {
      console.log(l.trim());
    }
  }
}
