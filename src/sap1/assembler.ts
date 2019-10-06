export interface Op {
    toString: () => string
    code: (number | string)[]
}

export interface Label {
    id: string
}

export interface Definition {
    def: string
    val: number
}

type Program = (Op | Label | Definition)[]

export const LDA = (imm: number | string): Op => ({ toString: () => `LDA #${imm}`, code: [0b00001, imm] })
export const STA = (addr: number): Op => ({ toString: () => `STA #${addr}`, code: [0b01000, addr] })
export const LDB = (imm: number | string): Op => ({ toString: () => `LDB #${imm}`, code: [0b00010, imm] })
export const ADD = (): Op => ({ toString: () => `ADD`, code: [0b10000] })
export const JMP = (addr: number | string): Op => ({ toString: () => `JMP ${addr}`, code: [0b11111, addr] })
export const DATA = (byte: number): Op => ({ toString: () => `DAT ${byte}`, code: [byte] })
export const LABEL = (id: string): Label => ({ id })
export const DEF = (def: string, val: number): Definition => ({ def, val })

const table = [
    { code: 0b00001, length: 2, ctor: (bytes: Uint8Array) => LDA(bytes[0]) },
    { code: 0b01000, length: 2, ctor: (bytes: Uint8Array) => STA(bytes[0]) },
    { code: 0b00010, length: 2, ctor: (bytes: Uint8Array) => LDB(bytes[0]) },
    { code: 0b10000, length: 1, ctor: ()                  => ADD() },
    { code: 0b11111, length: 2, ctor: (bytes: Uint8Array) => JMP(bytes[0]) },
]

export function asm(...ops: Program): Uint8Array {
    const labels = new Map<string, number>()
    const bytestream = new Array<number>()
    let address = 0
    for(const op of ops) {
        if ('id' in op) labels.set(op.id, address)
        else if ('def' in op) labels.set(op.def, op.val)
        else {
            const bytes = op.code.map(i => (typeof i === 'string') ? labels.get(i) || 0 : i)
            bytestream.push(...bytes)
            address += bytes.length
        }
    }

    return new Uint8Array(bytestream)
}

export function unasm(bytes: Uint8Array): Op[] {
    let index = 0
    const ops = Array<Op>()

    while (index < bytes.length) {
        const op = table.find(op => op.code === bytes[index])
        if (op !== undefined) {
            ops.push(op.ctor(bytes.slice(index + 1, index + op.length)))
            index += op.length
        } else { 
            ops.push(DATA(bytes[index]))
            index += 1
        }
    }

    return ops
}

// Macros

export const REPEAT = (...ops: Program): Program => {
    const llabel = `_loop_${Math.random() * 0xffffffff | 0}`
    ops.unshift(LABEL(llabel))
    ops.push(JMP(llabel))
    return ops
}

/*
const program = asm(
    LDA(0x02),
    LDB(0x04),
    ...REPEAT(
        ADD(),
        STA(0x1C)
    )
)

const toHex = (...xs: (number | string)[]) => xs.map(x => `${x.toString(16).toUpperCase().padStart(2, '0')}`) 
unasm(new Uint8Array([32, 0])).map(op => `${toHex(...op.code).join(' ').padEnd(7)} ${op}`)[0] //?

*/