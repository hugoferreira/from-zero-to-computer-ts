import * as c from 'colors'
import { toDec } from './circuitsimulator'
import { SAP1, buildMicrocode, microcodeTable } from './sap-1'
import { dumpRAM, dumpRegisters } from './repl'
import { asm, unasm, LDA, LDB, ADD, STA, JMP } from './assembler'

const program = asm(
    LDA(0x10),
    LDB(0x02),
    ADD(),
    STA(0x1C),
    JMP(4)
)

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = new Uint8Array(256)

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const { MAR_DATA, STEP, PC_DATA } = computer

let PC = toDec(PC_DATA)

s.load(ram, program)
s.do()

CLK.onChange(() => {
    if (toDec(STEP) === 0) PC = toDec(PC_DATA)
})

setInterval(() => {
    s.posedge(CLK)
}, 500)

const toHex = (...xs: number[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 

setInterval(() => {
    console.clear()
    dumpRAM(ram, toDec(MAR_DATA))
    console.log()
    dumpRegisters(computer)
    console.log()
    console.log(c.green('ASM\t') + unasm(ram.slice(PC, PC + 3)).map(op => `${c.cyan(toHex(...op.code).join(' ').padEnd(7))} ${op}`)[0])
}, 500)
