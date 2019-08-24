import { Simulator } from './simulator'

// -----------

const fromBin = (n: number, width: number): boolean[] => Array(width).fill(0).map((_, ix) => (n >> ix & 1) === 1)

export const toDec = (bs: boolean | boolean[] | Bus | Wire): number => {
    if (typeof bs === 'boolean') return (bs ? 1 : 0)
    if (bs instanceof Wire) return (bs.get() ? 1 : 0)
    if (bs instanceof Bus) bs = bs.get()
    return bs.reduce((a, b, p) => a + ((b ? 1 : 0) << p), 0)
}

// -----------

export const toHex = (bs: boolean[] | Bus, width: number = bs.length / 4): string => `0x${toDec(bs).toString(16).padStart(width, '0')}`
export const toBin = (bs: boolean[] | Bus, width: number = bs.length): string => `0b${toDec(bs).toString(2).padStart(width, '0')}`

// -----------

type CircuitAction = () => void 

interface Connector<T> {
    length: number
    get(): T
    set(s: T): void
    delaySet(s: T, delay: number): void
    trigger(a: CircuitAction): void
    clone(): Connector<T> 
    connect(to: Connector<T>): void
}

export class Wire implements Connector<boolean> {
    length = 1

    constructor(private _simulator: CircuitSimulator, public _wireId: number, _signal: boolean = false) { 
        _simulator.wireState.set(_wireId, _signal)
    }

    clone() { return this._simulator.wire() }

    get() { return this._simulator.getSignal(this._wireId) }
    set(s: boolean) { this._simulator.setSignal(this._wireId, s) }

    delaySet(s: boolean, delay = 0) {
        this._simulator.schedule({ wire: this._wireId, state: s }, delay)
    }

    on() { this.set(true) }
    off() { this.set(false) }

    trigger(a: CircuitAction) { this._simulator.onChange(this._wireId, a) }
    posEdge(a: CircuitAction) { this._simulator.onPosEdge(this._wireId, a) }

    connect(to: Wire) {
        this._simulator.merge(this._wireId, to._wireId)
        to._wireId = this._wireId
    }
}

export class Bus extends Array<Wire> implements Connector<boolean[]> {
    constructor(public wires: Wire[]) { super(...wires) }

    clone(): Bus { return new Bus(this.wires.map(w => w.clone())) }

    get() { return this.wires.map(w => w.get()) }

    set(signals: boolean[] | number) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].set(s))
    }

    delaySet(signals: boolean[] | number, delay = 0) {
        if (typeof signals === 'number') signals = fromBin(signals, this.wires.length)
        signals.forEach((s, ix) => this.wires[ix].delaySet(s, delay))
    }

    trigger(a: CircuitAction) { this.wires.forEach(w => w.trigger(a)) }

    slice(start?: number | undefined, end?: number | undefined): Wire[] { 
        return this.wires.slice(start, end) 
    }

    connect(to: Bus) {
        this.wires.forEach((w, ix) => w.connect(to[ix]))
    }
}

export class CircuitSimulator extends Simulator<{ wire: number, state: boolean}> {
    private _wireId = 0
    public wireState = new Map<number, boolean>()
    public _actions = new Map<number, Array<CircuitAction>>()
    public _posEdge = new Map<number, Array<CircuitAction>>()

    protected readonly _ffDelay = 0
    protected readonly _dffDelay = 0
    protected readonly _gateDelay = 0

    public readonly High = this.wire(true)
    public readonly Low = this.wire(false)
    
    execute(action: { wire: number, state: boolean }): void {
        this.setSignal(action.wire, action.state)
    }

    getSignal(id: number) { return this.wireState.get(id)! }

    merge(from: number, to: number) {
        this.agenda.forEach(([_, cmd]) => { if (cmd.wire === to) cmd.wire = from })

        const fromActions = this._actions.get(from)!;
        const toActions = this._actions.get(to)!;
        toActions.forEach(a => fromActions.push(a))
        toActions.length = 0

        const fromPosEdge = this._posEdge.get(from)!;
        const toPosEdge = this._posEdge.get(to)!;
        toPosEdge.forEach(a => fromPosEdge.push(a))
        toPosEdge.length = 0

        this.wireState.delete(to)
    } 

    setSignal(id: number, s: boolean) {
        if (s !== this.getSignal(id)) {
            this.wireState.set(id, s)
            this._actions.get(id)!.forEach(a => a())
            if (s) this._posEdge.get(id)!.forEach(a => a())
        }
    }

    onChange(id: number, a: CircuitAction) { 
        this._actions.get(id)!.push(a)
        a() 
    }

