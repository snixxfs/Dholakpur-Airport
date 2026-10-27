import fs from 'fs';
import path from 'path';
import https from 'https';

const models = [
  'a380.glb',
  'a359.glb',
  'a333.glb',
  'a320.glb',
  'a321.glb',
  'b773.glb',
  'b789.glb',
  'b738.glb',
];

const targetDir = path.resolve('public', 'models');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: httpsAgent }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading 3D Aircraft Models from Flightradar24 (GPL v2)...');
  for (const model of models) {
    const dest = path.join(targetDir, model);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      console.log(`[EXISTS] ${model} (${(fs.statSync(dest).size / 1024 / 1024).toFixed(2)} MB)`);
      continue;
    }
    const url = `https://raw.githubusercontent.com/Flightradar24/fr24-3d-models/master/models/${model}`;
    process.stdout.write(`Downloading ${model}... `);
    try {
      await download(url, dest);
      const sizeMb = (fs.statSync(dest).size / 1024 / 1024).toFixed(2);
      console.log(`DONE (${sizeMb} MB)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log('All models processed!');
}

main();
