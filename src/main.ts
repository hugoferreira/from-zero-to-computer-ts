import { Wire, toHex as th, toBin as tb, toDec } from './circuitsimulator'
import { SAP1, CTL } from './sap-1'
import { dumpRAM, dumpRegisters } from './repl'

const toHex = th
const toBin = tb

const microcode = [
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x8210, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x2210, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x9000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x6000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x4220, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x1220, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x8210, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x0050, 0x2210, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x8004, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x8008, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x800C, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    CTL.PC_OUT | CTL.MAR_IN, CTL.IR_IN | CTL.PC_INC | CTL.RAM_OUT, CTL.PC_OUT | CTL.MAR_IN, 0x0110, 0x0000, 0x0000, 0x0000, 0x0000]

const program = [0x01, 0xA0, 0x02, 0xB0, 0x10, 0x08, 0x1C, 0x1F, 0x02]
// const program = [0x01, 0x03]

const s = new SAP1()
const CLK = s.clock(1, false)
const RESET = new Wire
const ram = Array<number>(256).fill(0)

const computer = s.build(CLK, RESET, microcode, ram)
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
