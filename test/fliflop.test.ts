import { expect } from "chai";
import { CircuitSimulator } from '../src/circuitsimulator'

describe('flipflop', () => {
    it('should latch', () => {
        const s = new CircuitSimulator()

        const [q, nq, set, reset] = s.flipflop()

        s.do()
        expect(q.getSignal()).eq(false)
        expect(nq.getSignal()).eq(true)

        set.on()
        s.forward()
        expect(q.getSignal()).eq(true)
        expect(nq.getSignal()).eq(false)

        set.off()
        s.forward()
        expect(q.getSignal()).eq(true)
        expect(nq.getSignal()).eq(false)

        reset.on()
        s.forward()
        expect(q.getSignal()).eq(false)
        expect(nq.getSignal()).eq(true)

        reset.off()
        s.forward()
        expect(q.getSignal()).eq(false)
        expect(nq.getSignal()).eq(true)
    })
})