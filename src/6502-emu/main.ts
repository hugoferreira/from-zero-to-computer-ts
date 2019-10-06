import { MOS6502Emulator, AddressBus, TAddress, TData } from './6502emulator'
import { dumpRAM, dumpRegisters } from './repl'

function load(mem: Uint8Array, program: Uint8Array, offset: number = 0) {
    program.forEach((v, ix) => mem[ix + offset] = v)
    mem[0xFFFC] = offset & 0x00FF
    mem[0xFFFD] = offset & 0xFF00
}

const ram = new Uint8Array(0xFFFF)
const bus = new class implements AddressBus {
    read(addr: TAddress): TData { return ram[addr] }
    write(addr: TAddress, data: TData) { ram[addr] = data }
}
const s = new MOS6502Emulator(bus)

// *= $8000
// LDX #10
// STX $0000
// LDX 3
// STX $0001
// LDY $0000
// LDA #0
// CLC
// loop
// ADC $0001
// DEY
// BNE loop
// STA $0002
// NOP
// NOP
// NOP
load(ram, new Uint8Array([0xA2, 0x0A, 0x8E, 0x00, 0x00, 0xA2, 0x03, 0x8E, 0x01, 0x00, 0xAC, 0x00, 0x00, 0xA9, 0x00, 0x18, 0x6D, 0x01, 0x00, 0x88, 0xD0, 0xFA, 0x8D, 0x02, 0x00, 0xEA, 0xEA, 0xEA]), 0x40)

s.reset()

setInterval(() => {
    s.clock()

    console.clear()
    dumpRAM(ram, s.addr_abs)
    console.log()
    dumpRegisters(s.A, s.X, s.Y, s.opcode, s.PC, s.SP, s.STATUS)
    console.log()
}, 300)
