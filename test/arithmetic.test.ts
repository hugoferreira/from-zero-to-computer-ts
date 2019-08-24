import { expect } from "chai";
import { CircuitSimulator, toDec } from '../src/circuitsimulator'
import * as fc from 'fast-check'

describe('fulladder', () => {
    it('sums n-bit values and sets carry', () => {
        const testCase = fc.integer(2, 16).chain(bits => fc.tuple(
            fc.nat(2 ** bits - 1),  // a
            fc.nat(2 ** bits - 1),  // b
            fc.constant(bits),              // bits
            fc.nat(1)                       // carry                       
        ))

        fc.assert(fc.property(testCase, ([x, y, bits, c]) => {
            const s = new CircuitSimulator()
            const a = s.bus(bits)
            const b = s.bus(bits)
            const [sum, carry] = s.fulladder(a, b, (c === 1) ? s.High : s.Low)

            a.setSignal(x)
            b.setSignal(y)
            s.do()

            expect(toDec(sum)).eq((x + y + c) % (2 ** bits))
            expect(carry.getSignal()).eq(x + y + c > (2 ** bits - 1))
        }))
    })
})

describe('incrementer', () => {
    const s = new CircuitSimulator()
    const a = s.bus(8)
    const [inc, carry] = s.incrementer(a)

    it('increments 8 bit values', () => {
        fc.assert(fc.property(fc.nat(255), (x) => {
            a.setSignal(x)
            s.do()
            expect(toDec(inc)).eq((x + 1) % 0x100)
        }))
    })

    it('sets carry appropriately', () => {
        fc.assert(fc.property(fc.nat(255), (x) => {
            a.setSignal(x)
            s.do()
            expect(carry.getSignal()).eq(x + 1 > 255)
        }))
    })
})
