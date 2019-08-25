import { Simulator } from './simulator'

// -----------

export const toDec = (bs: boolean | boolean[] | Bus | Wire): number => {
    if (typeof bs === 'boolean') return (bs ? 1 : 0)
    if (bs instanceof Wire) return (bs.get() ? 1 : 0)
    if (bs instanceof Bus) bs = bs.get()

    return bs.reduce((a, b, p) => b ? (a + (1 << p)) : a, 0)
}

export const fromBin = (n: number, width: number): boolean[] => Array(width).fill(false).map((_, ix) => (n >>> ix & 1) === 1)
export const toHex = (bs: boolean[] | Bus, width: number = bs.length / 4): string => `0x${toDec(bs).toString(16).padStart(width, '0')}`
export const toBin = (bs: boolean[] | Bus, width: number = bs.length): string => `0b${toDec(bs).toString(2).padStart(width, '0')}`

// -----------

type NetObserver = () => void 
type CircuitAction = { wire: number, state: boolean }

interface Net<T> {
    length: number
    get(): T
    set(s: T): void
    schedule(s: T, delay: number): void
    onChange(a: NetObserver): void
    clone(): Net<T> 
    connect(to: Net<T>): void
}

export class Wire implements Net<boolean> {
    length = 1

    constructor(private _circuit: CircuitSimulator, public _netId: number, _signal: boolean = false) { 
        _circuit.netList[_netId] = _signal
    }

    clone() { return this._circuit.wire() }
    get() { return this._circuit.getSignal(this._netId) }
    set(s: boolean) { this._circuit.setSignal(this._netId, s) }
    onChange(a: NetObserver) { this._circuit.onChange(this._netId, a) }
    onPosEdge(a: NetObserver) { this._circuit.onPosEdge(this._netId, a) }
    on() { this.set(true) }
    off() { this.set(false) }

    schedule(s: boolean, delay = 0) {
        this._circuit.schedule({ wire: this._netId, state: s }, delay)
    }

    connect(to: Wire) {
        this._circuit.merge(this._netId, to._netId)
        to._netId = this._netId
    }
}

export class Bus extends Array<Wire> implements Net<boolean[]> {
    constructor(public wires: Wire[]) { super(...wires) }

    clone() { return new Bus(this.wires.map(w => w.clone())) }
    get() { return this.wires.map(w => w.get()) }
    onChange(a: NetObserver) { this.wires.forEach(w => w.onChange(a)) }
    connect(to: Bus) { this.wires.forEach((w, ix) => w.connect(to[ix])) }
    zero() { this.wires.forEach(w => w.off()) }

    set(signals: boolean[] | number) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].set(s))
    }

    schedule(signals: boolean[] | number, delay = 0) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].schedule(s, delay))
    }

    slice(start?: number | undefined, end?: number | undefined) {
        return this.wires.slice(start, end)
    }
}

export class CircuitSimulator extends Simulator<CircuitAction> {
    _idCounter = 0

    readonly _ffDelay = 0
    readonly _dffDelay = 0
    readonly _gateDelay = 0

    readonly netList = new Array<boolean>()
    readonly observers = new Array<Array<NetObserver>>()
    readonly posEdgeObs = new Array<Array<NetObserver>>()

    readonly High = this.wire(true)
    readonly Low = this.wire(false)

    execute(action: CircuitAction): void {
        this.setSignal(action.wire, action.state)
    }

    getSignal(id: number) { return this.netList[id] }

    merge(from: number, to: number) {
        this.agenda.forEach(([_, cmd]) => { if (cmd.wire === to) cmd.wire = from })

        const fromActions = this.observers[from]!;
        const toActions = this.observers[to]!;
        toActions.forEach(a => fromActions.push(a))
        toActions.length = 0

        const fromPosEdge = this.posEdgeObs[from]!;
        const toPosEdge = this.posEdgeObs[to]!;
        toPosEdge.forEach(a => fromPosEdge.push(a))
        toPosEdge.length = 0
    } 

