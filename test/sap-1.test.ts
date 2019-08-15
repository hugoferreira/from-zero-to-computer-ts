import { expect } from "chai"
import { Wire, toDec } from '../src/circuitsimulator'
import { SAP1 } from '../src/sap-1'

describe('SAP-1 Computer', () => {
    it('program counter', () => {
        const s = new SAP1()

        const CLK = s.clock(1)
        const INC = new Wire(true)
        const RESET = new Wire
        const PC_IN = new Wire
        const BUS = s.bus(8)

        const PC = s.programCounter(BUS, INC, PC_IN, CLK, RESET)

        s.do()
        expect(toDec(PC)).eq(0)

        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        expect(toDec(PC)).eq(5)

        BUS.setSignal(0xA0)
        s.posedge(CLK)
        expect(toDec(PC)).eq(6)

        PC_IN.on()
        s.posedge(CLK)
        expect(toDec(PC)).eq(0xA0)

        PC_IN.off()
        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        s.posedge(CLK)
        expect(toDec(PC)).eq(0xA5)

        RESET.on()
        s.do()
        expect(toDec(PC)).eq(0)
    })
})