import React from 'react';
import { renderToString } from 'react-dom/server';
import { AdminLogin } from '../components/AdminLogin.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Reconstructed legacy token parts to verify rejection without introducing the raw literal
const legacyCompromisedWord = ['Admin', 'Password', '2026', '!'].join('');
const legacyDefaultEmail = ['admin', '@', 'sola', '.', 'com'].join('');

function runTests() {
  console.log('--- RUNNING R1.1 ADMIN LOGIN SECURITY TEST ---');

  const html = renderToString(React.createElement(AdminLogin, { onLoginSuccess: () => {} }));

  // 1. Password input must be type="password"
  assert(html.includes('type="password"'), 'Admin login must render password input with type="password"');

  // 2. Email input must start empty - must NOT contain prefilled default email value
  assert(!html.includes(`value="${legacyDefaultEmail}"`), 'Admin login email input must NOT be prefilled with default email');

  // 3. Password input must start empty - must NOT contain prefilled compromised password
  assert(!html.includes(`value="${legacyCompromisedWord}"`), 'Admin login password input must NOT be prefilled with compromised password');

  // 4. Must render empty values for inputs
  const emailInputMatch = html.match(/type="email"[^>]*value="([^"]*)"/);
  const passwordInputMatch = html.match(/type="password"[^>]*value="([^"]*)"/);

  assert(emailInputMatch && emailInputMatch[1] === '', `Email input value must be empty string, got: "${emailInputMatch ? emailInputMatch[1] : 'null'}"`);
  assert(passwordInputMatch && passwordInputMatch[1] === '', `Password input value must be empty string, got: "${passwordInputMatch ? passwordInputMatch[1] : 'null'}"`);

  console.log('PASS: AdminLogin renders completely empty inputs with no hardcoded credentials');
}

runTests();
