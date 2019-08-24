import { toDec } from './circuitsimulator'
import { SAP1, buildMicrocode, microcodeTable } from './sap-1'
import { dumpRAM, dumpRegisters } from './repl'

const program = [0x01, 0x10, 0x02, 0x02, 0x10, 0x08, 0x1C, 0x1F, 0x04] 

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = Array<number>(256).fill(0)

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const { MAR_DATA } = computer

s.load(ram, program)
s.do()

setInterval(() => {
    s.posedge(CLK)

    console.clear()
    dumpRAM(ram, toDec(MAR_DATA))
    console.log()
    dumpRegisters(computer)
}, 500)
