export class Simulator<Action extends () => void> {
    tick = 0
    agenda = new Map<number, Action[]>() 
    keys = Array<number>()
    statistics = { totalItems: 0 }

    step() {
        this.tick += 1
        this.do()
    }

    do() {
        while(true) {
            if (this.agenda.has(this.tick)) {
                const items = this.agenda.get(this.tick)!
                this.agenda.delete(this.tick)
                items.forEach(item => item())
            } else return
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.statistics.totalItems += 1
        const atTick = this.tick + delay
        this.keys.push(atTick)
        if (!this.agenda.has(atTick)) this.agenda.set(atTick, [item])
        else this.agenda.get(atTick)!.push(item) 
    }
        
    forward(): number {
        if (this.hasNext()) {
            this.tick = this.keys.sort()[0]
            this.keys = this.keys.filter(t => t !== this.tick)
            this.do()
        }

        return this.tick
    }

    hasNext() {
        return this.keys.length !== 0
    }
}