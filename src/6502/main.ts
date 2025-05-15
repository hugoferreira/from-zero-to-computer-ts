import * as c from 'colors'
import { toDec } from '../circuitsimulator'
import { MOS6502, buildMicrocode, microcodeTable } from './6502'
import { dumpRAM, dumpRegisters } from './repl'
import { asm, unasm, LDA, LDB, ADD, STA, JMP, REPEAT } from './assembler'

const program = asm(
    LDA(32),
    LDB(1),
    ...REPEAT(
        ADD(),
        STA(0x1C)
    )
)

const s = new MOS6502()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(256)

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const { MAR_DATA, STEP, PC_DATA } = computer

let PC = toDec(PC_DATA)

s.load(ram, program)
s.forward()

CLK.onChange(() => {
    if (toDec(STEP) === 0) PC = toDec(PC_DATA)
})

setInterval(() => {
    s.posedge(CLK)
}, 100)

const toHex = (...xs: (number | string)[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 

setInterval(() => {
    console.clear()
    dumpRAM(ram, toDec(MAR_DATA))
    console.log()
    dumpRegisters(computer)
    console.log()
    try {
        console.log(unasm(ram.slice(PC, PC + 2)).map(op => `${c.green('CODE')}\t${c.cyan(toHex(...op.code).join(' ').padEnd(7))}\t${c.green('ASM')}\t${op}`)[0])
    } catch { }
}, 100)
