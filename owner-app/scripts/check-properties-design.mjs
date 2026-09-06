import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/components/properties/PropertiesFoundationView.tsx', import.meta.url), 'utf8');
const forbidden = ['bg-slate-', 'text-slate-', 'border-slate-', 'bg-blue-', 'text-blue-', 'border-blue-', 'rounded-3xl', 'shadow-sm'];
const hit = forbidden.find(token => source.includes(token));
if (hit) throw new Error(`Properties Hub must not reintroduce legacy ${hit}`);

// Task 3.9 Revalidation Guards
const appContextSource = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
if (!appContextSource.includes('revalidateProperties')) {
  throw new Error('AppContext must export revalidateProperties');
}
if (!source.includes('revalidateProperties')) {
  throw new Error('PropertiesFoundationView must use revalidateProperties');
}
if (!source.includes('visibilitychange') && !source.includes('focus')) {
  throw new Error('PropertiesFoundationView must listen for visibility/focus to revalidate external state');
}
if (source.includes('.catch(() => {})')) {
  throw new Error('PropertiesFoundationView must not swallow revalidation errors silently');
}
if (!source.includes('revalidationError')) {
  throw new Error('PropertiesFoundationView must manage and display revalidationError state');
}

console.log('Properties Hub design and revalidation guards passed.');
