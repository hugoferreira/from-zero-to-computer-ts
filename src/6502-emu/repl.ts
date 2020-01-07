import * as c from 'colors'

const isPrintable = (keycode: number) => (keycode >= 32 && keycode < 127)

export function dumpRAM(ram: Uint8Array, currentAddress: number, pc: number) {
    const offset = pc & 0xFF00
    console.log(c.blue(toHex(offset >> 8)) + c.green('   00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F\n'))
    for (let i = offset; i < offset + 0x100; i += 0x10) {
        const vals = Array<number>(...ram.subarray(i, i + 0x10).values())
        const row = vals.map(b => toHex(b))
                        .map(s => (s === '00') ? c.dim('00') : s)
                        .map((s, j) => ((i + j) === currentAddress) ? c.underline(s) : s)
                        .map((s, j) => ((i + j) === pc) ? c.green(s) : s)
                        .map((s, j) => j === 8 ? ' ' + s : s)
                        .join(' ')
                        
        const ascii = vals.map(v => isPrintable(v) ? String.fromCharCode(v) : c.dim('.'))
                          .map((s, j) => j === 8 ? ' ' + s : s)
                          .join('')
                    
        console.log(`${c.green((i & 0xFF).toString(16).toUpperCase().padEnd(2, '0'))}   ${row} ${ascii}`)
    }
}

const toHex = (x: number) => `${x.toString(16).toUpperCase().padStart(2, '0')}`

export function dumpRegisters(A: number, X: number, Y: number, IR: number, PC: number, SP: number, STATUS: number) {
    const flags = 
        ((STATUS >> 7 & 0x1) ? "N" : c.dim("N")) +
        ((STATUS >> 6 & 0x1) ? "V" : c.dim("V")) +
        ((STATUS >> 5 & 0x1) ? "U" : c.dim("U")) +
        ((STATUS >> 4 & 0x1) ? "B" : c.dim("B")) +
        ((STATUS >> 3 & 0x1) ? "D" : c.dim("D")) +
        ((STATUS >> 2 & 0x1) ? "I" : c.dim("I")) +
        ((STATUS >> 1 & 0x1) ? "Z" : c.dim("Z")) +
        ((STATUS >> 0 & 0x1) ? "C" : c.dim("C")) 
    
    console.log(`${c.green('A')}\t${toHex(A)}\t${c.green('X')}\t${toHex(X)}\t${c.green('Y')}\t${toHex(Y)}`)
    console.log(`${c.green('PC')}\t${toHex(PC)}\t${c.green('SP')}\t${toHex(SP)}\t${c.green('IR')}\t${toHex(IR)}\t${c.green('FLAGS')}\t${flags}`)
}