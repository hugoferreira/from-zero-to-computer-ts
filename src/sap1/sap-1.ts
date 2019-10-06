import { CircuitSimulator, Wire, Bus, toDec } from '../circuitsimulator'

export class SAP1 extends CircuitSimulator {    
    build(clk: Wire, reset: Wire, microcode: Uint16Array, mem: Uint8Array = new Uint8Array(256)) {
        const nclk = this.inverter(clk)
        const DBUS = this.bus(8)
    
        const { out: A_DATA, we: A_IN, oe: A_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: B_DATA, we: B_IN, oe: B_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: MAR_DATA, we: MAR_IN } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: PC_DATA, inc: PC_INC, we: PC_IN, oe: PC_OUT } = this.programCounter({ data: DBUS, clk: clk, reset })
        const { sum: ALU_DATA, oe: ALU_OUT } = this.alu({ a: A_DATA, b: B_DATA, bus: DBUS })
        const { out: RAM_DATA, we: RAM_IN, oe: RAM_OUT } = this.ioram(MAR_DATA, nclk, DBUS, mem)

        const OPCODE = new Bus(IR_DATA.slice(0, 5))
        const CTRL = new Bus([A_IN, A_OUT, B_IN, B_OUT, IR_IN, IR_OUT, PC_INC, PC_IN, PC_OUT, 
                              MAR_IN, RAM_IN, RAM_OUT, ALU_OUT, this.Low, this.Low, this.Low].reverse())

        const STEP = this.controlunit(OPCODE, clk, reset, microcode, CTRL, true)
        
        return { DBUS, A_DATA, B_DATA, IR_DATA, MAR_DATA, PC_DATA, ALU_DATA, RAM_DATA, OPCODE, STEP, CTRL }
    }

    load(mem: Uint8Array, program: Uint8Array) {
        program.forEach((v, ix) => mem[ix] = v)
    }

    isZero(data: Bus, out: Wire): Wire {
        data.onChange(() => out.schedule(toDec(data) === 0, 0)) // Use a comparator here 
        return out
    } 

    clockedROM(address: Bus, clk: Wire, mem: Uint16Array, data: Bus) {
        clk.onPosEdge(() => data.set(mem[toDec(address.get())]))
    }

    ROM(address: Bus, mem: Uint16Array, data: Bus) {
        address.onChange(() => data.set(mem[toDec(address.get())]))
    }

    /*
    fastcontrol(opcode: Bus, clk: Wire, reset: Wire, microcode: Uint16Array, ctrl: Bus, resetOnZero = false) {
        let n = 0x0
        const step = this.bus(3)
        const ctrlin = new Bus(step.wires.concat(opcode))
        clk.onPosEdge(() => {
            step.set(n)
            this.clockedROM(ctrlin, clk, microcode, ctrl)
            if (reset.get() || (resetOnZero && toDec(ctrl) === 0)) n = 0x0 
            else n = (n + 1) % 8
        })

        return step
    } */

    controlunit(opcode: Bus, clk: Wire, reset: Wire, microcode: Uint16Array, ctrl: Bus, resetOnZero = false): Bus {
        const nop = this.wire()
        const step = this.counter(this.bus(3), clk, this.High, this.or(reset, nop))
        const ctrlin = new Bus(step.wires.concat(opcode))

        this.clockedROM(ctrlin, clk, microcode, ctrl)
        if (resetOnZero) this.isZero(ctrl, nop)

        return step
    }

    programCounter({ data, clk, reset, inc = this.wire(), we = this.wire(), oe = this.wire(), out = data.clone() }: { data: Bus; clk: Wire; reset: Wire; inc?: Wire; we?: Wire; oe?: Wire; out?: Bus; }) {
        const [incremented, _] = this.incrementer(out)
        this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset).connect(out) 
        this.buffer(out, oe, data)

        return { out, inc, we, oe }
    }
    
    busRegister({ bus, clk, reset = this.wire(), we = this.wire(), oe = this.wire() }: { bus: Bus; clk: Wire; reset?: Wire; we?: Wire; oe?: Wire; }) {
        const out = this.fastRegister(bus, clk, we, reset)
        this.buffer(out, oe, bus)
        return { out, we, oe }
    }

    alu({ a, b, bus: out = a.clone(), oe = this.wire() }: { a: Bus; b: Bus; bus?: Bus; oe?: Wire, sum?: Bus }) {
        const [sum, carry_out] = this.fulladder(a, b, this.Low)
        this.buffer(sum, oe, out)
        return { a, b, out, sum, oe }
    }
}

export enum CTL {
    A_IN    = 1 << 15,
    A_OUT   = 1 << 14, 
    B_IN    = 1 << 13, 
    B_OUT   = 1 << 12, 
    IR_IN   = 1 << 11, 
    IR_OUT  = 1 << 10, 
    PC_INC  = 1 << 9, 
    PC_IN   = 1 << 8, 
    PC_OUT  = 1 << 7,
    MAR_IN  = 1 << 6, 
    RAM_IN  = 1 << 5, 
    RAM_OUT = 1 << 4, 
    ALU_OUT = 1 << 3
}

type Opcode = number
type CtlLines = number[]

export const microcodeTable: [Opcode, CtlLines][] = [
    /* A <- xx   */ [0b00001, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.A_IN    | CTL.PC_INC | CTL.RAM_OUT]],

    /* B <- xx   */ [0b00010, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.B_IN    | CTL.PC_INC | CTL.RAM_OUT]],

    /* A <- B    */ [0b00100, [CTL.A_IN    | CTL.B_OUT]],
    /* B <- A    */ [0b00101, [CTL.B_IN    | CTL.A_OUT]],

    /* [xx] <- A */ [0b01000, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.MAR_IN  | CTL.RAM_OUT, 
                               CTL.A_OUT   | CTL.PC_INC | CTL.RAM_IN]],

    /* [xx] <- B */ [0b01001, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.MAR_IN  | CTL.RAM_OUT, 
                               CTL.B_OUT   | CTL.PC_INC | CTL.RAM_IN]],

    /* A <- [xx] */ [0b01010, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.MAR_IN  | CTL.RAM_OUT, 
                               CTL.A_IN    | CTL.PC_INC | CTL.RAM_OUT]],

    /* B <- [xx] */ [0b01011, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.MAR_IN  | CTL.RAM_OUT, 
                               CTL.B_IN    | CTL.PC_INC | CTL.RAM_OUT]],

    /* A <- A+B  */ [0b10000, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.ALU_OUT | CTL.A_IN]],

    /* PC <- xx  */ [0b11111, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.PC_IN   | CTL.RAM_OUT]]
]

export function buildMicrocode(table: [Opcode, CtlLines][]) {
    const steps = 8
    const microcode = new Uint16Array(0b100000 * steps)
    const fetchSteps = [CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT]

    for (let op = 0b00000; op <= 0b11111; op += 1) {
        microcode[op * steps + 0] = fetchSteps[0]
        microcode[op * steps + 1] = fetchSteps[1]
    }

    table.forEach(([op, ctllines]) => ctllines.forEach((microop, ix) => microcode[op * steps + 2 + ix] = microop))

    return microcode
}