    onPosEdge(id: number, a: CircuitAction) {
        this._posEdge.get(id)!.push(a)
        if (this.getSignal(id)) a() 
    }

    wire(signal = false): Wire {
        this._wireId += 1
        this._actions.set(this._wireId, new Array<CircuitAction>())
        this._posEdge.set(this._wireId, new Array<CircuitAction>())
        return new Wire(this, this._wireId, signal)
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

    connect<T, U extends Connector<T>>(from: U, to: U) {
        from.connect(to)
    }

    // ----------------------------------------------
    // Gates
    // ----------------------------------------------

    inverter(input: Wire, delay = 0) {
        const out = this.wire()
        input.trigger(() => {
            const sig = !input.get()
            out.delaySet(sig, this._gateDelay + delay)
        })
        return out
    }

    binaryOp(a: Wire, b: Wire, op: (a: boolean, b: boolean) => boolean, out = this.wire()) {
        const action = () => {
            const sig = op(a.get(), b.get())
            out.delaySet(sig, this._gateDelay)
        }
        
        a.trigger(action)
        b.trigger(action)

        return out
    }

    and(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x && y, out); return out }
    nand(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => !(x && y), out); return out  }
    or(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x || y, out); return out  }
    nor(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => !(x || y), out); return out  }
    xor(a: Wire, b: Wire, out = this.wire()) { this.binaryOp(a, b, (x, y) => x ? (!y) : y, out); return out  }

    buffer<T, U extends Connector<T>>(ins: U, we: Wire = this.High, outs = <U> ins.clone()) {
        const action = () => {
            if (we.get()) outs.delaySet(ins.get(), this._gateDelay)
        }

        ins.trigger(action)
        we.posEdge(action)

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
        address.trigger(() => data.set(mem[toDec(address.get())]))
    }

    // ----------------------------------------------
    // Plexers
    // ----------------------------------------------

    // Single Bit Data/Sel Multiplexer 
    onebitmux(a: Wire, b: Wire, s: Wire): Wire {
        return this.or(this.and(a, this.inverter(s)), this.and(b, s))
    }
        
    // Multiplexer { Optimized }
    mux<U extends Bus | Wire>(data: Array<U>, sel: Bus | Wire, out = <U> data[0].clone()): U {
        if (data.length !== 2 ** sel.length)
            throw new Error("Selection and data lines size mismatch")

        const wes = this.bus(data.length)
        data.forEach((i, ix) => this.buffer(i, wes[ix], out))
        this.decoder(sel, wes)

        return out
    }

    decoder(data: Bus | Wire, outs: Bus = this.bus(2 ** data.length)): Bus {
        data.trigger(() => {
            const six = toDec(data.get())
            outs.forEach((w, ix) => w.delaySet(ix === six))
        })

        return outs
    }

    // ----------------------------------------------
    // Sequential Logic (Arithmetic)
    // ----------------------------------------------

    incrementer(a: Bus, outs = a.clone()): [Bus, Wire] {
        const zero = a.clone()
        return this.fulladder(a, zero, this.High, outs)
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
        out.trigger(() => out.delaySet(!out.get(), interval))
        
        return out
    }

    // PosEdge D Flip-Flop { Optimized }
    dff(input: Wire, clk: Wire, initState: boolean = false, reset: Wire = this.Low) {
        const out = this.wire()
        let state = initState

        clk.posEdge(() => {
            const sig = input.get()
            const rst = reset.get()
            state = rst ? initState : sig
            out.delaySet(state, this._dffDelay)
        })

        reset.posEdge(() => {
            state = initState
            out.delaySet(state, this._dffDelay)
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

    ram(address: Bus, clk: Wire, data: Bus = this.bus(8), mem: number[] = Array(2 ** address.length).fill(0), we: Wire = this.wire(), oe: Wire = this.wire()) {
        if (mem.length !== 2 ** address.length) throw Error("Invalid memory size for addressing range")
        const latch = data.clone()
        const latchAction = () => latch.set(mem[toDec(address.get())])
        const writeAction = () => { if (we.get()) mem[toDec(address.get())] = toDec(data.get()) }

        address.trigger(latchAction)
        clk.posEdge(latchAction)
        clk.posEdge(writeAction)
        data.trigger(writeAction)

        const out = this.buffer(latch, oe)

        return { out, we, oe, mem }
    }

    ioram(address: Bus, clk: Wire, data: Bus = this.bus(8), mem: number[] = Array(2 ** address.length).fill(0), we: Wire = this.wire(), oe: Wire = this.wire()) {
        const { out } = this.ram(address, clk, data, mem, we, oe)
        out.connect(data)
        return { out, we, oe, mem }
    } 
}