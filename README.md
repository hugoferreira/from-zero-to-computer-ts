# From Zero to Computer in TypeScript

An 8 bit CPU implemented on top of a Digital Circuit Simulator in TypeScript. Probably the digital equivalent to building the CPU out of transistors. To see a nice GUI, run:

```npm i```

... followed by

```npm rum start```

Which will provide you a minimalistic visualizer like so:

<img src="https://github.com/hugoferreira/from-zero-to-computer-ts/raw/master/screenshots/debugger.png" width="532" height="440">

## Roadmap

 - [x] Design a logic circuit simulator in ~~Scala~~ Typescript;
 - [x] Proceeded to implement the fundamentals of electronic systems, such as logic gates, flip-flops, muxes/demuxes, etc;
 - [x] Design on top of that a computer system, where I'll do my best effort to be ~~non-von-Neumann~~ (bottom line, it's von-Neumann);
    - [x] ... 8bit registers/ALU, 8bit Memory BUS (SAP-1)
    - [ ] ... 8bit registers/ALU, 16bit Memory BUS (SAP-2)
    - [x] ... a functional clone of a 70's era CPU (6502)
    - [ ] ... a logic-gate equivalent of a 70's era CPU (6502)
    - [ ] ... a superset of the above CPU 
 - [x] Implement a ~~basic compiler for that computer in Scala~~ assembler that supports macros;
 - [ ] Implement a basic operating system to run on that computer;
 - [ ] Implement an application for that OS that acts as a monitor, akin to what the Apple II had;
 - [ ] Proceed to bootstrap that assembler (i.e., make the monitor be able to assemble stuff during runtime);
 - [x] Physically build this system;
    - [ ] ... using 74xxx-era discrete ICs (waiting for eBay);
    - [ ] ... with VGA output (easy with a FPGA or an Arduino; not so easy with 74xxx because of the IC count).

## History

Some time ago I decided that, in order to truly understand a computer, I would have to design one... from scratch. Don't get me wrong; most of my professional life is kept at a very high-level of abstraction and I actively evangelize people that way. I spent the last eight years basically programming in Scala. I teach Agile. Part of my research involves mixing machine learning with software engineering. I once studied typed lambda-calculus, got my dose of theorem-proving in Coq, and proceded to teach formal methods. I understand the phenomena of computation as being decoupled from the physical media where it is performed, up to the point that I believe in hard-AI.

And yet, somehow, the low-level engineering details of electronics fascinate me...

So, [around 2014](https://github.com/hugoferreira/from-zero-to-computer), I decided to set a new hobby goal, where *"no further than the 31th of December 2014, I would have done the following"*:

1. Designed a logic circuit simulator in Scala
2. Proceeded to implement the fundamentals of electronic systems, such as logic gates, flip-flops, muxes/demuxes, etc.
3. Design on top of that a computer system, where I'll do my best effort to be non-von-Neumann (though this is not guaranteed)
4. Implement a basic compiler for that computer in Scala
5. Proceed to bootstrap that compiler (i.e., make the compiler able to compile itself)
6. Implement a basic operating system to run on that computer
7. Implement an application for that OS that acts as a real-time monitor of the code being executed
8. Physically build this system with VGA output from common IC's

With little more than 8 months to complete the above list, it meant that each topic would have to be completed in just one month. While teaching, researching, and being the CTO of a company, without ever attempting anything similar.

I failed.

But not necessarily because I underestimated the effort required to complete it (which I did), but because I grossly underestimated my knowledge of digital systems and CPU design. 

Notwithstanding, as you can see, I recently decided to tackle this project... again! No deadlines for now. Just coding and doing some breadboard magic whenever I feel to. Progress has been made.

