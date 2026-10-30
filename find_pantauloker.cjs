const fs = require('fs');
const html = fs.readFileSync('scratch_pantauloker_co.html', 'utf8');
const regex = /src=["']([^"']+\.js)/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Script:', m[1]);
}
