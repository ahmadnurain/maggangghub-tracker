const fs = require('fs');
const code = fs.readFileSync('scratch_bundle.js', 'utf8');
const regex = /filter|provinsi|kabupaten|programStudi|jenjang/gi;
let count = 0;
// find where getOnlineVacancies is called
let idx = 0;
while ((idx = code.indexOf('getOnlineVacancies(', idx)) !== -1) {
  console.log('Call at', idx, ':', code.slice(Math.max(0, idx - 150), idx + 200));
  idx += 20;
}
