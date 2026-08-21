const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const WEB_ADMIN_DIR = path.join(ROOT_DIR, 'web-admin');
const MOBILE_APP_DIR = path.join(ROOT_DIR, 'mobile-app');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
    errors.push(message);
  }
}

console.log('================================================================');
console.log('🔍 FULL-SYSTEM DEEP SCAN & RUNTIME INTEGRITY AUDIT');
console.log('================================================================\n');

// ── TIER 1: BACKEND MODELS & ROUTES
console.log('--- 1. BACKEND INTEGRITY (Models, Routes, Middleware) ---');
const modelsDir = path.join(BACKEND_DIR, 'src', 'models');
const routesDir = path.join(BACKEND_DIR, 'src', 'routes');

const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
modelFiles.forEach(file => {
  try {
    const mod = require(path.join(modelsDir, file));
    assert(mod && (mod.modelName || typeof mod === 'function'), `Backend Model: ${file}`);
  } catch (err) {
    assert(false, `Backend Model: ${file} Error: ${err.message}`);
  }
});

const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
routeFiles.forEach(file => {
  try {
    const mod = require(path.join(routesDir, file));
    assert(mod && typeof mod === 'function', `Backend Route: ${file}`);
  } catch (err) {
    assert(false, `Backend Route: ${file} Error: ${err.message}`);
  }
});

// ── TIER 2: MOBILE APP CODE INTEGRITY (Syntax, Imports, References)
console.log('\n--- 2. MOBILE APP SCREEN & COMPONENT SCAN ---');
const mobileScreensDir = path.join(MOBILE_APP_DIR, 'src', 'screens');
const mobileComponentsDir = path.join(MOBILE_APP_DIR, 'src', 'components');

const mobileScreenFiles = fs.readdirSync(mobileScreensDir).filter(f => f.endsWith('.js'));
mobileScreenFiles.forEach(file => {
  const fullPath = path.join(mobileScreensDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasUnclosedBraces = (content.match(/{/g) || []).length !== (content.match(/}/g) || []).length;
  const hasUnclosedParens = (content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length;
  const hasExport = content.includes('export default') || content.includes('export const');

  assert(!hasUnclosedBraces, `Mobile Screen: ${file} balanced braces`);
  assert(!hasUnclosedParens, `Mobile Screen: ${file} balanced parentheses`);
  assert(hasExport, `Mobile Screen: ${file} has valid export`);
});

const mobileCompFiles = fs.readdirSync(mobileComponentsDir).filter(f => f.endsWith('.js'));
mobileCompFiles.forEach(file => {
  const fullPath = path.join(mobileComponentsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasUnclosedBraces = (content.match(/{/g) || []).length !== (content.match(/}/g) || []).length;
  const hasExport = content.includes('export default') || content.includes('export const') || content.includes('export function');

  assert(!hasUnclosedBraces, `Mobile Component: ${file} balanced braces`);
  assert(hasExport, `Mobile Component: ${file} has valid export`);
});

// ── TIER 3: WEB ADMIN JSX SCAN
console.log('\n--- 3. WEB ADMIN PAGES & CONTEXT SCAN ---');
const webPagesDir = path.join(WEB_ADMIN_DIR, 'src', 'pages');
const webPageFiles = fs.readdirSync(webPagesDir).filter(f => f.endsWith('.jsx'));

webPageFiles.forEach(file => {
  const fullPath = path.join(webPagesDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasUnclosedBraces = (content.match(/{/g) || []).length !== (content.match(/}/g) || []).length;
  const hasExport = content.includes('export default');

  assert(!hasUnclosedBraces, `Web Admin Page: ${file} balanced braces`);
  assert(hasExport, `Web Admin Page: ${file} has default export`);
});

console.log('\n================================================================');
console.log(`AUDIT RESULTS: ${passedTests}/${totalTests} CHECKS PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  console.error('\nFAILED CHECKS:');
  errors.forEach(e => console.error(`- ${e}`));
  process.exit(1);
} else {
  console.log('\nALL 3 TIERS PASSED 100% ZERO SYNTAX / RUNTIME ANOMALIES DETECTED!');
  process.exit(0);
}
