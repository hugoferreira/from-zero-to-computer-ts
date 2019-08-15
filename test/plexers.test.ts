import { expect } from "chai";
import { CircuitSimulator, Wire, toDec, High, Bus } from '../src/circuitsimulator'
import * as fc from 'fast-check'

describe('decoder', () => {
    it('select correct line', () => {
        const testCase = fc.integer(1, 10).chain((bits) => fc.tuple(
            fc.nat(2 ** bits - 1),  // a random value between 0 and (2^bits)-1
            fc.constant(bits)               // the number of bits to decode
        ))

        fc.assert(fc.property(testCase, ([v, bits]) => {
            const s = new CircuitSimulator()
            const bus = s.bus(bits)
            const dec = s.decoder(bus)

            bus.setSignal(v)
            s.do()

            // [FIXME] Javascript doesn't has precision to represent this as it should:
            // expect(toDec(dec)).eq(1 << v)
            // Maybe change to this later when I have SHL circuits and BigInts

            dec.forEach((line, ix) => expect(line.getSignal()).eq(ix === v))
        }))
    })

    it('one bit decoder', () => {
        const s = new CircuitSimulator()
        const data = new Wire
        const out = s.decoder(data)

        expect(out.length).eq(2)

        s.do()
        expect(toDec(out.getSignal())).eq(0b01)

        data.on()
        s.do()
        expect(toDec(out.getSignal())).eq(0b10)
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
            expect(toDec(mux.getSignal())).eq(dataSignals[0])

            sel.setSignal(selSignal)
            s.do()
            expect(toDec(mux.getSignal())).eq(dataSignals[selSignal])
        }))
    })

    it('one bit sel/data', () => {
        const s = new CircuitSimulator()
        const sel = new Wire
        const a = new Wire
        const b = new Wire

        const out = s.mux([a, b], sel)

        sel.off()

        s.do()
        expect(a.getSignal()).false
        expect(b.getSignal()).false
        expect(out.getSignal()).false

        sel.on()
        a.off()
        b.on()

        s.do()
        expect(a.getSignal()).false
        expect(b.getSignal()).true
        expect(out.getSignal()).true

        sel.off()
        s.do()
        expect(a.getSignal()).false
        expect(b.getSignal()).true
        expect(out.getSignal()).false

        a.on()
        s.do()
        expect(a.getSignal()).true
        expect(b.getSignal()).true
        expect(out.getSignal()).true
    })
})
