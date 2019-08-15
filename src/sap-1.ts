import { CircuitSimulator, Bus, Wire, Low } from './circuitsimulator'

export class SAP1 extends CircuitSimulator {
    build(clk: Wire, reset: Wire) {
        const DBUS = this.bus(8)

        const [A_DATA, A_IN, A_OUT] = this.busRegister(DBUS, clk, reset)
        const [B_DATA, B_IN, B_OUT] = this.busRegister(DBUS, clk, reset)
        const [IR_DATA, IR_IN, IR_OUT] = this.busRegister(DBUS, clk, reset)
        const [PC_DATA, PC_INC, PC_IN, PC_OUT] = this.programCounter(DBUS, clk, reset)
        const [ALU_DATA, ALU_OUT] = this.alu(A_DATA, B_DATA)

        const CTRL = { A_IN, A_OUT, B_IN, B_OUT, IR_IN, IR_OUT, PC_INC, PC_IN, PC_OUT, ALU_OUT }
        return { CTRL, DBUS, A_DATA, B_DATA, IR_DATA, PC_DATA, ALU_DATA }
    }

    programCounter(data: Bus, clk: Wire, reset: Wire, inc: Wire = new Wire, we: Wire = new Wire, oe: Wire = new Wire, out = data.clone()): [Bus, Wire, Wire, Wire] {
        const [incremented, _] = this.incrementer(out)
        this.connect(
            this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset), 
            out
        )
        this.buffer(out, oe, data)
        return [out, inc, we, oe]
    }
    
    busRegister(bus: Bus, clk: Wire, reset: Wire, we = new Wire(false), oe = new Wire(false)): [Bus, Wire, Wire] {
        const out = this.register(bus, clk, we, reset)
        this.buffer(out, oe, bus)

        return [out, we, oe]
    }

    alu(a: Bus, b: Bus, oe = new Wire(false), out = a.clone()): [Bus, Wire] {
        const [sum, carry_out] = this.fulladder(a, b, Low)
        this.buffer(sum, oe, out)

        return [sum, oe]
    }
}
