import { expect } from "chai";
import { CircuitSimulator, Wire, Low, toDec, High } from '../src/circuitsimulator'
import * as fc from 'fast-check'
import { SAP1 } from "../src/sap-1";

describe('bus and registers', () => {
    it("swap values", () => {
        const testCase = fc.integer(2, 32).chain(nRegisters => fc.tuple(
            fc.constant(nRegisters),
            fc.array(fc.nat(0xFF), nRegisters, nRegisters),   // initial values
            fc.array(fc.set(fc.nat(nRegisters - 1), 2, 2))
        ))

        fc.assert(fc.property(testCase, ([nRegisters, initValues, swaps]) => {
            const s = new SAP1()
            const clk = s.clock(1)
            const reset = new Wire
            const bus = s.bus(8)
            const regs = Array(nRegisters).fill(0).map(r => s.busRegister({ bus, clk, reset }))

            initValues.forEach((v, ix) => {
                const reg = regs[ix]
                bus.setSignal(v)
                reg.oe.off()
                reg.we.on()
                s.posedge(clk)
                reg.we.off()
            })

            let currentValues = initValues

            swaps.forEach(([we, oe]) => {
                bus.setSignal(0x00)
                regs[we].we.on()
                regs[oe].oe.on()
                s.posedge(clk)
                expect(toDec(regs[we].out.getSignal())).eq(toDec(regs[oe].out.getSignal()))
                expect(toDec(bus.getSignal())).eq(toDec(regs[oe].out.getSignal()))

                currentValues.forEach((v, ix) => { if (ix !== we) expect(toDec(regs[ix].out.getSignal())).eq(v) })
                currentValues = regs.map(r => toDec(r.out.getSignal()))

                regs[we].we.off()
                regs[oe].oe.off()
            })
        }), { seed: -701609666, path: "5:0:2:1:2:3:2:2", endOnFailure: true })
    })

    it("initialization", () => {
        fc.assert(fc.property(fc.array(fc.nat(0xFF)), (initValues) => {
            const s = new SAP1()
            const clk = s.clock(1)
            const bus = s.bus(8)
            const regs = Array(initValues.length).fill(0).map(_ => s.busRegister({ bus, clk }))

            initValues.forEach((v, ix) => {
                const reg = regs[ix]
                bus.setSignal(v)
                reg.oe.off()
                reg.we.on()
                s.posedge(clk)
                expect(toDec(reg.out.getSignal())).eq(v)
                expect(toDec(bus.getSignal())).eq(v)
                reg.we.off()
                s.posedge(clk)
            })

            let lastBusSignal = 0x00
            bus.setSignal(lastBusSignal)
            
            initValues.forEach((v, ix) => {
                s.posedge(clk)
                const reg = regs[ix]
                expect(toDec(reg.out.getSignal())).eq(v)
                expect(toDec(bus.getSignal())).eq(lastBusSignal)
                reg.oe.on()
                s.posedge(clk)
                lastBusSignal = toDec(bus.getSignal())
                expect(lastBusSignal).eq(v)
                reg.oe.off()
                s.posedge(clk)
            })
        }), { seed: -956589129, path: "14:3:1:1:1:1:1:1:1:2", endOnFailure: true })
    })
})
