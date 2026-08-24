import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/components/properties/PropertiesFoundationView.tsx', import.meta.url), 'utf8');
const forbidden = ['bg-slate-', 'text-slate-', 'border-slate-', 'bg-blue-', 'text-blue-', 'border-blue-', 'rounded-3xl', 'shadow-sm'];
const hit = forbidden.find(token => source.includes(token));
if (hit) throw new Error(`Properties Hub must not reintroduce legacy ${hit}`);
console.log('Properties Hub design guard passed.');
