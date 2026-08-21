import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAGES_DIR = path.resolve(__dirname, '..', 'src', 'pages');

const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const fp = path.join(PAGES_DIR, f);
  let content = fs.readFileSync(fp, 'utf8');
  let updated = content
    .replace(/fontSize:\s*10(?!\d)/g, 'fontSize: 11')
    .replace(/fontSize:\s*['"]10px['"]/g, "fontSize: '11px'")
    .replace(/fontSize:\s*9(?!\d)/g, 'fontSize: 11')
    .replace(/fontSize:\s*8(?!\d)/g, 'fontSize: 11');

  if (content !== updated) {
    fs.writeFileSync(fp, updated, 'utf8');
    console.log(`Updated typography in ${f}`);
  }
});
