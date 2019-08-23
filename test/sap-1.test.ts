import { expect } from "chai"
import { Wire, toDec, toBin, Low, Bus, toHex } from '../src/circuitsimulator'
import { SAP1, CTL } from '../src/sap-1'

describe('SAP-1 Computer', () => {
    it('NOP', () => {
        const s = new SAP1()
        const CLK = s.clock(1, false)
        const RESET = new Wire
        const ram = Array<number>(256).fill(0)

        const computer = s.build(CLK, RESET, Array(0x100).fill(0), ram)
        const {
            DBUS,
            PC_DATA,    // Program Counter
            STEP,       // Microcode Step
            CTRL        // Control Lines
        } = computer

        for(let i = 0; i < 16*8; i+=1) {
            const step = toDec(STEP)
            console.log(`Executing ${step}`)
            
            if (step === 1) CTRL.setSignal(CTL.PC_INC)
            else CTRL.setSignal(0x0)

            console.log(`Executing ${toBin(CTRL)}`)
            
            expect(toDec(STEP)).eq(i % 8)
            expect(toDec(DBUS)).eq(0)
            expect(toDec(PC_DATA)).eq(Math.floor(i / 8) + ((step > 1) ? 1 : 0))
            s.posedge(CLK)
        }
    })

    it('PC Basic', () => {
        const s = new SAP1()
        const CLK = s.clock(2, false)
        const RESET = new Wire
        const DBUS = s.bus(8)

        const { out: PC_DATA, inc: PC_INC } = s.programCounter({ data: DBUS, clk: CLK, reset: RESET })
        const CTRL = new Bus([Low, Low, Low, Low, Low, Low, PC_INC, Low, Low, Low, Low, Low, Low, Low, Low, Low].reverse())
        const STEP = s.controlunit(s.bus(5), CLK, RESET, Array(0x100).fill(0), CTRL)

        for (let i = 0; i < 16 * 8; i += 1) {
            const step = toDec(STEP)

            if (step === 3) CTRL.setSignal(CTL.PC_INC)
            else CTRL.setSignal(0x0)
            console.log(`STEP: ${step} PC_INC: ${PC_INC.getSignal()} CTRL: ${toBin(CTRL)}`)

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
        const reset = new Wire
        const ram = Array<number>(256).fill(0)
        const program = [0x01, 0x03]
        
        const { out: A_DATA, we: A_IN } = s.busRegister({ bus, clk, reset })
        const { out: IR_DATA, we: IR_IN, oe: IR_OUT } = s.busRegister({ bus, clk, reset })
        const { out: MAR_DATA, we: MAR_IN } = s.busRegister({ bus, clk, reset })
        const { out: RAM_DATA, we: RAM_IN, oe: RAM_OUT } = s.ram(MAR_DATA, clk, bus, ram)

        s.load(ram, program)
    })

    
    it('program counter', () => {
        const s = new SAP1()

        const clk = s.clock(3)
        const reset = new Wire
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

        BUS.setSignal(0xA0)
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
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        s.posedge(clk)
        expect(toDec(PC)).eq(0xA6)
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
    })
})