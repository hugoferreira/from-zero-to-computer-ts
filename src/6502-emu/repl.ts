import * as c from 'colors'

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

const toHex = (...xs: (number | string)[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 

export function dumpRegisters(A: number, X: number, Y: number, IR: number, PC: number, SP: number, STATUS: number) {
    const flags = 
        ((STATUS >> 0 & 0x1) ? "C" : c.dim("C")) +
        ((STATUS >> 1 & 0x1) ? "Z" : c.dim("Z")) +
        ((STATUS >> 2 & 0x1) ? "I" : c.dim("I")) +
        ((STATUS >> 3 & 0x1) ? "D" : c.dim("D")) +
        ((STATUS >> 4 & 0x1) ? "B" : c.dim("B")) +
        ((STATUS >> 5 & 0x1) ? "U" : c.dim("U")) +
        ((STATUS >> 6 & 0x1) ? "V" : c.dim("V")) +
        ((STATUS >> 7 & 0x1) ? "N" : c.dim("N")) 
    
    console.log(`${c.green('A')}\t${toHex(A)}\t${c.green('X')}\t${toHex(X)}\t${c.green('Y')}\t${toHex(Y)}`)
    console.log(`${c.green('PC')}\t${toHex(PC)}\t${c.green('SP')}\t${toHex(SP)}\t${c.green('IR')}\t${toHex(IR)}\t${c.green('FLAGS')}\t${flags}`)
}