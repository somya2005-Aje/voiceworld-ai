import { generateSecMsGecV2 } from './src/drm.js';
const fixed = generateSecMsGecV2(1794000000.0);
const expected = '6EA6AF6A0550F520-17E5A544A1EFE811EA5248AFBD9780637964201A6D3A15ADE53A30AB9D066A4F';
console.log('fixed :', fixed);
console.log('expect:', expected);
console.log('MATCH:', fixed === expected);
console.log('now   :', generateSecMsGecV2());
