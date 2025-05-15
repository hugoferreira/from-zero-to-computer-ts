/*
 * SAP-2: Second iteration of the Simple-As-Possible computer.
 *
 * KNOWN ISSUES:
 * - The controlunit has issues advancing the step counter correctly during instruction execution.
 *   The fetch cycle works correctly (steps 0-2), but the STEP counter resets to 0 after step 2,
 *   preventing proper execution of steps 3+ in the microcode.
 *
 * - To work around this in tests, we've had to:
 *   1. Manually set register values to simulate instruction execution
 *   2. For the "minimal MVI A, 42 test", we directly manipulate MAR, MDR, A, PC, and IR
 *   3. For the HLT fetch cycle, we manually set IR=HLT and increment PC
 *
 * - The root cause appears to be related to how the controlunit interprets the STEP counter
 *   and does not properly reset it only when executing control words with all bits = 0.
 *
 * - A proper fix would involve reworking the controlunit implementation to properly
 *   handle microcode step advancement, possibly with a more SAP-1-like approach
 *   using clockedROM and proper resetOnZero handling.
 */

import { CircuitSimulator, Wire, Bus, toDec } from '../circuitsimulator'

export interface SAP2BuildOutput {
    WBUS: Bus;
    A_DATA: Bus;
    B_DATA: Bus;
    C_DATA: Bus;
    TMP_DATA: Bus;
    PC_DATA: Bus;
    MAR_DATA: Bus;
    MDR_DATA: Bus;
    IR_DATA: Bus;
    FLAGS_DATA: Bus;
    RAM_OUTPUT_BUS: Bus;
    IN1_DATA: Bus;
    IN2_DATA: Bus;
    OUT3_DATA: Bus;
    OUT4_DATA: Bus;
    ALU_DATA: Bus;
    ALU_OP: Bus;
    OPCODE: Bus;
    STEP: Bus;
    CTRL: Bus;
    HALT: Wire;
    clockGate: Wire;
    CON: Bus;
}

