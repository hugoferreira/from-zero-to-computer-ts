import { expect } from "chai";
import { CircuitSimulator, toDec } from '../src/circuitsimulator'

describe('counters', () => {
    it('increment and overflow', () => {
        const s = new CircuitSimulator()
        const clk = s.clock(1, false)
        const counter = s.counter(s.bus(2), clk, s.Low, s.Low)
        const threebitcycle = [1, 2, 3, 0, 1, 2, 3, 0]

        s.do()
        expect(toDec(counter)).eq(0)

        threebitcycle.forEach((c, ix) => {
            expect(s.posedge(clk)).eq(ix * 2 + 1)
            expect(toDec(counter)).eq(c)
        })
    })

    it('be settable and buffered', () => {
        const s = new CircuitSimulator()
        const clk = s.clock(1, false)
        const data = s.bus(8)
        const we = s.wire()
        const counter = s.counter(data, clk, we, s.Low)

        s.posedge(clk)
        expect(toDec(data)).eq(0x0)
        
        s.posedge(clk)
        expect(toDec(data)).eq(0x0)

        s.posedge(clk)
        expect(toDec(data)).eq(0x0)
        
        data.set(0xA)
        expect(toDec(counter)).eq(0x3)

        s.posedge(clk)
        expect(toDec(counter)).eq(0x4)

        we.on()
        s.posedge(clk)
        expect(toDec(counter)).eq(0xA)
    })

    it('unclocked reset', () => {
        const s = new CircuitSimulator()
        const clk = s.clock(1, false)
        const reset = s.wire() 
        const counter = s.counter(s.bus(8), clk, s.Low, reset)
    
        s.posedge(clk)
        s.posedge(clk)
        const lastClock = s.posedge(clk)

        expect(toDec(counter)).eq(0x3)

        reset.on()
        s.do()
        
        expect(toDec(counter)).eq(0x0)
        expect(s.tick).eq(lastClock)
    })
})