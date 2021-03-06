import * as c from 'colors'
import { Bus, toHex, toBin } from '../circuitsimulator'

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

export function dumpRegisters(
        { DBUS, A_DATA, B_DATA, IR_DATA, MAR_DATA, PC_DATA, SP_DATA, ALU_DATA, RAM_DATA, OPCODE, STEP, CTRL }: 
        { DBUS: Bus, A_DATA: Bus, B_DATA: Bus, IR_DATA: Bus, MAR_DATA: Bus, PC_DATA: Bus, SP_DATA: Bus, ALU_DATA: Bus, RAM_DATA: Bus, OPCODE: Bus, STEP: Bus, CTRL: Bus }) {
    console.log(`${c.green('BUS')}\t${toHex(DBUS)}\t${c.green('MAR')}\t${toHex(MAR_DATA)}\t${c.green('RAM')}\t${toHex(RAM_DATA)}`)
    console.log(`${c.green('A')}\t${toHex(A_DATA)}\t${c.green('B')}\t${toHex(B_DATA)}\t${c.green('ALU')}\t${toHex(ALU_DATA)}`)
    console.log(`${c.green('PC')}\t${toHex(PC_DATA)}\t${c.green('SP')}\t${toHex(SP_DATA)}\t${c.green('IR')}\t${toHex(IR_DATA)}`)
    console.log(`${c.green('STEP')}\t${toHex(STEP)}\t${c.green('OP')}\t${toBin(OPCODE)}\t${c.green('CTRL')}\t${toBin(CTRL)}`)
}