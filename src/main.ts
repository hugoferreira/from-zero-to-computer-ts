import { Wire, toHex as th, toBin as tb, toDec } from './circuitsimulator'
import { SAP1, CTL, buildMicrocode, microcodeTable } from './sap-1'
import { dumpRAM, dumpRegisters } from './repl'

const toHex = th
const toBin = tb

// const program = [0x01, 0x01, 0x02, 0x01, 0x10, 0x08, 0x1C, 0x1F, 0x04]
// const program = [0x01, 0x03]

const program = [0x01, 0x01, 0x02, 0x02, 0x10, 0x08, 0x1C, 0x1F, 0x04] // WTF? B is loaded with 3?


const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = s.wire()
const ram = Array<number>(256).fill(0)

const computer = s.build(CLK, RESET, buildMicrocode(microcodeTable), ram)
const {
    DBUS,       // Data Bus
    A_DATA,     // Register A
    B_DATA,     // Register B
    IR_DATA,    // Instruction Register
    MAR_DATA,   // Memory Address Register
    PC_DATA,    // Program Counter
    ALU_DATA,   // Arithmetic Logic Unit Output
    RAM_DATA,   // RAM Output
    OPCODE,     // Current Opcode (from IR)
    STEP,       // Microcode Step
    CTRL        // Control Lines
} = computer

s.load(ram, program)
s.do()
/*
STEP        //? toHex($)
DBUS        //? toHex($)
MAR_DATA    //? toHex($)
PC_DATA     //? toHex($)
CTRL        //? toBin($)

s.posedge(CLK)
STEP        //? toHex($)
DBUS        //? toHex($)
MAR_DATA    //? toHex($)
PC_DATA     //? toHex($)
CTRL        //? toBin($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
IR_DATA     //? toHex($)
MAR_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
B_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
IR_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
B_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
IR_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
B_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
IR_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)

s.posedge(CLK)
STEP        //? toHex($)
CTRL        //? toBin($)
A_DATA      //? toHex($)
B_DATA      //? toHex($)
DBUS        //? toHex($)
PC_DATA     //? toHex($)
IR_DATA     //? toHex($)
MAR_DATA    //? toHex($)
RAM_DATA    //? toHex($)
*/

setInterval(() => {
    s.posedge(CLK)

    console.clear()
    dumpRAM(ram, toDec(MAR_DATA))
    console.log()
    dumpRegisters(computer)
}, 1000)
