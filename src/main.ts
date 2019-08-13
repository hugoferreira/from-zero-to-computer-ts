import { CircuitSimulator, Wire, toHex as th, toBin as tb } from './circuitsimulator'

// Quokka is stupid...
const toHex = th
const toBin = tb

// Let the fun begin
const s = new CircuitSimulator()

/* const A = s.bus(4)
const B = s.bus(4)

const [SUM_DATA, CF_OUT] = s.fulladder(A, B, High)

s.forward()
SUM_DATA.getSignal() //? toBin($)
CF_OUT.getSignal() //? 
*/

const CLK = s.clock(10)
const DBUS = s.bus(8)

const A_IN = new Wire(false)
const B_IN = new Wire(false)
const A_DATA = s.register(DBUS, CLK, A_IN)
const B_DATA = s.register(DBUS, CLK, B_IN)

const A_OUT = new Wire(false)
const B_OUT = new Wire(false)
s.buffer(A_DATA, A_OUT, DBUS)
s.buffer(B_DATA, B_OUT, DBUS)

const CF_IN = new Wire
const [SUM_DATA, CF_OUT] = s.fulladder(A_DATA, B_DATA, CF_IN)

s.posedge(CLK)  //?

DBUS.setSignal(0b1001)

s.posedge(CLK)  //?
A_DATA          //? toBin($)
B_DATA          //? toBin($)

B_IN.on()

s.posedge(CLK)  //?
A_DATA          //? toBin($)
B_DATA          //? toBin($)

DBUS.setSignal(0x0000)
B_OUT.on()      // override data on DBUS
B_IN.off()
A_IN.on()

s.posedge(CLK)  //?
A_DATA          //? toBin($)
B_DATA          //? toBin($)

B_OUT.off()
DBUS[2].on()    // Slice and set wire
B_IN            //? toBin($)
A_IN            //? toBin($)

s.posedge(CLK)  //?
A_DATA          //? toHex($)
B_DATA          //? toHex($)
SUM_DATA        //? toHex($)
CF_OUT          //? toBin($)



/*
/*const inv = s.inverter(clk)
const in2 = s.inverter(inv)
const and = s.and(clk, in2)
const or  = s.or(clk, inv)
const set   = new Wire(false)
const reset = new Wire(false)

clk.getSignal() === false //?
in2.getSignal() === false //?
and.getSignal() === false//?
or.getSignal() === false //?
s.forward() === 5//?
clk.getSignal() === true //?
in2.getSignal() === false //?
and.getSignal() === false //?
or.getSignal()  === true //?
s.forward() === 10 //?
clk.getSignal() === false  //?
in2.getSignal() === false  //?
and.getSignal() === false  //?
or.getSignal() === true //?
s.forward() === 15 //?
clk.getSignal() === true //?
in2.getSignal() === true //?
and.getSignal() === true //?
or.getSignal() === true //?

*/