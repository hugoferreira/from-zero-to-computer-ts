import { CircuitSimulator, Bus, Wire } from './circuitsimulator'

export class SAP1 extends CircuitSimulator {
    programCounter(data: Bus, inc: Wire, we: Wire, clk: Wire, reset: Wire, out = data.clone()) {
        const [incremented, _] = this.incrementer(out)
        this.connect(
            this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset), 
            out
        )
        return out
    }
}
