import * as c from 'colors'
import { Bus, toHex, toBin, Wire, CircuitSimulator } from '../circuitsimulator'

const isPrintable = (keycode: number) => (keycode >= 32 && keycode < 127)

export function dumpRAM(ram: Uint8Array, currentAddress: number) {
    console.log(c.green('     00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F\n'))
    for (let i = 0; i < 16; i += 1) {
        const vals = Array<number>(...ram.subarray(i * 16, (i + 1) * 16).values())
        const row = vals.map(b => b.toString(16).toUpperCase().padStart(2, '0'))
                        .map(s => (s === '00') ? c.dim('00') : s)
                        .map((s, j) => ((i * 16 + j) === currentAddress) ? c.underline(s) : s)
                        .map((s, j) => j === 8 ? ' ' + s : s)
                        .join(' ')
                        
        const ascii = vals.map(v => isPrintable(v) ? String.fromCharCode(v) : c.dim('.'))
                          .map((s, j) => j === 8 ? ' ' + s : s)
                          .join('')
                    
        console.log(`${c.green(i.toString(16).toUpperCase().padEnd(2, '0'))}   ${row} ${ascii}`)
    }
}

// Create a simple simulator for empty buses
const dummySimulator = new CircuitSimulator();

// Updated for SAP-2 with more registers and different bus names
export function dumpRegisters(computer: {
    WBUS?: Bus, 
    DBUS?: Bus, 
    A_DATA: Bus, 
    B_DATA: Bus, 
    C_DATA?: Bus, 
    TMP_DATA?: Bus, 
    IR_DATA: Bus, 
    MAR_DATA: Bus, 
    MDR_DATA?: Bus, 
    PC_DATA: Bus, 
    ALU_DATA?: Bus, 
    RAM_DATA?: Bus, 
    FLAGS_DATA?: Bus, 
    OPCODE: Bus, 
    STEP: Bus, 
    CTRL: Bus 
}) {
    // Extract all needed values, with fallbacks for compatibility
    const { 
        A_DATA, B_DATA, IR_DATA, MAR_DATA, PC_DATA, OPCODE, STEP, CTRL 
    } = computer;
    
    // Handle both SAP-1 (DBUS) and SAP-2 (WBUS) naming
    const dataBus = computer.WBUS || computer.DBUS || dummySimulator.bus(8);
    const ramData = computer.MDR_DATA || computer.RAM_DATA || dummySimulator.bus(8);
    const cData = computer.C_DATA || dummySimulator.bus(8);
    const tmpData = computer.TMP_DATA || dummySimulator.bus(8);
    const aluData = computer.ALU_DATA || dummySimulator.bus(8);
    const flagsData = computer.FLAGS_DATA || dummySimulator.bus(2);
    
    console.log(`${c.green('BUS')}\t${toHex(dataBus)}\t${c.green('MAR')}\t${toHex(MAR_DATA)}\t${c.green('MDR')}\t${toHex(ramData)}`)
    console.log(`${c.green('A')}\t${toHex(A_DATA)}\t${c.green('B')}\t${toHex(B_DATA)}\t${c.green('C')}\t${toHex(cData)}`)
    console.log(`${c.green('TMP')}\t${toHex(tmpData)}\t${c.green('ALU')}\t${toHex(aluData)}\t${c.green('FLAGS')}\t${toHex(flagsData)}`)
    console.log(`${c.green('PC')}\t${toHex(PC_DATA)}\t${c.green('IR')}\t${toHex(IR_DATA)}`)
    console.log(`${c.green('STEP')}\t${toHex(STEP)}\t${c.green('OP')}\t${toBin(OPCODE)}\t${c.green('CTRL')}\t${toBin(CTRL)}`)
}