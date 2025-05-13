import { expect } from "chai"
import { toDec, toBin, Bus } from '../src/circuitsimulator'
import { SAP1, CTL, buildMicrocode, microcodeTable } from '../src/sap1/sap-1'

describe('SAP-1 Computer', () => {
    it('NOP', () => {
        const s = new SAP1()
        const CLK = s.clock(1, false)
        const RESET = s.wire()
        const ram = new Uint8Array(256)

        // Initialize microcode and load program
        const microcode = buildMicrocode(microcodeTable)
        const computer = s.build(CLK, RESET, microcode, ram)
        const { DBUS, PC_DATA, STEP, CTRL } = computer

        // Optionally, load a program that consists solely of NOPs
        // For example, program code with opcode 0
        const program = new Uint8Array(16).fill(0) // 16 NOP instructions
        s.load(ram, program)

        // Advance the simulation a couple of times to properly initialize
        for(let i = 0; i < 2; i++) {
            s.do();
        }

        // Run the simulation for a few clock cycles
        for(let i = 0; i < 12; i +=1) {
            const step = toDec(STEP)
            const ctrl = toDec(CTRL)
            const pc = toDec(PC_DATA)
            console.log(`Step: ${step}, PC: ${pc}, Control: ${ctrl.toString(2).padStart(16, '0')}`)

            // Each instruction consists of 3 microcode steps:
            // - Steps 0-1: Fetch cycle (same for all instructions)
            // - Step 2: Execute cycle (instruction-specific)
            // After step 2, PC increments and the step counter resets to 0
            
            // Expected microcode step
            const expectedStep = i % 3;
            expect(step).to.equal(expectedStep);
            
            // Expected PC value
            // PC increments after each full instruction (3 microcode steps)
            const expectedPC = Math.floor(i / 3);
            
            // If we're at the last step of an instruction and have seen at least one full cycle,
            // the next instruction's PC will increment
            if (i > 2 && step === 0) {
                expect(pc).to.equal(expectedPC);
            } else if (i === 0) {
                // Initial state
                expect(pc).to.equal(0);
            }

            s.posedge(CLK)
        }
    })

    /* it('PC Basic', () => {
        const s = new SAP1()
        const CLK = s.clock(2, false)
        const RESET = s.wire()
        const DBUS = s.bus(8)

        const { out: PC_DATA, inc: PC_INC } = s.programCounter({ data: DBUS, clk: CLK, reset: RESET })
        const CTRL = new Bus([s.Low, s.Low, s.Low, s.Low, s.Low, s.Low, PC_INC, s.Low, s.Low, s.Low, s.Low, s.Low, s.Low, s.Low, s.Low, s.Low].reverse())
        const STEP = s.controlunit(s.bus(5), CLK, RESET, new Uint16Array(0x100), CTRL)

        for (let i = 0; i < 16 * 8; i += 1) {
            const step = toDec(STEP)

            if (step === 3) CTRL.set(CTL.PC_INC)
            else CTRL.set(0x0)
            console.log(`STEP: ${step} PC_INC: ${PC_INC.get()} CTRL: ${toBin(CTRL)}`)

            expect(toDec(STEP)).eq(i % 8)
            expect(toDec(DBUS)).eq(0)
            expect(toDec(PC_DATA)).eq(Math.floor(i / 8) + ((step > 3) ? 1 : 0))
            s.posedge(CLK)
        }
    })

    it('A <- [xx]', () => {
        const s = new SAP1()
        const bus = s.bus(8)
        const clk = s.clock(1, false)
        const reset = s.wire()
        const ram = new Uint8Array(256)
        const program = new Uint8Array([0x01, 0x03])
        
        const { out: A_DATA, we: A_IN } = s.busRegister({ bus, clk, reset })
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = s.busRegister({ bus, clk, reset })
        const { out: MAR_DATA, we: MAR_IN } = s.busRegister({ bus, clk, reset })
        const { out: RAM_DATA, we: RAM_IN, oe: RAM_OUT } = s.ram(MAR_DATA, clk, bus, ram)

        s.load(ram, program)
    })

    
    it('program counter', () => {
        const s = new SAP1()

        const clk = s.clock(3)
        const reset = s.wire()
        const BUS = s.bus(8)

        const { out: PC, inc: PC_INC, we: PC_IN, oe: PC_OUT } = s.programCounter({ data: BUS, clk, reset })

        PC_INC.on()
        s.do()
        expect(toDec(PC)).eq(0)
        expect(toDec(BUS)).eq(0)

        s.posedge(clk)
        expect(toDec(PC)).eq(1)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        expect(toDec(PC)).eq(5)
        expect(toDec(BUS)).eq(0)

        BUS.set(0xA0)
        s.posedge(clk)
        expect(toDec(PC)).eq(6)
        expect(toDec(BUS)).eq(0xA0)

        PC_IN.on()
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA0)
        expect(toDec(BUS)).eq(0xA0)

        PC_IN.off()
        PC_INC.off()
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA0)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA0)

        PC_INC.on()
        expect(toDec(PC)).eq(0xA0)
        expect(toDec(BUS)).eq(0xA0)
        s.posedge(clk)
        expect(toDec(BUS)).eq(0xA0)
        expect(toDec(PC)).eq(0xA1)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA5)
        expect(toDec(BUS)).eq(0xA0)
        
        PC_OUT.on()
        PC_INC.off()
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA6)
        expect(toDec(BUS)).eq(0xA6)
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA6)
        expect(toDec(BUS)).eq(0xA6)

        PC_OUT.off()
        reset.on()
        s.do()
        expect(toDec(PC)).eq(0)
        expect(toDec(BUS)).eq(0xA6)
    }) */
})