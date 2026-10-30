const fs = require('fs');
const code = fs.readFileSync('scratch_bundle.js', 'utf8');
const regex = /https?:\/\/[a-zA-Z0-9.\-_/:]+/g;
let m;
const urls = new Set();
while ((m = regex.exec(code)) !== null) {
  urls.add(m[0]);
}
console.log('URLs:', Array.from(urls));

const apiRegex = /["'](\/[a-zA-Z0-9_\-\/]+)["']/g;
const paths = new Set();
while ((m = apiRegex.exec(code)) !== null) {
  if (m[1].includes('api') || m[1].includes('vacanc') || m[1].includes('pl') || m[1].includes('search')) {
    paths.add(m[1]);
  }
}
console.log('Paths:', Array.from(paths));