    setSignal(id: number, s: boolean) {
        if (s !== this.getSignal(id)) {
            this.netList[id] = s
            for (const a of this.observers[id]) a()
            if (s) for (const a of this.posEdgeObs[id]) a()
        }
    }

    onChange(id: number, a: NetObserver) { 
        this.observers[id]!.push(a)
        a() 
    }

    onPosEdge(id: number, a: NetObserver) {
        this.posEdgeObs[id]!.push(a)
        if (this.getSignal(id)) a() 
    }

    wire(signal = false): Wire {
        this._idCounter += 1
        this.observers[this._idCounter] = new Array<NetObserver>()
        this.posEdgeObs[this._idCounter] = new Array<NetObserver>()
        return new Wire(this, this._idCounter, signal)
    }
        
    bus(size: number, initSignal: number = 0) {
        const bus = new Bus(Array(size).fill(0).map(_ => this.wire()))
        bus.set(initSignal)
        return bus
    }

    posedge(w: Wire) {
        const lastTick = this.tick;
        do { this.forward() } while (!w.get() || lastTick === this.tick);
        return this.tick
    }

    negedge(w: Wire) {
        const lastTick = this.tick;
        do { this.forward() } while (w.get() || lastTick === this.tick);
        return this.tick
    }

    // ----------------------------------------------
    // Gates
    // ----------------------------------------------

    inverter(input: Wire) {
        const out = this.wire()
        input.onChange(() => out.schedule(!input.get(), this._gateDelay))
        return out
    }

    binaryOp(a: Wire, b: Wire, op: (a: boolean, b: boolean) => boolean, out = this.wire()) {
        const action = () => out.schedule(op(a.get(), b.get()), this._gateDelay)
        
        a.onChange(action)
        b.onChange(action)

        return out
    }

