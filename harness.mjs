// Loads a game's single bare <script> into node:vm with a stub DOM, so tests can drive its top-level state.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function load(file, globals = {}) {
  const html = readFileSync(new URL(file, import.meta.url), 'utf8');
  const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const texts = [];
  const ctx2d = new Proxy({}, {
    get: (_, k) => (k === 'fillText' ? (t) => texts.push(t) : () => {}),
    set: () => true,
  });
  const listeners = {};
  const context = vm.createContext({
    Math,
    document: {
      getElementById: () => ({ getContext: () => ctx2d, textContent: '' }),
      addEventListener: (type, fn) => { listeners[type] = fn; },
    },
    requestAnimationFrame: () => {},
    ...globals,
  });
  vm.runInContext(src, context);
  // Top-level let/const aren't properties of the vm global, so state is reached by evaluating code.
  const run = (code) => vm.runInContext(code, context);
  const key = (code, repeat = false) => listeners.keydown({ code, repeat, preventDefault() {} });
  return { run, key, listeners, texts };
}
