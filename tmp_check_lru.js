const mod = require('lru-cache');
console.log('typeof mod:', typeof mod);
console.log('keys:', Object.keys(mod));
console.log('has default:', !!mod.default);
console.log('mod:', mod);
