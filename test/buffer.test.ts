import { expect } from "chai";
import { CircuitSimulator, Wire, Low, toDec, High } from '../src/circuitsimulator'

describe('buffer', () => {
    it('pass stuff while on', () => {
        const s = new CircuitSimulator()

        const A = new Wire(true)
        const B = new Wire(false)

        s.buffer(A, High, B)
        s.do()
        expect(A.getSignal()).true
        expect(B.getSignal()).true
    })

    it('isolate while off', () => {
        const s = new CircuitSimulator()

        const A = new Wire(false)
        const B = new Wire(true)

        s.buffer(A, Low, B)

        A.on()
        s.do()
        expect(A.getSignal()).true
        expect(B.getSignal()).true

        B.off()
        s.do()
        expect(A.getSignal()).true
        expect(B.getSignal()).false

        B.on()
        A.off()
        s.do()
        expect(A.getSignal()).false
        expect(B.getSignal()).true
    })
})
