import { INSTR } from './sap-2';

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

// Simple instructions (no operands)
export const NOP = (): Op => ({ toString: () => `NOP`, code: [INSTR.NOP] })
export const HLT = (): Op => ({ toString: () => `HLT`, code: [INSTR.HLT] })
export const RET = (): Op => ({ toString: () => `RET`, code: [INSTR.RET] })

// Register-to-register moves
export const MOV_AB = (): Op => ({ toString: () => `MOV A,B`, code: [INSTR.MOV_A_B] })
export const MOV_AC = (): Op => ({ toString: () => `MOV A,C`, code: [INSTR.MOV_A_C] })
export const MOV_BA = (): Op => ({ toString: () => `MOV B,A`, code: [INSTR.MOV_B_A] })
export const MOV_BC = (): Op => ({ toString: () => `MOV B,C`, code: [INSTR.MOV_B_C] })
export const MOV_CA = (): Op => ({ toString: () => `MOV C,A`, code: [INSTR.MOV_C_A] })
export const MOV_CB = (): Op => ({ toString: () => `MOV C,B`, code: [INSTR.MOV_C_B] })

// Load immediate values
export const MVI_A = (val: number | string): Op => ({ toString: () => `MVI A,${val}`, code: [INSTR.MVI_A, val] })
export const MVI_B = (val: number | string): Op => ({ toString: () => `MVI B,${val}`, code: [INSTR.MVI_B, val] })
export const MVI_C = (val: number | string): Op => ({ toString: () => `MVI C,${val}`, code: [INSTR.MVI_C, val] })

// Memory operations
export const LDA = (addr: number | string): Op => ({ toString: () => `LDA ${addr}`, code: [INSTR.LDA, addr] })
export const STA = (addr: number | string): Op => ({ toString: () => `STA ${addr}`, code: [INSTR.STA, addr] })

// ALU operations
export const ADD_B = (): Op => ({ toString: () => `ADD B`, code: [INSTR.ADD_B] })
export const ADD_C = (): Op => ({ toString: () => `ADD C`, code: [INSTR.ADD_C] })
export const SUB_B = (): Op => ({ toString: () => `SUB B`, code: [INSTR.SUB_B] })
export const SUB_C = (): Op => ({ toString: () => `SUB C`, code: [INSTR.SUB_C] })
export const ANA_B = (): Op => ({ toString: () => `ANA B`, code: [INSTR.ANA_B] })
export const ANA_C = (): Op => ({ toString: () => `ANA C`, code: [INSTR.ANA_C] })
export const ORA_B = (): Op => ({ toString: () => `ORA B`, code: [INSTR.ORA_B] })
export const ORA_C = (): Op => ({ toString: () => `ORA C`, code: [INSTR.ORA_C] })
export const XRA_B = (): Op => ({ toString: () => `XRA B`, code: [INSTR.XRA_B] })
export const XRA_C = (): Op => ({ toString: () => `XRA C`, code: [INSTR.XRA_C] })

// Immediate ALU operations
export const ANI = (val: number | string): Op => ({ toString: () => `ANI ${val}`, code: [INSTR.ANI, val] })
export const ORI = (val: number | string): Op => ({ toString: () => `ORI ${val}`, code: [INSTR.ORI, val] })
export const XRI = (val: number | string): Op => ({ toString: () => `XRI ${val}`, code: [INSTR.XRI, val] })

// Register increment/decrement
export const INR_A = (): Op => ({ toString: () => `INR A`, code: [INSTR.INR_A] })
export const INR_B = (): Op => ({ toString: () => `INR B`, code: [INSTR.INR_B] })
export const INR_C = (): Op => ({ toString: () => `INR C`, code: [INSTR.INR_C] })
export const DCR_A = (): Op => ({ toString: () => `DCR A`, code: [INSTR.DCR_A] })
export const DCR_B = (): Op => ({ toString: () => `DCR B`, code: [INSTR.DCR_B] })
export const DCR_C = (): Op => ({ toString: () => `DCR C`, code: [INSTR.DCR_C] })

// Jump instructions
export const JMP = (addr: number | string): Op => ({ toString: () => `JMP ${addr}`, code: [INSTR.JMP, addr] })
export const JZ = (addr: number | string): Op => ({ toString: () => `JZ ${addr}`, code: [INSTR.JZ, addr] })
export const JNZ = (addr: number | string): Op => ({ toString: () => `JNZ ${addr}`, code: [INSTR.JNZ, addr] })

// Call instruction
export const CALL = (addr: number | string): Op => ({ toString: () => `CALL ${addr}`, code: [INSTR.CALL, addr] })

// I/O operations
export const IN = (port: number | string): Op => ({ toString: () => `IN ${port}`, code: [INSTR.IN, port] })
export const OUT = (port: number | string): Op => ({ toString: () => `OUT ${port}`, code: [INSTR.OUT, port] })

// Raw data
export const DATA = (byte: number): Op => ({ toString: () => `DAT ${byte}`, code: [byte] })
export const LABEL = (id: string): Label => ({ id })
export const DEF = (def: string, val: number): Definition => ({ def, val })

