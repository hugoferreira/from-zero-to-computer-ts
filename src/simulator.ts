export abstract class Simulator<Action> {
    tick = 0
    agenda = Array<[number, Action]>()
    statistics = { totalItems: 0 }

    abstract execute(a: Action): void

    step() {
        this.tick += 1
        this.do()
    }

    do(): Action[] {
        const executedItems = new Array<Action>()
        while (true) {
            // Later change it to a SortedMap and get rid of this nonsense
            const items = this.agenda.filter(i => i[0] === this.tick)
            if (items.length === 0) return executedItems

            this.agenda = this.agenda.filter(i => i[0] !== this.tick)
            
            items.forEach(item => {
                this.execute(item[1])
                executedItems.push(item[1])
            })
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.statistics.totalItems += 1
        this.agenda.push([this.tick + delay, item])
    }

    forward() {
        if (this.hasNext()) {
            // Renormalize tick values every 100000 ticks so it doesn't overflow
            if (this.tick > 10000) this.agenda = this.agenda.map(([t, v]) => [t - 10000, v])
            this.tick = Math.min(... this.agenda.map(i => i[0]))
            return { tick: this.tick, items: this.do() }
        }

        return { tick: this.tick, items: [] }
    }

    hasNext() {
        return this.agenda.length !== 0
    }
}