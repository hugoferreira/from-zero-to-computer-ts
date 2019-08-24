import { expect } from "chai";
import { CircuitSimulator, toDec } from '../src/circuitsimulator'
import * as fc from 'fast-check'

describe('decoder', () => {
    it('select correct line', () => {
        const testCase = fc.integer(1, 8).chain((bits) => fc.tuple(
            fc.nat(2 ** bits - 1),  // a random value between 0 and (2^bits)-1
            fc.constant(bits)       // the number of bits to decode
        ))

        fc.assert(fc.property(testCase, ([v, bits]) => {
            const s = new CircuitSimulator()
            const bus = s.bus(bits)
            const dec = s.decoder(bus)

            bus.set(v)
            s.do()

            // [FIXME] Javascript doesn't has precision to represent this as it should:
            // expect(toDec(dec)).eq(1 << v)
            // Maybe change to this later when I have SHL circuits and BigInts

            dec.forEach((line, ix) => expect(line.get()).eq(ix === v))
        }))
    })

    it('one bit decoder', () => {
        const s = new CircuitSimulator()
        const data = s.wire()
        const out = s.decoder(data)

        expect(out.length).eq(2)

        s.do()
        expect(toDec(out.get())).eq(0b01)

        data.on()
        s.do()
        expect(toDec(out.get())).eq(0b10)
    })
})

describe('multiplexer', () => {
    it('select correct line', () => {
        const testCase = fc.integer(1, 4).chain((bits) => fc.tuple(
            fc.array(fc.nat(255), 2 ** bits, 2 ** bits), // data lines of 8 bits
            fc.nat(2 ** bits - 1),  // An arbitrary selection
            fc.constant(bits)       // the number of selection bits
        ))

        fc.assert(fc.property(testCase, ([dataSignals, selSignal, selBits]) => {
            const s = new CircuitSimulator()
            const data = dataSignals.map(sig => s.bus(8, sig))
            const sel = s.bus(selBits, 0)
            const mux = s.mux(data, sel)

            s.do()
            expect(toDec(mux.get())).eq(dataSignals[0])

            sel.set(selSignal)
            s.do()
            expect(toDec(mux.get())).eq(dataSignals[selSignal])
        }))
    })

    it('one bit sel/data', () => {
        const s = new CircuitSimulator()
        const sel = s.wire()
        const a = s.wire()
        const b = s.wire()

        const out = s.mux([a, b], sel)

        sel.off()

        s.do()
        expect(a.get()).false
        expect(b.get()).false
        expect(out.get()).false

        sel.on()
        a.off()
        b.on()

        s.do()
        expect(a.get()).false
        expect(b.get()).true
        expect(out.get()).true

        sel.off()
        s.do()
        expect(a.get()).false
        expect(b.get()).true
        expect(out.get()).false

        a.on()
        s.do()
        expect(a.get()).true
        expect(b.get()).true
        expect(out.get()).true
    })
})
