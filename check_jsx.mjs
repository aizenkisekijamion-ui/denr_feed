import { parse } from '@babel/parser';
import { readFileSync } from 'fs';
try {
  parse(readFileSync('src/components/FeoMapProducer.jsx', 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK - no parse errors');
} catch(e) {
  console.log('ERROR at line ' + (e.loc?.line ?? '?') + ': ' + e.message?.substring(0, 400));
}
