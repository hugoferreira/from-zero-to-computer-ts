import { expect } from "chai";
import { CircuitSimulator, Wire } from '../src/circuitsimulator'

describe('clock', function () {
    it('starts with initial value', function () {
        const s = new CircuitSimulator()
        const clk = s.clock(3, true)

        s.do()
        expect(clk.getSignal()).true
    })

    it('posedge', function () {
        const s = new CircuitSimulator()
        const clk = s.clock(3, true)

        s.posedge(clk)
        expect(s.tick).eq(6)
        s.posedge(clk)
        expect(s.tick).eq(12)
    })

    it('negedge', function () {
        const s = new CircuitSimulator()
        const clk = s.clock(3, true)

        s.negedge(clk)
        expect(s.tick).eq(3)
        s.negedge(clk)
        expect(s.tick).eq(9)
    })
})
