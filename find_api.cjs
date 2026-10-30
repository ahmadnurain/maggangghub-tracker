const fs = require('fs');
const code = fs.readFileSync('scratch_bundle.js', 'utf8');

// Find ms definition
const msIdx = code.indexOf('ms=');
if (msIdx !== -1) {
  console.log('ms def:', code.slice(Math.max(0, msIdx - 100), msIdx + 200));
}

// Find P definition
const pIdx = code.indexOf('P=');
if (pIdx !== -1) {
  console.log('P def:', code.slice(Math.max(0, pIdx - 100), pIdx + 200));
}

// Search for any .get or .post calls
const calls = code.match(/\.get\([^\)]+\)/g) || [];
console.log('Calls count:', calls.length);
console.log('Sample calls:', calls.slice(0, 10));