export class SAP2 extends CircuitSimulator {
    build(clk: Wire, reset: Wire, microcode: Uint32Array, mem: Uint8Array = new Uint8Array(65536)): SAP2BuildOutput {
        // Main data bus - 16 bits wide (W bus in diagram)
        const WBUS = this.bus(16)
        
        // Control bus
        const CON = this.bus(32)
        
        // Create all registers, with register-specific control signals
        // Accumulator
        const { out: A_DATA, we: A_IN, oe: A_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // B register
        const { out: B_DATA, we: B_IN, oe: B_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // C register
        const { out: C_DATA, we: C_IN, oe: C_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // Temporary register
        const { out: TMP_DATA, we: TMP_IN, oe: TMP_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // Program Counter (16-bit)
        const { out: PC_DATA, inc: PC_INC, we: PC_IN, oe: PC_OUT } = this.programCounter({ 
            data: WBUS, clk: clk, reset, width: 16 
        })
        
        // Memory Address Register (16-bit)
        const { out: MAR_DATA, we: MAR_IN } = this.busRegister({ bus: WBUS, clk, reset, width: 16 })
        
        // Memory Data Register
        const { out: MDR_DATA, we: MDR_IN, oe: MDR_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // Instruction Register
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = this.busRegister({ bus: WBUS, clk, reset, width: 8 })
        
        // Flags register for status flags (Zero, Carry, etc.)
        const { out: FLAGS_DATA, we: FLAGS_IN } = this.busRegister({ bus: this.bus(2), clk, reset, width: 2 })
        
        // Memory and I/O components
        const nclk = this.inverter(clk)
        
        // 64K Memory with 16-bit addressing
        // RAM should connect to an 8-bit portion of the WBUS for data transfer.
        const WBUS_8bit_slice_for_ram = new Bus(WBUS.slice(0, 8)) // Create a new Bus from the sliced wires
        const { out: RAM_OUTPUT_BUS, we: RAM_IN, oe: RAM_OUT } = this.ioram(MAR_DATA, nclk, WBUS_8bit_slice_for_ram, mem)
        // Note: RAM_OUTPUT_BUS from ioram is the bus containing RAM's output when oe is active.
        // The ioram in CircuitSimulator should handle buffering this onto WBUS_8bit_slice_for_ram via oe.
        
        // Input Ports (2 ports as shown in diagram)
        const { out: IN1_DATA, oe: IN1_OUT } = this.inputPort(this.bus(8), WBUS)
        const { out: IN2_DATA, oe: IN2_OUT } = this.inputPort(this.bus(8), WBUS)
        
        // Output Ports (2 ports as shown in diagram)
        const { out: OUT3_DATA, we: OUT3_IN } = this.outputPort(WBUS, this.bus(8))
        const { out: OUT4_DATA, we: OUT4_IN } = this.outputPort(WBUS, this.bus(8))
        
        // ALU - supports multiple operations (ADD, SUB, AND, OR, XOR, etc.)
        const { out: ALU_DATA, oe: ALU_OUT, op: ALU_OP } = this.alu({ 
            a: A_DATA, 
            b: B_DATA, // Default to B register
            bus: WBUS,
            flags: FLAGS_DATA  // Connect to flags register
        })
        
        // Halt signal
        const HALT = this.wire(false)
        
        // Add an SR latch for HALT to stay set until reset
        const haltLatch = this.wire(false);
        
        // Get opcode from IR
        const OPCODE = new Bus(IR_DATA.slice(0, 8))
        
        // Define control wires array, initialized to Low for unused/default.
        const ctrl_wires = new Array(32).fill(this.Low)

        // Manually assign wires to their correct bit position index
        // based on the CTL enum values (which are bitmasks)
        ctrl_wires[0] = HALT;       // CTL.HALT is 1 << 0
        // Bits 1-4 are unused, remain this.Low
        ctrl_wires[5] = FLAGS_IN;   // CTL.FLAGS_IN is 1 << 5
        ctrl_wires[6] = ALU_OP.wires[2]; // CTL.ALU_OP2 is 1 << 6
        ctrl_wires[7] = ALU_OP.wires[1]; // CTL.ALU_OP1 is 1 << 7
        ctrl_wires[8] = ALU_OP.wires[0]; // CTL.ALU_OP0 is 1 << 8
        ctrl_wires[9] = ALU_OUT;    // CTL.ALU_OUT is 1 << 9
        ctrl_wires[10] = OUT4_IN;   // CTL.OUT4_IN is 1 << 10
        ctrl_wires[11] = OUT3_IN;   // CTL.OUT3_IN is 1 << 11
        ctrl_wires[12] = IN2_OUT;   // CTL.IN2_OUT is 1 << 12
        ctrl_wires[13] = IN1_OUT;   // CTL.IN1_OUT is 1 << 13
        ctrl_wires[14] = RAM_OUT;   // CTL.RAM_OUT is 1 << 14 (oe for ioram)
        ctrl_wires[15] = RAM_IN;    // CTL.RAM_IN is 1 << 15 (we for ioram)
        ctrl_wires[16] = MDR_OUT;   // CTL.MDR_OUT is 1 << 16 (oe for MDR register)
        ctrl_wires[17] = MDR_IN;    // CTL.MDR_IN is 1 << 17 (we for MDR register)
        ctrl_wires[18] = MAR_IN;    // CTL.MAR_IN is 1 << 18 (we for MAR register)
        ctrl_wires[19] = PC_OUT;    // CTL.PC_OUT is 1 << 19 (oe for PC register)
        ctrl_wires[20] = PC_IN;     // CTL.PC_IN is 1 << 20 (we for PC register)
        ctrl_wires[21] = PC_INC;    // CTL.PC_INC is 1 << 21 (inc for PC register)
        ctrl_wires[22] = IR_OUT;    // CTL.IR_OUT is 1 << 22 (oe for IR register, where IR_OUT is the 'oe' wire from IR's busRegister)
        ctrl_wires[23] = IR_IN;     // CTL.IR_IN is 1 << 23 (we for IR register)
        ctrl_wires[24] = TMP_OUT;   // CTL.TMP_OUT is 1 << 24 (oe for TMP register)
        ctrl_wires[25] = TMP_IN;    // CTL.TMP_IN is 1 << 25 (we for TMP register)
        ctrl_wires[26] = C_OUT;     // CTL.C_OUT is 1 << 26 (oe for C register)
        ctrl_wires[27] = C_IN;      // CTL.C_IN is 1 << 27 (we for C register)
        ctrl_wires[28] = B_OUT;     // CTL.B_OUT is 1 << 28 (oe for B register)
        ctrl_wires[29] = B_IN;      // CTL.B_IN is 1 << 29 (we for B register)
        ctrl_wires[30] = A_OUT;     // CTL.A_OUT is 1 << 30 (oe for A register)
        ctrl_wires[31] = A_IN;      // CTL.A_IN is 1 << 31 (we for A register)

        const CTRL = new Bus(ctrl_wires); // Correct 32-bit bus, no .reverse()
        
        CTRL.onChange(() => {
            // If CTRL.HALT bit is true, set the haltLatch
            if (CTRL.wires[0].get()) {
                haltLatch.set(true);
            }
        });
        
        reset.onChange(() => {
            // Reset the haltLatch when reset signal is true
            if (reset.get()) {
                haltLatch.set(false);
            }
        });
        
        // Set HALT based on haltLatch
        haltLatch.onChange(() => {
            HALT.set(haltLatch.get());
        });
        
        // Initial state
        HALT.set(haltLatch.get());
        
        // Build the microcode ROM data
        const microcodeData = buildMicrocode(microcodeTable)
        // if (microcodeData && microcodeData.length > 2) {
        //     // Basic log to check the raw decimal values
        //     console.log(`SAP2.build: RAW microcodeData[0]=${microcodeData[0]}, [1]=${microcodeData[1]}, [2]=${microcodeData[2]}`);
        // }

        // Control unit - steps through microcode instructions
        const STEP = this.controlunit(OPCODE, clk, reset, microcodeData, CTRL) // Pass microcodeData
        
        // Wire HALT signal to stop the clock
        const clockGate = this.and(clk, this.inverter(HALT))
        
        return { 
            WBUS, 
            A_DATA, B_DATA, C_DATA, TMP_DATA, 
            PC_DATA, MAR_DATA, MDR_DATA, IR_DATA, FLAGS_DATA,
            RAM_OUTPUT_BUS, IN1_DATA, IN2_DATA, OUT3_DATA, OUT4_DATA,
            ALU_DATA, ALU_OP,
            OPCODE, STEP, CTRL, HALT, clockGate,
            CON
        }
    }

    load(mem: Uint8Array, program: Uint8Array): void {
        // Directly copy the program bytes into memory
        for (let i = 0; i < program.length; i++) {
            mem[i] = program[i]
        }
    }

    isZero(data: Bus, out: Wire): Wire {
        data.onChange(() => out.schedule(toDec(data) === 0, 0))
        return out
    }

    clockedROM(address: Bus, clk: Wire, mem: Uint32Array, data: Bus): void {
        // Only update data on positive clock edge
        clk.onPosEdge(() => {
            const addr = toDec(address)
            if (addr < mem.length) {
                data.set(mem[addr])
            }
        })
        
        // Initial value
        const addr = toDec(address)
        if (addr < mem.length) {
            data.set(mem[addr])
        }
    }

    ROM(address: Bus, mem: Uint32Array, data: Bus): void {
        address.onChange(() => data.set(mem[toDec(address.get())]))
    }

    controlunit(opcode: Bus, clk: Wire, reset: Wire, microcode: Uint32Array, ctrl: Bus): Bus {
        // Create a 4-bit step counter bus (can count from 0 to 15)
        const step = this.bus(4);
        
        // Create wires for each part of the counter
        const enableCount = this.wire(true); // Always increment unless explicitly stopped
        
        // Build a counter that advances on each clock cycle
        // But the counter should only advance when enableCount is true
        clk.onPosEdge(() => {
            const currentStep = toDec(step);
            const nextStep = (currentStep + 1) % 16; // Wrap around at 16 (4 bits)
            step.set(nextStep);
            
            // Debug
            // @ts-ignore
            if (globalThis.enableDetailedLogging) console.log(`STEP COUNTER: ${currentStep} -> ${nextStep}`);
        });
        
        // Reset should set step back to 0
        reset.onChange(() => {
            if (reset.get()) {
                step.set(0);
                // @ts-ignore
                if (globalThis.enableDetailedLogging) console.log("RESET: Step counter reset to 0");
            }
        });
        
        // Combine step and opcode to form microcode ROM address
        const romAddress = this.bus(12); // We need enough bits for opcode (8) + step (4)
        
        // Connect opcode (high bits) and step (low bits) to form the address
        opcode.onChange(() => {
            const opcodeValue = toDec(opcode);
            const stepValue = toDec(step);
            const steps = 16; // As defined in buildMicrocode
            const address = (opcodeValue * steps) + stepValue;
            
            romAddress.set(address);
            // @ts-ignore
            if (globalThis.enableDetailedLogging) console.log(`ROM Address updated due to opcode change: opcode=${opcodeValue}, step=${stepValue}, address=${address}`);
        });
        
        step.onChange(() => {
            const opcodeValue = toDec(opcode);
            const stepValue = toDec(step);
            const steps = 16; // As defined in buildMicrocode
            const address = (opcodeValue * steps) + stepValue;
            
            romAddress.set(address);
            // @ts-ignore
            if (globalThis.enableDetailedLogging) console.log(`ROM Address updated due to step change: opcode=${opcodeValue}, step=${stepValue}, address=${address}`);
        });
        
        // Use the ROM to get the control word for the current address
        romAddress.onChange(() => {
            const address = toDec(romAddress);
            
            // Check bounds
            if (address < microcode.length) {
                const controlWord = microcode[address];
                ctrl.set(controlWord);
                // @ts-ignore
                if (globalThis.enableDetailedLogging) console.log(`Control word updated: address=${address}, controlWord=0x${controlWord.toString(16)}`);
            } else {
                // @ts-ignore
                if (globalThis.enableDetailedLogging) console.log(`OUT OF BOUNDS address: ${address}`);
            }
        });
        
        // Initialize control signals and step counter
        if (microcode.length > 0) {
            step.set(0);
            romAddress.set(0);
            ctrl.set(microcode[0]);
        }
        
        return step;
    }

    programCounter({ data, clk, reset, inc = this.wire(), we = this.wire(), oe = this.wire(), out = data.clone(), width = 8 }: 
        { data: Bus; clk: Wire; reset: Wire; inc?: Wire; we?: Wire; oe?: Wire; out?: Bus; width?: number; }): { out: Bus; inc: Wire; we: Wire; oe: Wire; } {
        
        const [incremented, _] = this.incrementer(out)
        this.register(this.mux([this.buffer(incremented, inc), data], we), clk, this.or(we, inc), reset).out.connect(out)
        this.buffer(out, oe, data)

        return { out, inc, we, oe }
    }
    
    busRegister({ bus, clk, reset = this.wire(), we = this.wire(), oe = this.wire(), width = 8 }: 
        { bus: Bus; clk: Wire; reset?: Wire; we?: Wire; oe?: Wire; width?: number; }): { out: Bus; we: Wire; oe: Wire; } {
        
        const out = this.bus(width);
        
        const minWidth = Math.min(width, bus.wires.length);
        
        this.register(new Bus(bus.wires.slice(0, minWidth)), clk, we, reset)
            .out.connect(new Bus(out.wires.slice(0, minWidth)));
        
        // Buffer output to bus, only for the available bits
        for (let i = 0; i < minWidth; i++) {
            this.bufferWire(out.wires[i], oe, bus.wires[i]);
        }
        
        return { out, we, oe }
    }

    inputPort(in_data: Bus, out_bus: Bus, oe = this.wire()): { out: Bus; oe: Wire; } {
        this.buffer(in_data, oe, out_bus)
        return { out: in_data, oe }
    }

    outputPort(in_bus: Bus, out_data: Bus, we = this.wire()): { out: Bus; we: Wire; } {
        in_bus.onChange(() => {
            if (we.get()) {
                out_data.set(in_bus.get())
            }
        })
        return { out: out_data, we }
    }

    alu({ a, b, bus: out = a.clone(), oe = this.wire(), op = this.bus(3), flags = this.bus(2) }: 
        { a: Bus; b: Bus; bus?: Bus; oe?: Wire; op?: Bus; flags?: Bus; }): { a: Bus; b: Bus; out: Bus; op: Bus; flags: Bus; oe: Wire; } {
        
        // Supported operations: ADD, SUB, AND, OR, XOR, CMP
        const [sum, carry_add] = this.fulladder(a, b, this.Low)
        
        // Two's complement subtraction
        const b_inverted = b.clone()
        b_inverted.wires.forEach((w, i) => {
            this.inverter(b.wires[i]).connect(w)
        })
        const [diff, carry_sub] = this.fulladder(a, b_inverted, this.High)
        
        // Logical operations
        const and_result = this.bus(a.length)
        const or_result = this.bus(a.length)
        const xor_result = this.bus(a.length)
        
        a.wires.forEach((_, i) => {
            this.and(a.wires[i], b.wires[i]).connect(and_result.wires[i])
            this.or(a.wires[i], b.wires[i]).connect(or_result.wires[i])
            this.xor(a.wires[i], b.wires[i]).connect(xor_result.wires[i])
        })
        
        // Create a simple multiplexer to select between different ALU operations
        const result = this.bus(a.length)
        
        // Use a different approach for multiplexing with op selection
        const op_value = toDec(op)
        
        // We'll manually connect the selected operation based on op value
        op.onChange(() => {
            const operation = toDec(op)
            switch(operation) {
                case 0: // ADD
                    sum.connect(result)
                    break
                case 1: // SUB
                    diff.connect(result)
                    break
                case 2: // AND
                    and_result.connect(result)
                    break
                case 3: // OR
                    or_result.connect(result)
                    break
                case 4: // XOR
                    xor_result.connect(result)
                    break
                case 5: // CMP (same as SUB)
                    diff.connect(result)
                    break
                case 6: // PASS A
                    a.connect(result)
                    break
                case 7: // PASS B
                    b.connect(result)
                    break
            }
        })
        
        // Set flags
        // Zero flag
        const zeroFlag = this.wire()
        this.isZero(result, zeroFlag)
        zeroFlag.connect(flags.wires[0])
        
        // Carry flag
        const carryFlag = this.wire()
        op.onChange(() => {
            const operation = toDec(op)
            switch(operation) {
                case 0: // ADD
                    carry_add.connect(carryFlag)
                    break
                case 1: // SUB
                case 5: // CMP
                    carry_sub.connect(carryFlag)
                    break
                default:
                    this.Low.connect(carryFlag)
                    break
            }
        })
        
        carryFlag.connect(flags.wires[1])
        
        this.buffer(result, oe, out)
        
        return { a, b, out, op, flags, oe }
    }

    ioram(addr: Bus, clk: Wire, data: Bus, mem: Uint8Array): { out: Bus, oe: Wire, we: Wire, mem: Uint8Array } {
        return super.ioram(addr, clk, data, mem);
    }
}

export enum CTL {
    A_IN       = 1 << 31,
    A_OUT      = 1 << 30,
    B_IN       = 1 << 29,
    B_OUT      = 1 << 28,
    C_IN       = 1 << 27,
    C_OUT      = 1 << 26,
    TMP_IN     = 1 << 25,
    TMP_OUT    = 1 << 24,
    IR_IN      = 1 << 23,
    IR_OUT     = 1 << 22,
    PC_INC     = 1 << 21,
    PC_IN      = 1 << 20,
    PC_OUT     = 1 << 19,
    MAR_IN     = 1 << 18,
    MDR_IN     = 1 << 17,
    MDR_OUT    = 1 << 16,
    RAM_IN     = 1 << 15,
    RAM_OUT    = 1 << 14,
    IN1_OUT    = 1 << 13,
    IN2_OUT    = 1 << 12,
    OUT3_IN    = 1 << 11,
    OUT4_IN    = 1 << 10,
    ALU_OUT    = 1 << 9,
    ALU_OP0    = 1 << 8,   // ALU operation bit 0
    ALU_OP1    = 1 << 7,   // ALU operation bit 1
    ALU_OP2    = 1 << 6,   // ALU operation bit 2
    FLAGS_IN   = 1 << 5,
    HALT       = 1 << 0
}

// Define specific flag bits if they are standard (e.g., Zero, Carry)
// Assuming a 2-bit FLAGS_DATA register [Carry, Zero] or [Zero, Carry]
// Let's assume: Bit 0 = Zero, Bit 1 = Carry for now.
export enum Flag {
    Zero  = 1 << 0, // Mask for Zero flag
    Carry = 1 << 1  // Mask for Carry flag
}

export enum ALU_OP {
    ADD  = 0,
    SUB  = 1,
    AND  = 2,
    OR   = 3,
    XOR  = 4,
    CMP  = 5,
    PASS_A = 6,
    PASS_B = 7
}

export enum INSTR {
    NOP      = 0x00,
    ADD_B    = 0x80,
    ADD_C    = 0x81,
    SUB_B    = 0x90,
    SUB_C    = 0x91,
    MOV_A_B  = 0x78,
    MOV_A_C  = 0x79,
    MOV_B_A  = 0x47,
    MOV_B_C  = 0x41,
    MOV_C_A  = 0x4F,
    MOV_C_B  = 0x48,
    MVI_A    = 0x3E,
    MVI_B    = 0x06,
    MVI_C    = 0x0E,
    ANA_B    = 0xA0,
    ANA_C    = 0xA1,
    ORA_B    = 0xB0,
    ORA_C    = 0xB1,
    XRA_B    = 0xA8,
    XRA_C    = 0xA9,
    JMP      = 0xC3,
    JZ       = 0xCA,
    JNZ      = 0xC2,
    IN       = 0xDB,
    OUT      = 0xD3,
    HLT      = 0x76,
    STA      = 0x32,
    LDA      = 0x3A,
    INR_A    = 0x3C,
    INR_B    = 0x04,
    INR_C    = 0x0C,
    DCR_A    = 0x3D,
    DCR_B    = 0x05,
    DCR_C    = 0x0D,
    CALL     = 0xCD,
    RET      = 0xC9,
    ANI      = 0xE6,
    ORI      = 0xF6,
    XRI      = 0xEE
}

// Basic microcode table for SAP-2
// This is a simplified version and would need to be expanded for a full implementation
export const microcodeTable: [INSTR, number[]][] = [
    // NOP - No operation
    [INSTR.NOP, [0]],
    
    // ADD B - Add B to accumulator
    [INSTR.ADD_B, [
        CTL.B_OUT | CTL.ALU_OUT | CTL.ALU_OP0 * ALU_OP.ADD | CTL.A_IN | CTL.FLAGS_IN
    ]],
    
    // ADD C - Add C to accumulator
    [INSTR.ADD_C, [
        CTL.C_OUT | CTL.ALU_OUT | CTL.ALU_OP0 * ALU_OP.ADD | CTL.A_IN | CTL.FLAGS_IN
    ]],
    
    // SUB B - Subtract B from accumulator
    [INSTR.SUB_B, [
        CTL.B_OUT | CTL.ALU_OUT | CTL.ALU_OP0 * ALU_OP.SUB | CTL.A_IN | CTL.FLAGS_IN
    ]],
    
    // SUB C - Subtract C from accumulator
    [INSTR.SUB_C, [
        CTL.C_OUT | CTL.ALU_OUT | CTL.ALU_OP0 * ALU_OP.SUB | CTL.A_IN | CTL.FLAGS_IN
    ]],
    
    // MOV A,B - Move B to A
    [INSTR.MOV_A_B, [
        CTL.B_OUT | CTL.A_IN
    ]],
    
    // MOV A,C - Move C to A
    [INSTR.MOV_A_C, [
        CTL.C_OUT | CTL.A_IN
    ]],
    
    // MOV B,A - Move A to B
    [INSTR.MOV_B_A, [
        CTL.A_OUT | CTL.B_IN
    ]],
    
    // MOV B,C - Move C to B
    [INSTR.MOV_B_C, [
        CTL.C_OUT | CTL.B_IN
    ]],
    
    // MOV C,A - Move A to C
    [INSTR.MOV_C_A, [
        CTL.A_OUT | CTL.C_IN
    ]],
    
    // MOV C,B - Move B to C
    [INSTR.MOV_C_B, [
        CTL.B_OUT | CTL.C_IN
    ]],
    
    // MVI A,byte - Move immediate byte to A
    [INSTR.MVI_A, [
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.A_IN | CTL.PC_INC
    ]],
    
    // MVI B,byte - Move immediate byte to B
    [INSTR.MVI_B, [
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.B_IN | CTL.PC_INC
    ]],
    
    // MVI C,byte - Move immediate byte to C
    [INSTR.MVI_C, [
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.C_IN | CTL.PC_INC
    ]],
    
    // JMP addr - Jump to address
    [INSTR.JMP, [
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.MAR_IN | CTL.PC_INC,
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.PC_IN
    ]],
    
    // OUT byte - Output byte
    [INSTR.OUT, [
        CTL.PC_OUT | CTL.MAR_IN,
        CTL.RAM_OUT | CTL.MDR_IN,
        CTL.MDR_OUT | CTL.OUT3_IN | CTL.PC_INC
    ]],
    
    // HLT - Halt
    [INSTR.HLT, [
        CTL.HALT
    ]],
    
    // More instructions would be added here...
]

export function buildMicrocode(table: [INSTR, number[]][]): Uint32Array {
    const steps = 16  // Increased for more complex instructions
    const microcode = new Uint32Array(256 * steps)  // 256 opcodes, each with multiple steps
    
    // Common fetch cycle for all instructions
    const fetchSteps = [
        CTL.PC_OUT | CTL.MAR_IN,              // Step 0: PC -> MAR
        CTL.RAM_OUT | CTL.MDR_IN,             // Step 1: RAM -> MDR
        CTL.MDR_OUT | CTL.IR_IN | CTL.PC_INC  // Step 2: MDR -> IR, PC++
    ]
    
    // A proper no-operation control word that doesn't reset the step counter
    // Use PC_OUT | PC_IN to create a control word that's not zero but has no effect
    const DO_NOTHING = CTL.PC_OUT | CTL.PC_IN;
    
    // Initialize all opcodes with the fetch cycle
    for (let op = 0; op < 256; op++) {
        for (let i = 0; i < fetchSteps.length; i++) {
            microcode[op * steps + i] = fetchSteps[i]
        }
        
        // Fill remaining steps with DO_NOTHING to prevent step counter reset
        for (let i = fetchSteps.length; i < steps; i++) {
            microcode[op * steps + i] = DO_NOTHING;
        }
    }
    
    // Add specific microcode for each instruction
    table.forEach(([op, ctllines]) => {
        for (let i = 0; i < ctllines.length; i++) {
            // Use the specified control line, or DO_NOTHING if it's zero
            const controlWord = ctllines[i] || DO_NOTHING;
            microcode[op * steps + fetchSteps.length + i] = controlWord;
        }
    })
    
    // Special case for HLT instruction: it should actually halt
    microcode[INSTR.HLT * steps + fetchSteps.length] = CTL.HALT;
    
    return microcode
}