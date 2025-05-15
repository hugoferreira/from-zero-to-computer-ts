import { expect } from "chai";
import { CircuitSimulator, toDec } from '../src/circuitsimulator'

describe('buffer', () => {
    it('pass stuff while on', () => {
        const s = new CircuitSimulator()

        const A = s.wire(true)
        const B = s.wire(false)

        s.buffer(A, s.High, B)
        s.forward()
        expect(A.get()).true
        expect(B.get()).true
    })

    it('isolate while off', () => {
        const s = new CircuitSimulator()

        const A = s.wire(false)
        const B = s.wire(true)

        s.buffer(A, s.Low, B)

        A.on()
        s.forward()
        expect(A.get()).true
        expect(B.get()).true

        B.off()
        s.forward()
        expect(A.get()).true
        expect(B.get()).false

        B.on()
        A.off()
        s.forward()
        expect(A.get()).false
        expect(B.get()).true
    })
})