    and(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x && y, out); return out }
    nand(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => !(x && y), out); return out  }
    or(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x || y, out); return out  }
    nor(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => !(x || y), out); return out  }
    xor(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x ? (!y) : y, out); return out  }

    bufferWire(i: Wire, we: Wire = this.High, o = i.clone()) {
        const action = () => { if (we.get()) o.schedule(i.get(), this._gateDelay) }

        i.onChange(action)
        we.onPosEdge(action)

        return o
    }

    buffer(ins: Wire, we: Wire, outs?: Wire): Wire;
    buffer(ins: Bus, we: Wire, outs?: Bus): Bus;
    buffer(ins: Wire | Bus, we: Wire = this.High, outs = ins.clone()) {
        if (ins instanceof Wire) this.bufferWire(ins, we, <Wire> outs)
        else if (ins instanceof Bus) ins.forEach((i, ix) => this.bufferWire(i, we, (<Bus> outs)[ix]))
        return outs
    }

    // ----------------------------------------------
    // Memory
    // ----------------------------------------------

    // SR NOR Latch
    flipflop(set: Wire = this.wire(), reset: Wire = this.wire(), q = this.wire()) {
        const nq = this.wire(true)

        this.nor(reset, nq, q)
        this.nor(set, q, nq)

        return [q, nq, set, reset]
    }

    rom(address: Bus, mem: number[], data: Bus) {
        address.onChange(() => data.set(mem[toDec(address.get())]))
    }

    // ----------------------------------------------
    // Plexers
    // ----------------------------------------------

    // Single Bit Data/Sel Multiplexer 
    onebitmux(a: Wire, b: Wire, s: Wire): Wire {
        return this.or(this.and(a, this.inverter(s)), this.and(b, s))
    }
        
    // Multiplexer { Optimized }
    mux(data: Array<Wire>, sel: Bus | Wire, out?: Wire): Wire;
    mux(data: Array<Bus>, sel: Bus | Wire, out?: Bus): Bus;
    mux(data: Array<Wire|Bus>, sel: Wire | Bus, out = data[0].clone()): Wire | Bus {
        if (data.length !== 2 ** sel.length)
            throw new Error("Selection and data lines size mismatch")

        const wes = this.decoder(sel)
        data.forEach((i, ix) => this.buffer(<any> i, wes[ix], <any> out))

        return out
    }

    decoder(data: Bus | Wire, outs: Bus = this.bus(2 ** data.length)): Bus {
        data.onChange(() => {
            const six = toDec(data.get())
            outs.forEach((w, ix) => w.schedule(ix === six))
        })

        return outs
    }

    // ----------------------------------------------
    // Sequential Logic (Arithmetic)
    // ----------------------------------------------

    incrementer(a: Bus, outs = a.clone()): [Bus, Wire] {
        const cout = a.reduce((cin, w, ix) => {
            this.xor(w, cin).connect(outs[ix])
            return this.and(w, cin)
        }, this.High)

        return [outs, cout]
    }

    fulladder(a: Bus, b: Bus, carry: Wire, outs = a.clone()): [Bus, Wire] {
        if (a.length !== b.length) throw Error("A and B must have the same length")

        const cout = a.reduce((cin, w, ix) => {
            const x = this.xor(w, b[ix])
            this.xor(x, cin).connect(outs[ix])
            return this.or(this.and(x, cin), this.and(w, b[ix]))
        }, carry)

        if (a.length !== outs.length) throw Error("Output must have the same length as Input")

        return [outs, cout]
    }

    // ----------------------------------------------
    // Sequential Logic
    // ----------------------------------------------

    clock(interval: number = 1, state: boolean = false) {
        const out = this.wire(state)
        out.onChange(() => out.schedule(!out.get(), interval))
        return out
    }

    // PosEdge D Flip-Flop { Optimized }
    dff(input: Wire, clk: Wire, initState: boolean = false, reset: Wire = this.Low) {
        const out = this.wire()
        let state = initState

        clk.onPosEdge(() => {
            state = input.get()
            out.schedule(state, this._dffDelay)
        })

        reset.onPosEdge(() => {
            state = initState
            out.schedule(state, this._dffDelay)
        })

        return out
    }

    register(ins: Bus, clk: Wire, we: Wire = this.High, reset: Wire = this.Low) {
        return new Bus(this.buffer(ins, we).wires.map(w => this.dff(w, clk, false, reset)))

        // This might lead to mixed signals being injected in the scheduler, 
        // and latch an incorrect value. Either the above turns out to work, or I need to
        // fix mismatch signals happening simultaneously.
        // return new Bus(ins.wires.map(w => this.dff(w, this.and(clk, we), false, reset)))
    }

    counter(bus: Bus, clk: Wire, we: Wire = this.Low, reset: Wire, out: Bus = bus.clone()): Bus {
        const data = this.buffer(bus, we)
        const r_out = this.register(data, clk, this.High, reset)
        const [r_inc, _] = this.incrementer(r_out, data)
        
        r_out.connect(out)
        return r_out
    }

    ram(address: Bus, clk: Wire, data: Bus = this.bus(8), mem: Uint8Array = new Uint8Array(2 ** address.length), we: Wire = this.wire(), oe: Wire = this.wire()) {
        if (mem.length !== 2 ** address.length) throw Error("Invalid memory size for addressing range")
        const latch = data.clone()

        // Not sure if these should be commented, but the tests pass

        // const latchAction = () => latch.set(mem[toDec(address.get())])
        // const writeAction = () => { if (we.get()) mem[toDec(address.get())] = toDec(data.get()) }

        // address.onChange(latchAction)
        // clk.onPosEdge(latchAction)
        // clk.onPosEdge(writeAction)
        // data.onChange(writeAction)

        clk.onPosEdge(() => {
            const addr = toDec(address.get())
            latch.set(mem[addr])
            if (we.get()) mem[addr] = toDec(data.get())
        })

        const out = this.buffer(latch, oe)

        return { out, we, oe, mem }
    }

    ioram(address: Bus, clk: Wire, data: Bus = this.bus(8), mem: Uint8Array = new Uint8Array(2 ** address.length), we: Wire = this.wire(), oe: Wire = this.wire()) {
        const { out } = this.ram(address, clk, data, mem, we, oe)
        out.connect(data)
        return { out, we, oe, mem }
    } 
}