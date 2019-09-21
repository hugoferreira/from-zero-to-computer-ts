export interface Op {
    toString: () => string
    code: Uint8Array
}

export const LDA = (imm: number): Op => ({ toString: () => `LDA #${imm}`, code: new Uint8Array([0b00001, imm]) })
export const STA = (addr: number): Op => ({ toString: () => `STA #${addr}`, code: new Uint8Array([0b01000, addr]) })
export const LDB = (imm: number): Op => ({ toString: () => `LDB #${imm}`, code: new Uint8Array([0b00010, imm]) })
export const ADD = (): Op => ({ toString: () => `ADD`, code: new Uint8Array([0b10000]) })
export const JMP = (addr: number): Op => ({ toString: () => `JMP $${addr}`, code: new Uint8Array([0b11111, addr]) })
export const DATA = (byte: number): Op => ({ toString: () => `???`, code: new Uint8Array([byte]) })

const table = [
    { code: 0b00001, length: 2, ctor: (bytes: Uint8Array) => LDA(bytes[0]) },
    { code: 0b01000, length: 2, ctor: (bytes: Uint8Array) => STA(bytes[0]) },
    { code: 0b00010, length: 2, ctor: (bytes: Uint8Array) => LDB(bytes[0]) },
    { code: 0b10000, length: 1, ctor: ()                  => ADD() },
    { code: 0b11111, length: 2, ctor: (bytes: Uint8Array) => JMP(bytes[0]) },
]

export function asm(...ops: Op[]): Uint8Array {
    return new Uint8Array(ops.map(op => Array.from(op.code)).flat())
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
