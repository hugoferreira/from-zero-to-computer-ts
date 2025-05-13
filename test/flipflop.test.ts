import { expect } from "chai";
import { CircuitSimulator } from '../src/circuitsimulator'

describe('flipflop', () => {
    it('should latch', () => {
        const s = new CircuitSimulator()

        const [q, nq, set, reset] = s.flipflop()

        s.do()
        expect(q.get()).eq(false)
        expect(nq.get()).eq(true)

        set.on()
        s.forward()
        expect(q.get()).eq(true)
        expect(nq.get()).eq(false)

        set.off()
        s.forward()
        expect(q.get()).eq(true)
        expect(nq.get()).eq(false)

        reset.on()
        s.forward()
        expect(q.get()).eq(false)
        expect(nq.get()).eq(true)

        reset.off()
        s.forward()
        expect(q.get()).eq(false)
        expect(nq.get()).eq(true)
    })
})