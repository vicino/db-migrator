/* eslint-disable import/prefer-default-export */
export const asyncPipe = (...fns) => (x) => (
  fns.reduce(async (y, f) => f(await y), x)
);

export const callEffectSymbol = Symbol('call');

export const pipe = (...fns) => (x) => fns.reduce((y, f) => f(y), x);
export const call = (fn, ...args) => ({ effect: callEffectSymbol, fn, args });
