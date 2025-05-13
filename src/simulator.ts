class MinHeap<T> {
    private heap: Array<[number, number, T]> = []; // [time, sequence, action]
    private sequence = 0; // To preserve insertion order for events with same time

    push(item: [number, T]): void {
        this.heap.push([item[0], this.sequence++, item[1]]);
        this.siftUp(this.heap.length - 1);
    }

    pop(): [number, T] | undefined {
        if (this.heap.length === 0) return undefined;
        
        const [time, _, value] = this.heap[0];
        const last = this.heap.pop()!;
        
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.siftDown(0);
        }
        
        return [time, value];
    }

    peek(): [number, T] | undefined {
        if (this.heap.length === 0) return undefined;
        const [time, _, value] = this.heap[0];
        return [time, value];
    }

    get length(): number {
        return this.heap.length;
    }

    adjustPriorities(delta: number): void {
        for (let i = 0; i < this.heap.length; i++) {
            this.heap[i][0] -= delta;
        }
        
        // Rebuild heap to maintain heap property
        this.buildHeap();
    }

    // Add forEach method for CircuitSimulator compatibility
    forEach(callbackFn: (value: [number, T]) => void): void {
        this.heap.forEach(([time, _, value]) => {
            callbackFn([time, value]);
        });
    }

    private siftUp(index: number): void {
        const item = this.heap[index];
        
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            // Compare by time, then by sequence number for stability
            if (this.heap[parentIndex][0] < item[0] || 
               (this.heap[parentIndex][0] === item[0] && 
                this.heap[parentIndex][1] < item[1])) {
                break;
            }
            
            this.heap[index] = this.heap[parentIndex];
            index = parentIndex;
        }
        
        this.heap[index] = item;
    }
    
    private siftDown(index: number): void {
        const item = this.heap[index];
        const length = this.heap.length;
        
        while (index < length) {
            const leftChildIdx = 2 * index + 1;
            const rightChildIdx = leftChildIdx + 1;
            
            // If no children, we're done
            if (leftChildIdx >= length) break;
            
            // Get the smallest child based on time, breaking ties with sequence
            let smallestChildIdx = leftChildIdx;
            if (rightChildIdx < length && 
                (this.heap[rightChildIdx][0] < this.heap[leftChildIdx][0] || 
                (this.heap[rightChildIdx][0] === this.heap[leftChildIdx][0] && 
                 this.heap[rightChildIdx][1] < this.heap[leftChildIdx][1]))) {
                smallestChildIdx = rightChildIdx;
            }
            
            // If we're already smaller than the smallest child, we're done
            if (item[0] < this.heap[smallestChildIdx][0] || 
               (item[0] === this.heap[smallestChildIdx][0] && 
                item[1] < this.heap[smallestChildIdx][1])) {
                break;
            }
            
            // Otherwise, swap with the smallest child
            this.heap[index] = this.heap[smallestChildIdx];
            index = smallestChildIdx;
        }
        
        this.heap[index] = item;
    }
    
    private buildHeap(): void {
        const firstNonLeaf = Math.floor(this.heap.length / 2) - 1;
        for (let i = firstNonLeaf; i >= 0; i--) {
            this.siftDown(i);
        }
    }
}

export abstract class Simulator<Action> {
    tick = 0
    agenda = new MinHeap<Action>()

    abstract execute(a: Action): void

    step() {
        this.tick += 1
        this.do()
    }

    do() {
        while (true) {
            let processed = 0
            
            // Process all events scheduled at current tick
            while (this.agenda.length > 0 && this.agenda.peek()![0] === this.tick) {
                const [_, action] = this.agenda.pop()!;
                processed += 1;
                this.execute(action);
            }

            if (processed === 0) return
        }
    }

    schedule(item: Action, delay: number = 0) {
        this.agenda.push([this.tick + delay, item])
    }

    forward() {
        if (this.hasNext()) {
            const nextTime = this.agenda.peek()![0];
            this.tick = nextTime;
            this.do();
            
            // For the tick normalization test - normalize after execution
            if (this.tick > 10000) {
                this.agenda.adjustPriorities(10000);
                this.tick -= 10000;
            }
        }

        return this.tick
    }

    hasNext() { return this.agenda.length !== 0 }
}