import { CircuitSimulator, Bus, Wire, Low, High, toDec } from './circuitsimulator'

export enum CTL {
    A_IN    = 0b1000000000000000,
    A_OUT   = 0b0100000000000000, 
    B_IN    = 0b0010000000000000, 
    B_OUT   = 0b0001000000000000, 
    IR_IN   = 0b0000100000000000, 
    IR_OUT  = 0b0000010000000000, 
    PC_INC  = 0b0000001000000000, 
    PC_IN   = 0b0000000100000000, 
    PC_OUT  = 0b0000000010000000,
    MAR_IN  = 0b0000000001000000, 
    RAM_IN  = 0b0000000000100000, 
    RAM_OUT = 0b0000000000010000, 
    ALU_OUT = 0b0000000000001000
}

export class SAP1 extends CircuitSimulator {    
    fetchSteps = [CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT]

    build(clk: Wire, reset: Wire, microcode: number[], mem: number[] = Array(256).fill(0)) {
        const nclk = this.inverter(clk)
        const DBUS = this.bus(8)
    
        const { out: A_DATA, we: A_IN, oe: A_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: B_DATA, we: B_IN, oe: B_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: MAR_DATA, we: MAR_IN } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: PC_DATA, inc: PC_INC, we: PC_IN, oe: PC_OUT } = this.programCounter({ data: DBUS, clk, reset })
        const { sum: ALU_DATA, oe: ALU_OUT } = this.alu({ a: A_DATA, b: B_DATA, bus: DBUS })
        const { out: RAM_DATA, we: RAM_IN, oe: RAM_OUT } = this.ioram(MAR_DATA, nclk, DBUS, mem)

        const OPCODE = new Bus(IR_DATA.slice(0, 5))
        const CTRL = new Bus([A_IN, A_OUT, B_IN, B_OUT, IR_IN, IR_OUT, PC_INC, PC_IN, PC_OUT, 
                              MAR_IN, RAM_IN, RAM_OUT, ALU_OUT, Low, Low, Low].reverse())

        const STEP = this.controlunit(OPCODE, clk, reset, microcode, CTRL)
        
        return { DBUS, A_DATA, B_DATA, IR_DATA, MAR_DATA, PC_DATA, ALU_DATA, RAM_DATA, OPCODE, STEP, CTRL }
    }

    load(mem: number[], program: number[]) {
        program.forEach((v, ix) => mem[ix] = v)
    }

    isZero(data: Bus, out: Wire): Wire {
        data.trigger(() => this.schedule(() => out.setSignal(toDec(data) === 0x0), 0)) // Use a comparator here
        return out
    } 

    controlunit(opcode: Bus, clk: Wire, reset: Wire, microcode: number[], ctrl: Bus, resetOnZero = false): Bus {
        const nop = new Wire(false)
        const step = this.counter(this.bus(3), clk, High, this.or(reset, nop))
        const ctrlin = new Bus(step.wires.concat(opcode))

        this.rom(ctrlin, microcode, ctrl)
        // if (resetOnZero) this.isZero(ctrl, nop)

        return step
    }

    programCounter({ data, clk, reset, inc = new Wire, we = new Wire, oe = new Wire, out = data.clone() }: { data: Bus; clk: Wire; reset: Wire; inc?: Wire; we?: Wire; oe?: Wire; out?: Bus; }) {
        const [incremented, _] = this.incrementer(out)
        this.connect(
            this.register(this.mux([this.buffer(incremented, this.and(inc, clk)), data], we), clk, this.or(we, inc), reset), 
            out
        )

        this.buffer(out, oe, data)
        inc.trigger(() => { console.log(`PC_INC was triggered: ${inc.getSignal()}`) })
        oe.trigger(() => { console.log(`PC_OUT was triggered: ${oe.getSignal()}`) })
        we.trigger(() => { console.log(`PC_IN was triggered: ${we.getSignal()}`) })

        return { out, inc, we, oe }
    }
    
    busRegister({ bus, clk, reset = new Wire(false), we = new Wire(false), oe = new Wire(false) }: { bus: Bus; clk: Wire; reset?: Wire; we?: Wire; oe?: Wire; }) {
        const out = this.register(bus, clk, we, reset)
        this.buffer(out, oe, bus)
        return { out, we, oe }
    }

    alu({ a, b, bus: out = a.clone(), oe = new Wire(false) }: { a: Bus; b: Bus; bus?: Bus; oe?: Wire, sum?: Bus }) {
        const [sum, carry_out] = this.fulladder(a, b, Low)
        this.buffer(sum, oe, out)
        return { a, b, out, sum, oe }
    }
}
