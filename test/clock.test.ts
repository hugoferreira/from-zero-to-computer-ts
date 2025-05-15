import { expect } from "chai";
import * as fc from 'fast-check'
import { CircuitSimulator } from '../src/circuitsimulator'

describe('clock', () => {
    it('starts with initial value', () => {
        const s = new CircuitSimulator()
        const clk = s.clock(3, false)

        s.forward()
        expect(clk.get()).true
    })

    it('posedge', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 16 }), (f) => {
            const s = new CircuitSimulator()
            const clk = s.clock(f, false)

            expect(s.posedge(clk)).eq(f)
            expect(s.posedge(clk)).eq(f * 3)
        }))
    })

    it('negedge', () => {
        fc.assert(fc.property(fc.integer({ min: 1, max: 16 }), (f) => {
            const s = new CircuitSimulator()
            const clk = s.clock(f, false)

            expect(s.negedge(clk)).eq(f * 2)
            expect(s.negedge(clk)).eq(f * 4)
        }))
    })
})
