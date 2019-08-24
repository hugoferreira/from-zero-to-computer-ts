import { CircuitSimulator, Wire, Bus, toDec } from './circuitsimulator'

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

type Opcode = number
type CtlLines = number[]

export const microcodeTable: [Opcode, CtlLines][] = [
    [0b00001, [CTL.PC_OUT | CTL.MAR_IN, CTL.A_IN | CTL.PC_INC | CTL.RAM_OUT]],
    [0b00010, [CTL.PC_OUT | CTL.MAR_IN, CTL.B_IN | CTL.PC_INC | CTL.RAM_OUT]],
    [0b00100, [0x9000]],
    [0b00101, [0x6000]],
    [0b01000, [CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x4220]],
    [0b01001, [CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x1220]],
    [0b01010, [CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x8210]],
    [0b01011, [CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x2210]],
    [0b10000, [CTL.PC_OUT | CTL.MAR_IN, CTL.ALU_OUT | CTL.A_IN]],
    [0b10001, [CTL.PC_OUT | CTL.MAR_IN, CTL.ALU_OUT | CTL.A_IN]],
    [0b10010, [CTL.PC_OUT | CTL.MAR_IN, CTL.ALU_OUT | CTL.A_IN]],
    [0b11111, [CTL.PC_OUT | CTL.MAR_IN, 0x0110]]
]

export function buildMicrocode(table: [Opcode, CtlLines][]) {
    const steps = 8
    const microcode = Array(0b100000 * steps).fill(0)
    const fetchSteps = [CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT]

    for (let op = 0b00000; op <= 0b11111; op += 1) {
        microcode[op * steps + 0] = fetchSteps[0]
        microcode[op * steps + 1] = fetchSteps[1]
    }

    table.forEach(([op, ctllines]) => ctllines.forEach((microop, ix) => microcode[op * steps + 2 + ix] = microop))

    return microcode
}

export class SAP1 extends CircuitSimulator {    
    build(clk: Wire, reset: Wire, microcode: number[], mem: number[] = Array(256).fill(0)) {
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

    load(mem: number[], program: number[]) {
        program.forEach((v, ix) => mem[ix] = v)
    }

    isZero(data: Bus, out: Wire): Wire {
        data.trigger(() => this.schedule(() => out.setSignal(toDec(data) === 0x0), 0)) // Use a comparator here
        return out
    } 

    controlunit(opcode: Bus, clk: Wire, reset: Wire, microcode: number[], ctrl: Bus, resetOnZero = false): Bus {
        const nop = this.wire()
        const step = this.counter(this.bus(3), clk, this.High, this.or(reset, nop))
        const ctrlin = new Bus(step.wires.concat(opcode))

        this.rom(ctrlin, microcode, ctrl)
        if (resetOnZero) this.isZero(ctrl, nop)

        return step
    }

    programCounter({ data, clk, reset, inc = this.wire(), we = this.wire(), oe = this.wire(), out = data.clone() }: { data: Bus; clk: Wire; reset: Wire; inc?: Wire; we?: Wire; oe?: Wire; out?: Bus; }) {
        const [incremented, _] = this.incrementer(out)
        this.connect(
            this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset), 
            out
        )

        this.buffer(out, oe, data)

        return { out, inc, we, oe }
    }
    
    busRegister({ bus, clk, reset = this.wire(), we = this.wire(), oe = this.wire() }: { bus: Bus; clk: Wire; reset?: Wire; we?: Wire; oe?: Wire; }) {
        const out = this.register(bus, clk, we, reset)
        this.buffer(out, oe, bus)
        return { out, we, oe }
    }

    alu({ a, b, bus: out = a.clone(), oe = this.wire() }: { a: Bus; b: Bus; bus?: Bus; oe?: Wire, sum?: Bus }) {
        const [sum, carry_out] = this.fulladder(a, b, this.Low)
        this.buffer(sum, oe, out)
        return { a, b, out, sum, oe }
    }
}
