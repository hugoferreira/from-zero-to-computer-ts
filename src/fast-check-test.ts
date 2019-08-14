import fc = require('fast-check');
import prand = require('pure-rand')

const contains = (text: string, pattern: string) => text.indexOf(pattern) >= 0

fc.assert(fc.property(fc.string(), text => contains(text, text))) //?

const r = new fc.Random(prand.xorshift128plus(1))

const n = fc.integer(1, 100).generate(r) //?
n.shrink().drop(3).next() //?

// a......... .........b ........c. .......X..

/*
const original = fc.string(3).generate(r)
original.value //?
original.shrink().drop(7).next().value //?*/