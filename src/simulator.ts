export abstract class Simulator<Action> {
    tick = 0
    agenda = Array<[number, Action]>()

    abstract execute(a: Action): void

    step() {
        this.tick += 1
        this.do()
    }

    do() {
        while (true) {
            const newAgenda = Array<[number, Action]>()
            let processed = 0

            for (let ix = 0; ix < this.agenda.length; ix += 1) {
                const item = this.agenda[ix]
                if (item[0] === this.tick) { processed += 1; this.execute(item[1]) }
                else newAgenda.push(item)
            }

            if (processed === 0) return
            this.agenda = newAgenda
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.agenda.push([this.tick + delay, item])
    }

    forward() {
        if (this.hasNext()) {
            // Renormalize tick values every 10000 ticks so it doesn't overflow
            if (this.tick > 10000) this.agenda = this.agenda.map(([t, v]) => [t - 10000, v])
            this.tick = Math.min(... this.agenda.map(i => i[0]))
            // this.tick = this.agenda.reduce((min, [t, _]) => (t < min) ? t : min, Number.POSITIVE_INFINITY)
            this.do()
        }

        return this.tick
    }

    hasNext() { return this.agenda.length !== 0 }
}