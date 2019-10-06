/*
    Functional (non-cycle perfect) emulation of the 6502 processor
	Based on the C code of David Barr, aka javidx9

    Datasheet: http://archive.6502.org/datasheets/rockwell_r650x_r651x.pdf
*/

export type TData = number
export type TAddress = number

export interface AddressBus {
    read(addr: TAddress): TData 
    write(addr: TAddress, data: TData): void
}

export enum FLAGS {
    C = (1 << 0), // Carry Bit
    Z = (1 << 1), // Zero
    I = (1 << 2), // Disable Interrupts
    D = (1 << 3), // Decimal Mode (unused in this implementation)
    B = (1 << 4), // Break
    U = (1 << 5), // Unused
    V = (1 << 6), // Overflow
    N = (1 << 7), // Negative
}

export class MOS6502Emulator {
    lookup: [string, () => void, () => void][]
    
    // Core CPU Registers
    A = 0x00
    X = 0x00
    Y = 0x00
    PC = 0x0000
    SP = 0x00
    STATUS = 0x00

    // Auxiliary 
    addr_abs = 0x0000
    addr_rel = 0x00
    fetched = 0x00
    opcode = 0x00

    // Timing
    clock_count = 0

    constructor(public readonly bus: AddressBus) { 
        this.lookup = [
            ["BRK", this.BRK, this.IMM], ["ORA", this.ORA, this.IZX], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ORA", this.ORA, this.ZP0], ["ASL", this.ASL, this.ZP0], ["???", this.XXX, this.IMP], ["PHP", this.PHP, this.IMP], ["ORA", this.ORA, this.IMM], ["ASL", this.ASL, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ORA", this.ORA, this.ABS], ["ASL", this.ASL, this.ABS], ["???", this.XXX, this.IMP],
            ["BPL", this.BPL, this.REL], ["ORA", this.ORA, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ORA", this.ORA, this.ZPX], ["ASL", this.ASL, this.ZPX], ["???", this.XXX, this.IMP], ["CLC", this.CLC, this.IMP], ["ORA", this.ORA, this.ABY], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ORA", this.ORA, this.ABX], ["ASL", this.ASL, this.ABX], ["???", this.XXX, this.IMP],
            ["JSR", this.JSR, this.ABS], ["AND", this.AND, this.IZX], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["BIT", this.BIT, this.ZP0], ["AND", this.AND, this.ZP0], ["ROL", this.ROL, this.ZP0], ["???", this.XXX, this.IMP], ["PLP", this.PLP, this.IMP], ["AND", this.AND, this.IMM], ["ROL", this.ROL, this.IMP], ["???", this.XXX, this.IMP], ["BIT", this.BIT, this.ABS], ["AND", this.AND, this.ABS], ["ROL", this.ROL, this.ABS], ["???", this.XXX, this.IMP],
            ["BMI", this.BMI, this.REL], ["AND", this.AND, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["AND", this.AND, this.ZPX], ["ROL", this.ROL, this.ZPX], ["???", this.XXX, this.IMP], ["SEC", this.SEC, this.IMP], ["AND", this.AND, this.ABY], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["AND", this.AND, this.ABX], ["ROL", this.ROL, this.ABX], ["???", this.XXX, this.IMP],
            ["RTI", this.RTI, this.IMP], ["EOR", this.EOR, this.IZX], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["EOR", this.EOR, this.ZP0], ["LSR", this.LSR, this.ZP0], ["???", this.XXX, this.IMP], ["PHA", this.PHA, this.IMP], ["EOR", this.EOR, this.IMM], ["LSR", this.LSR, this.IMP], ["???", this.XXX, this.IMP], ["JMP", this.JMP, this.ABS], ["EOR", this.EOR, this.ABS], ["LSR", this.LSR, this.ABS], ["???", this.XXX, this.IMP],
            ["BVC", this.BVC, this.REL], ["EOR", this.EOR, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["EOR", this.EOR, this.ZPX], ["LSR", this.LSR, this.ZPX], ["???", this.XXX, this.IMP], ["CLI", this.CLI, this.IMP], ["EOR", this.EOR, this.ABY], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["EOR", this.EOR, this.ABX], ["LSR", this.LSR, this.ABX], ["???", this.XXX, this.IMP],
            ["RTS", this.RTS, this.IMP], ["ADC", this.ADC, this.IZX], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ADC", this.ADC, this.ZP0], ["ROR", this.ROR, this.ZP0], ["???", this.XXX, this.IMP], ["PLA", this.PLA, this.IMP], ["ADC", this.ADC, this.IMM], ["ROR", this.ROR, this.IMP], ["???", this.XXX, this.IMP], ["JMP", this.JMP, this.IND], ["ADC", this.ADC, this.ABS], ["ROR", this.ROR, this.ABS], ["???", this.XXX, this.IMP],
            ["BVS", this.BVS, this.REL], ["ADC", this.ADC, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ADC", this.ADC, this.ZPX], ["ROR", this.ROR, this.ZPX], ["???", this.XXX, this.IMP], ["SEI", this.SEI, this.IMP], ["ADC", this.ADC, this.ABY], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["ADC", this.ADC, this.ABX], ["ROR", this.ROR, this.ABX], ["???", this.XXX, this.IMP],
            ["???", this.NOP, this.IMP], ["STA", this.STA, this.IZX], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["STY", this.STY, this.ZP0], ["STA", this.STA, this.ZP0], ["STX", this.STX, this.ZP0], ["???", this.XXX, this.IMP], ["DEY", this.DEY, this.IMP], ["???", this.NOP, this.IMP], ["TXA", this.TXA, this.IMP], ["???", this.XXX, this.IMP], ["STY", this.STY, this.ABS], ["STA", this.STA, this.ABS], ["STX", this.STX, this.ABS], ["???", this.XXX, this.IMP],
            ["BCC", this.BCC, this.REL], ["STA", this.STA, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["STY", this.STY, this.ZPX], ["STA", this.STA, this.ZPX], ["STX", this.STX, this.ZPY], ["???", this.XXX, this.IMP], ["TYA", this.TYA, this.IMP], ["STA", this.STA, this.ABY], ["TXS", this.TXS, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["STA", this.STA, this.ABX], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP],
            ["LDY", this.LDY, this.IMM], ["LDA", this.LDA, this.IZX], ["LDX", this.LDX, this.IMM], ["???", this.XXX, this.IMP], ["LDY", this.LDY, this.ZP0], ["LDA", this.LDA, this.ZP0], ["LDX", this.LDX, this.ZP0], ["???", this.XXX, this.IMP], ["TAY", this.TAY, this.IMP], ["LDA", this.LDA, this.IMM], ["TAX", this.TAX, this.IMP], ["???", this.XXX, this.IMP], ["LDY", this.LDY, this.ABS], ["LDA", this.LDA, this.ABS], ["LDX", this.LDX, this.ABS], ["???", this.XXX, this.IMP],
            ["BCS", this.BCS, this.REL], ["LDA", this.LDA, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["LDY", this.LDY, this.ZPX], ["LDA", this.LDA, this.ZPX], ["LDX", this.LDX, this.ZPY], ["???", this.XXX, this.IMP], ["CLV", this.CLV, this.IMP], ["LDA", this.LDA, this.ABY], ["TSX", this.TSX, this.IMP], ["???", this.XXX, this.IMP], ["LDY", this.LDY, this.ABX], ["LDA", this.LDA, this.ABX], ["LDX", this.LDX, this.ABY], ["???", this.XXX, this.IMP],
            ["CPY", this.CPY, this.IMM], ["CMP", this.CMP, this.IZX], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["CPY", this.CPY, this.ZP0], ["CMP", this.CMP, this.ZP0], ["DEC", this.DEC, this.ZP0], ["???", this.XXX, this.IMP], ["INY", this.INY, this.IMP], ["CMP", this.CMP, this.IMM], ["DEX", this.DEX, this.IMP], ["???", this.XXX, this.IMP], ["CPY", this.CPY, this.ABS], ["CMP", this.CMP, this.ABS], ["DEC", this.DEC, this.ABS], ["???", this.XXX, this.IMP],
            ["BNE", this.BNE, this.REL], ["CMP", this.CMP, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["CMP", this.CMP, this.ZPX], ["DEC", this.DEC, this.ZPX], ["???", this.XXX, this.IMP], ["CLD", this.CLD, this.IMP], ["CMP", this.CMP, this.ABY], ["NOP", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["CMP", this.CMP, this.ABX], ["DEC", this.DEC, this.ABX], ["???", this.XXX, this.IMP],
            ["CPX", this.CPX, this.IMM], ["SBC", this.SBC, this.IZX], ["???", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["CPX", this.CPX, this.ZP0], ["SBC", this.SBC, this.ZP0], ["INC", this.INC, this.ZP0], ["???", this.XXX, this.IMP], ["INX", this.INX, this.IMP], ["SBC", this.SBC, this.IMM], ["NOP", this.NOP, this.IMP], ["???", this.SBC, this.IMP], ["CPX", this.CPX, this.ABS], ["SBC", this.SBC, this.ABS], ["INC", this.INC, this.ABS], ["???", this.XXX, this.IMP],
            ["BEQ", this.BEQ, this.REL], ["SBC", this.SBC, this.IZY], ["???", this.XXX, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["SBC", this.SBC, this.ZPX], ["INC", this.INC, this.ZPX], ["???", this.XXX, this.IMP], ["SED", this.SED, this.IMP], ["SBC", this.SBC, this.ABY], ["NOP", this.NOP, this.IMP], ["???", this.XXX, this.IMP], ["???", this.NOP, this.IMP], ["SBC", this.SBC, this.ABX], ["INC", this.INC, this.ABX], ["???", this.XXX, this.IMP]]
    }

    reset() {
        // Get address to set program counter to
        this.addr_abs = 0xFFFC
        this.PC = this.read(this.addr_abs) | (this.read(this.addr_abs + 1) << 8) 

        // Reset internal registers
        this.A = 0
        this.X = 0
        this.Y = 0
        this.SP = 0xFD
        this.STATUS = 0x00 | FLAGS.U

        // Clear internal helper variables
        this.addr_rel = 0x0000
        this.addr_abs = 0x0000
        this.fetched = 0x00         // Not sure this is needed
    }

    // Status register manipulation
    setFlag(f: FLAGS, v: boolean) {
        if (v) this.STATUS |= f
        else this.STATUS &= ~f
    }

    getFlag(f: FLAGS) { return ((this.STATUS & f) > 0) ? 1 : 0 }

    // Tick-tock
    clock() {
        this.opcode = this.read(this.PC)
        this.setFlag(FLAGS.U, true)
        this.PC += 1

        this.lookup[this.opcode][2].call(this)
        this.lookup[this.opcode][1].call(this)

        this.setFlag(FLAGS.U, true)
        
        this.clock_count += 1
    }

    // Bus Read and Write
    read(addr: TAddress): TData { return this.bus.read(addr) }
    write(addr: TAddress, data: TData) { this.bus.write(addr, data) }
    
    // Fetch
    fetch() {
        if (!(this.lookup[this.opcode][2] === this.IMP))
            this.fetched = this.read(this.addr_abs)

        return this.fetched
    }

    // Addressing Modes
    ABS(ofs: number = 0) { this.addr_abs = ((this.read(this.PC++) | this.read(this.PC++) << 8) + ofs) & 0xFFFF }
    ABX() { this.ABS(this.X) }
    ABY() { this.ABS(this.Y) }
    IMM() { this.addr_abs = this.PC++ }
    IMP() { this.fetched = this.A }
    IND() { 
        const lo = this.read(this.PC++)
        const hi = this.read(this.PC++)
        const addr = (hi << 8) | lo

        // Simulate page boundary hardware bug
        if (lo === 0x00FF) this.addr_abs = (this.read(addr & 0xFF00) << 8) | this.read(addr)
        else this.addr_abs = (this.read(addr + 1) << 8) | this.read(addr)
    }
    IZX() { 
        const t = this.read(this.PC++)
        const lo = this.read((t + this.X) & 0xFF)
        const hi = this.read((t + this.X + 1) & 0xFF)
	    this.addr_abs = (hi << 8) | lo
    }
    IZY() { 
        const t = this.read(this.PC++)
        const lo = this.read((t + this.Y) & 0xFF)
        const hi = this.read((t + this.Y + 1) & 0xFF)
        this.addr_abs = (hi << 8) | lo
    }
    REL() { 
        this.addr_rel = this.read(this.PC++)
        if (this.addr_rel & 0x80) this.addr_rel |= 0xFF00
    }
    ZP0() { this.addr_abs = this.read(this.PC++) & 0xFF }
    ZPX() { this.addr_abs = this.read(this.X + this.PC++) & 0xFF }
    ZPY() { this.addr_abs = this.read(this.Y + this.PC++) & 0xFF }

    // Calculate Zero and Negative Flags
    setZN(v: number) {
        this.setFlag(FLAGS.Z, (v & 0x00FF) === 0)
        this.setFlag(FLAGS.N, !!(v & 0x80))
    }

    // Arithmetic Instructions
    ADC() { 
        this.fetch()
        const temp = this.A + this.fetched + this.getFlag(FLAGS.C)
        this.setZN(temp)
        this.setFlag(FLAGS.C, !! (temp & 0xFF00))
        this.A = temp & 0xFF
        this.setFlag(FLAGS.V, !!(~(this.A ^ this.fetched) & (this.A ^ temp) & 0x0080))
    }

    SBC() { 
        this.fetch()
        const value = this.fetched ^ 0x00FF
        const temp = this.A + value + this.getFlag(FLAGS.C)
        this.setZN(temp)
        this.setFlag(FLAGS.C, !!(temp & 0xFF00))
        this.A = temp & 0xFF
        this.setFlag(FLAGS.V, !! ((temp ^ this.A) & (temp ^ value) & 0x0080))
    }

    // Logic Instructions
    AND() { this.A &= this.fetch(); this.setZN(this.A) }
    ORA() { this.A |= this.fetch(); this.setZN(this.A) }
    EOR() { this.A ^= this.fetch(); this.setZN(this.A) }
    BIT() {
        this.fetch()
        this.setFlag(FLAGS.Z, (this.A & this.fetched) === 0)
        this.setFlag(FLAGS.N, !! (this.fetched & (1 << 7)))
        this.setFlag(FLAGS.V, !! (this.fetched & (1 << 6)))
    }

    // Shift Instructions
    STSHIFT(v: number) {
        if (this.lookup[this.opcode][2] === this.IMP)
            this.A = v & 0xFF
        else this.write(this.addr_abs, v & 0xFF)
    }

    ASL() { 
        this.fetch()
        const temp = (this.fetched << 1) & 0xFFFF
        this.setFlag(FLAGS.C, !!(temp & 0xFF00))
        this.setZN(temp)
        this.STSHIFT(temp)
    }

    LSR() { 
        this.fetch()
        this.setFlag(FLAGS.C, !!(this.fetched & 0x1))
        const temp = this.fetched >> 1
        this.setZN(temp)
        this.STSHIFT(temp)
    }

    ROL() { 
        this.fetch()
        const temp = (this.fetched << 1) | this.getFlag(FLAGS.C)
        this.setFlag(FLAGS.C, !!(temp & 0xFF00))
        this.setZN(temp)
        this.STSHIFT(temp)
    }

    ROR() { 
        this.fetch()
        const temp = (this.getFlag(FLAGS.C) << 7) | (this.fetched >> 1)
        this.setFlag(FLAGS.C, !!(this.fetched & 0x1))
        this.setZN(temp)
        this.STSHIFT(temp)
    }

    // Decrement/Increment Instructions
    DEC() {
        const temp = (this.fetch() - 1) & 0xFF
        this.write(this.addr_abs, temp)
        this.setZN(temp)
    }
    DEX() { this.X = (this.X - 1) & 0xFF; this.setZN(this.X) }
    DEY() { this.Y = (this.Y - 1) & 0xFF; this.setZN(this.Y) }

    INC() {
        const temp = (this.fetch() + 1) & 0xFF
        this.write(this.addr_abs, temp)
        this.setZN(temp)
    }
    INX() { this.X = (this.X + 1) & 0xFF; this.setZN(this.X) }
    INY() { this.X = (this.Y + 1) & 0xFF; this.setZN(this.Y) }

    // Compare Instructions
    CPX() { this.CMP(this.X) }
    CPY() { this.CMP(this.Y) }
    CMP(r: number = this.A) {
        this.fetch()
        const temp = (r - this.fetched) & 0xFF
        this.setFlag(FLAGS.C, r >= this.fetched)
        this.setZN(temp)
    }

    // Branching Instructions
    BRA(f: boolean) { if (f) { this.addr_abs = (this.PC + this.addr_rel) & 0xFFFF; this.JMP() } }
    BCC() { this.BRA(this.getFlag(FLAGS.C) === 0) }
    BCS() { this.BRA(this.getFlag(FLAGS.C) === 1) }
    BEQ() { this.BRA(this.getFlag(FLAGS.Z) === 1) }
    BNE() { this.BRA(this.getFlag(FLAGS.Z) === 0) }
    BMI() { this.BRA(this.getFlag(FLAGS.N) === 1) }
    BPL() { this.BRA(this.getFlag(FLAGS.N) === 0) }
    BVC() { this.BRA(this.getFlag(FLAGS.V) === 0) }
    BVS() { this.BRA(this.getFlag(FLAGS.V) === 1) }
    JMP() { this.PC = this.addr_abs }

    // Functions Calls
    RTS() { this.PC = this.POP() | (this.POP() << 8) + 1 }
    JSR() {
        this.PUSH(((this.PC - 1) >> 8) & 0xFF)
        this.PUSH(((this.PC - 1) & 0xFF))
        this.JMP()
    }

    // Stack Instructions
    PUSH(v: number) { this.write(0x0100 + this.SP, v); this.SP-- }
    PHA() { this.PUSH(this.A) }
    PHP() { this.PUSH(this.STATUS | FLAGS.B | FLAGS.U) }

    POP() { this.SP++; return this.read(0x0100 + this.SP) }
    PLA() { this.A = this.POP(); this.setZN(this.A) }
    PLP() { this.STATUS = this.POP(); this.setFlag(FLAGS.U, true) }
    TSX() { this.X = this.SP; this.setZN(this.X) }
    TXS() { this.SP = this.X }

    // Load/Store Memory Instructions
    LDA() { this.A = this.fetch(); this.setZN(this.A) }
    LDX() { this.X = this.fetch(); this.setZN(this.X) }
    LDY() { this.Y = this.fetch(); this.setZN(this.Y) }
    STA() { this.write(this.addr_abs, this.A) }
    STX() { this.write(this.addr_abs, this.X) }
    STY() { this.write(this.addr_abs, this.Y) }

    // Flags Instructions
    CLC() { this.setFlag(FLAGS.C, false) }
    CLD() { this.setFlag(FLAGS.D, false) }
    CLI() { this.setFlag(FLAGS.I, false) }
    CLV() { this.setFlag(FLAGS.V, false) }
    SEC() { this.setFlag(FLAGS.C, true) }
    SED() { this.setFlag(FLAGS.D, true) }
    SEI() { this.setFlag(FLAGS.I, true) }

    // Register-to-Register Instructions
    TAX() { this.X = this.A; this.setZN(this.X) }
    TAY() { this.Y = this.A; this.setZN(this.Y) }
    TXA() { this.A = this.X; this.setZN(this.A) }
    TYA() { this.A = this.Y; this.setZN(this.A) }

    // System Instructions
    XXX() { }
    NOP() { }
    BRK() { }
    RTI() { }
}