// Instruction mapping table for disassembly
const table = [
    { code: INSTR.NOP, length: 1, ctor: () => NOP() },
    { code: INSTR.HLT, length: 1, ctor: () => HLT() },
    { code: INSTR.RET, length: 1, ctor: () => RET() },
    
    { code: INSTR.MOV_A_B, length: 1, ctor: () => MOV_AB() },
    { code: INSTR.MOV_A_C, length: 1, ctor: () => MOV_AC() },
    { code: INSTR.MOV_B_A, length: 1, ctor: () => MOV_BA() },
    { code: INSTR.MOV_B_C, length: 1, ctor: () => MOV_BC() },
    { code: INSTR.MOV_C_A, length: 1, ctor: () => MOV_CA() },
    { code: INSTR.MOV_C_B, length: 1, ctor: () => MOV_CB() },
    
    { code: INSTR.MVI_A, length: 2, ctor: (bytes: Uint8Array) => MVI_A(bytes[0]) },
    { code: INSTR.MVI_B, length: 2, ctor: (bytes: Uint8Array) => MVI_B(bytes[0]) },
    { code: INSTR.MVI_C, length: 2, ctor: (bytes: Uint8Array) => MVI_C(bytes[0]) },
    
    { code: INSTR.LDA, length: 3, ctor: (bytes: Uint8Array) => LDA((bytes[1] << 8) | bytes[0]) },
    { code: INSTR.STA, length: 3, ctor: (bytes: Uint8Array) => STA((bytes[1] << 8) | bytes[0]) },
    
    { code: INSTR.ADD_B, length: 1, ctor: () => ADD_B() },
    { code: INSTR.ADD_C, length: 1, ctor: () => ADD_C() },
    { code: INSTR.SUB_B, length: 1, ctor: () => SUB_B() },
    { code: INSTR.SUB_C, length: 1, ctor: () => SUB_C() },
    { code: INSTR.ANA_B, length: 1, ctor: () => ANA_B() },
    { code: INSTR.ANA_C, length: 1, ctor: () => ANA_C() },
    { code: INSTR.ORA_B, length: 1, ctor: () => ORA_B() },
    { code: INSTR.ORA_C, length: 1, ctor: () => ORA_C() },
    { code: INSTR.XRA_B, length: 1, ctor: () => XRA_B() },
    { code: INSTR.XRA_C, length: 1, ctor: () => XRA_C() },
    
    { code: INSTR.ANI, length: 2, ctor: (bytes: Uint8Array) => ANI(bytes[0]) },
    { code: INSTR.ORI, length: 2, ctor: (bytes: Uint8Array) => ORI(bytes[0]) },
    { code: INSTR.XRI, length: 2, ctor: (bytes: Uint8Array) => XRI(bytes[0]) },
    
    { code: INSTR.INR_A, length: 1, ctor: () => INR_A() },
    { code: INSTR.INR_B, length: 1, ctor: () => INR_B() },
    { code: INSTR.INR_C, length: 1, ctor: () => INR_C() },
    { code: INSTR.DCR_A, length: 1, ctor: () => DCR_A() },
    { code: INSTR.DCR_B, length: 1, ctor: () => DCR_B() },
    { code: INSTR.DCR_C, length: 1, ctor: () => DCR_C() },
    
    { code: INSTR.JMP, length: 3, ctor: (bytes: Uint8Array) => JMP((bytes[1] << 8) | bytes[0]) },
    { code: INSTR.JZ, length: 3, ctor: (bytes: Uint8Array) => JZ((bytes[1] << 8) | bytes[0]) },
    { code: INSTR.JNZ, length: 3, ctor: (bytes: Uint8Array) => JNZ((bytes[1] << 8) | bytes[0]) },
    
    { code: INSTR.CALL, length: 3, ctor: (bytes: Uint8Array) => CALL((bytes[1] << 8) | bytes[0]) },
    
    { code: INSTR.IN, length: 2, ctor: (bytes: Uint8Array) => IN(bytes[0]) },
    { code: INSTR.OUT, length: 2, ctor: (bytes: Uint8Array) => OUT(bytes[0]) },
]

export function asm(...ops: Program): Uint8Array {
    const labels = new Map<string, number>()
    const bytestream = new Array<number>()
    let address = 0
    
    // First pass: collect label addresses
    for(const op of ops) {
        if ('id' in op) {
            labels.set(op.id, address)
        }
        else if ('def' in op) {
            labels.set(op.def, op.val)
        }
        else {
            address += op.code.length
        }
    }
    
    // Second pass: resolve symbols and generate code
    for(const op of ops) {
        if (!('id' in op) && !('def' in op)) {
            const bytes = op.code.map(i => {
                if (typeof i === 'string') {
                    const labelValue = labels.get(i);
                    if (labelValue === undefined) {
                        throw new Error(`Undefined label: ${i}`);
                    }
                    return labelValue;
                }
                return i;
            });
            bytestream.push(...bytes);
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

// Macros and helper functions
export const REPEAT = (...ops: Program): Program => {
    const llabel = `_loop_${Math.random() * 0xffffffff | 0}`
    ops.unshift(LABEL(llabel))
    ops.push(JMP(llabel))
    return ops
}

export const IF_ZERO = (body: Program, elseBody: Program = []): Program => {
    const elseLabel = `_else_${Math.random() * 0xffffffff | 0}`
    const endLabel = `_endif_${Math.random() * 0xffffffff | 0}`
    
    if (elseBody.length > 0) {
        return [
            JNZ(elseLabel),
            ...body,
            JMP(endLabel),
            LABEL(elseLabel),
            ...elseBody,
            LABEL(endLabel)
        ]
    } else {
        return [
            JNZ(endLabel),
            ...body,
            LABEL(endLabel)
        ]
    }
}

export const IF_NOT_ZERO = (body: Program, elseBody: Program = []): Program => {
    const elseLabel = `_else_${Math.random() * 0xffffffff | 0}`
    const endLabel = `_endif_${Math.random() * 0xffffffff | 0}`
    
    if (elseBody.length > 0) {
        return [
            JZ(elseLabel),
            ...body,
            JMP(endLabel),
            LABEL(elseLabel),
            ...elseBody,
            LABEL(endLabel)
        ]
    } else {
        return [
            JZ(endLabel),
            ...body,
            LABEL(endLabel)
        ]
    }
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