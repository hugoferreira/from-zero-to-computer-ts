import { CircuitSimulator, Wire, Bus, toDec, RegisterOutput, AluOutput as BaseAluOutput, RamOutput } from '../circuitsimulator'

export interface SAP1BuildOutput {
    DBUS: Bus;
    A_DATA: Bus;
    B_DATA: Bus;
    IR_DATA: Bus;
    MAR_DATA: Bus;
    PC_DATA: Bus;
    ALU_DATA: Bus;
    RAM_DATA: Bus;
    OUT_DATA: Bus;
    OPCODE: Bus;
    STEP: Bus;
    CTRL: Bus;
    HALT: Wire;
    clockGate: Wire;
}

// Specific ALU output for SAP1 if it differs, or use a more generic one if applicable
export interface SAP1AluOutput extends BaseAluOutput {
    sub: Wire; // SAP-1 ALU has a dedicated subtract control/output line in its return
    sum: Bus; // SAP-1 ALU returns sum explicitly
}

export class SAP1 extends CircuitSimulator {    
    build(clk: Wire, reset: Wire, microcode: Uint16Array, mem: Uint8Array = new Uint8Array(256)): SAP1BuildOutput {
        const nclk = this.inverter(clk)
        const DBUS = this.bus(8)
    
        const { out: A_DATA, we: A_IN, oe: A_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: B_DATA, we: B_IN, oe: B_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: MAR_DATA, we: MAR_IN } = this.busRegister({ bus: DBUS, clk, reset })
        const { out: PC_DATA, inc: PC_INC, we: PC_IN, oe: PC_OUT } = this.programCounter({ data: DBUS, clk: clk, reset })
        const { sum: ALU_DATA, oe: ALU_OUT, sub: SUB_OUT } = this.alu({ a: A_DATA, b: B_DATA, bus: DBUS })
        const { out: RAM_DATA, we: RAM_IN, oe: RAM_OUT } = this.ioram(MAR_DATA, nclk, DBUS, mem)
        
        // Output register
        const { out: OUT_DATA, we: OUT_IN } = this.busRegister({ bus: DBUS, clk, reset })
        
        // Halt signal
        const HALT = this.wire(false)

        const OPCODE = new Bus(IR_DATA.slice(0, 5))
        const CTRL = new Bus([A_IN, A_OUT, B_IN, B_OUT, IR_IN, IR_OUT, PC_INC, PC_IN, PC_OUT, 
                              MAR_IN, RAM_IN, RAM_OUT, ALU_OUT, SUB_OUT, OUT_IN, HALT].reverse())

        const STEP = this.controlunit(OPCODE, clk, reset, microcode, CTRL, true)
        
        // Wire HALT signal to stop the clock
        const clockGate = this.and(clk, this.inverter(HALT))
        
        return { DBUS, A_DATA, B_DATA, IR_DATA, MAR_DATA, PC_DATA, ALU_DATA, RAM_DATA, OUT_DATA, OPCODE, STEP, CTRL, HALT, clockGate }
    }

    load(mem: Uint8Array, program: Uint8Array): void {
        program.forEach((v, ix) => mem[ix] = v)
    }

    isZero(data: Bus, out: Wire): Wire {
        data.onChange(() => out.schedule(toDec(data) === 0, 0)) // Use a comparator here 
        return out
    } 

    clockedROM(address: Bus, clk: Wire, mem: Uint16Array, data: Bus): void {
        clk.onPosEdge(() => data.set(mem[toDec(address.get())]))
    }

    ROM(address: Bus, mem: Uint16Array, data: Bus): void {
        address.onChange(() => data.set(mem[toDec(address.get())]))
    }

    controlunit(opcode: Bus, clk: Wire, reset: Wire, microcode: Uint16Array, ctrl: Bus, resetOnZero = false): Bus {
        const nop = this.wire()
        const step = this.counter(this.bus(3), clk, this.High, this.or(reset, nop))
        const ctrlin = new Bus(step.wires.concat(opcode))

        this.clockedROM(ctrlin, clk, microcode, ctrl)
        if (resetOnZero) this.isZero(ctrl, nop)

        return step
    }

    programCounter({ data, clk, reset, inc = this.wire(), we = this.wire(), oe = this.wire(), out = data.clone() }: { data: Bus; clk: Wire; reset: Wire; inc?: Wire; we?: Wire; oe?: Wire; out?: Bus; }): { out: Bus; inc: Wire; we: Wire; oe: Wire; } {
        const [incremented, _] = this.incrementer(out)
        this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset).out.connect(out) 
        this.buffer(out, oe, data)

        return { out, inc, we, oe }
    }
    
    busRegister({ bus, clk, reset = this.wire(), we = this.wire(), oe = this.wire() }: { bus: Bus; clk: Wire; reset?: Wire; we?: Wire; oe?: Wire; }): RegisterOutput {
        const out = this.fastRegister(bus, clk, we, reset)
        this.buffer(out, oe, bus)
        return { out, we, oe }
    }

    alu({ a, b, bus: out = a.clone(), oe = this.wire(), sub = this.wire() }: { a: Bus; b: Bus; bus?: Bus; oe?: Wire, sub?: Wire, sum?: Bus }): SAP1AluOutput {
        // Regular addition 
        const [sum, carry_add] = this.fulladder(a, b, this.Low)
        
        // For subtraction: invert b and add 1 (two's complement)
        const b_inverted = b.clone()
        b_inverted.wires.forEach((w, i) => {
            this.inverter(b.wires[i]).connect(w)
        })
        const [diff, carry_sub] = this.fulladder(a, b_inverted, this.High)  // Add 1 by setting carry in to High
        
        // Create a multiplexer to select between addition and subtraction
        const result = this.bus(a.length)
        a.wires.forEach((_, i) => {
            this.onebitmux(sum.wires[i], diff.wires[i], sub).connect(result.wires[i])
        })
        
        this.buffer(result, oe, out)
        
        return { a, b, out, sum: result, oe, sub, op: this.bus(0), flags: this.bus(0) }
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
    ALU_OUT = 1 << 3,
    SUB_OUT = 1 << 2,
    OUT_IN  = 1 << 1,
    HALT    = 1 << 0
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

    /* A <- A+B  */ [0b10000, [CTL.ALU_OUT | CTL.A_IN]],
    
    /* A <- A-B  */ [0b10001, [CTL.ALU_OUT | CTL.SUB_OUT | CTL.A_IN]],
    
    /* OUT <- A  */ [0b10010, [CTL.A_OUT   | CTL.OUT_IN]],
    
    /* HALT      */ [0b11110, [CTL.HALT]],

    /* PC <- xx  */ [0b11111, [CTL.PC_OUT  | CTL.MAR_IN, 
                               CTL.PC_IN   | CTL.RAM_OUT]]
]

export function buildMicrocode(table: [Opcode, CtlLines][]): Uint16Array {
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