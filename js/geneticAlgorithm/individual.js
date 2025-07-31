import DrawingDecoder from "../drawingDecoderV5.js";

// an evolvable class that encodes the parameters of a v5 drawing decoder in its genes
export default class Individual {

    constructor(
        {
            fx = 615, fy = 615,                                                         // some reasonable starting guesses for the parameters
            cx = 640, cy = 360,                                             
            k1 = 0,
            tx = 0, ty = 0,
            fxRate = 1, fyRate = 1,                                                     // rates are the maximum amount each parameter can change in a single mutation
            cxRate = 1, cyRate = 1,                                       
            k1Rate = 1e-8,
            txRate = 2, tyRate = 2,
            neutrality = 0,                                                             // neutrality - a measure of neutral networks in the fitness landscape - we can create it artifically
            parent = {}                                                                 // if parent is specified, ignore all other parameters, and mutate the parent instead
        } = {}) {

        if (parent.genotype) {                                                          // if a parent was provided, copy over their hyperparameters

            this.rates = parent.rates;
            this.paramCount = parent.paramCount;
            this.switchRate = parent.switchRate;
            this.neutrality = parent.neutrality;
            this.genotype = {                                                           // copy the genes from the parent
                switches: [...parent.genotype.switches],
                genes: [...parent.genotype.genes]
            }

            this.#mutate();                                                             // apply mutations to the genes

        } else {                                                                        // if this individual has no parent then take the constructor parameters and mutation rates

            const params = [fx, fy, cx, cy, k1, tx, ty];
            this.rates = [fxRate, fyRate, cxRate, cyRate, k1Rate, txRate, tyRate];      
            this.paramCount = params.length;                                            // how many parameters there are
            this.switchRate = 0.1 / this.paramCount;                                    // probability of switching a parameter from one 'set' to another
            this.neutrality = neutrality;                                               
            
            // neutrality = how many sets of parameters the genotype encodes. 
            // a parameter can only be active in one set at a time.
            // the inactive parameters can mutate without any effect on fitness
            // allowing (blind) tunneling through the fitness landscape to escape local minima
            // ...in theory
            
            this.genotype = {                                                           // the genotype includes genes
                switches: [],                                                           // and switches to indicates which genes are active
                genes: []
            };

            this.genotype.switches = params.map(() => 0);                               // set all switches to 0 at first, so the first set of parameters are all active
            for (let i = 0; i < neutrality + 1; i++) {
                this.genotype.genes.push(...params);                                    // set all parameters to the starting values, the same in each set
            }

        }
    }


    // apply some random variation to this individual's genes and switches
    #mutate() {

        this.genotype.genes = this.genotype.genes.map((gene, i) => {                    // this may be too much, perhaps i should only mutate one gene at a time
            const rate = this.rates[i % this.paramCount];                               // but we mutate every gene by an amount between 0 and +/- its mutation rate
            return gene + (Math.random() * 2 * rate) - rate;
        });

        this.genotype.switches = this.genotype.switches.map(s => {                      // we randomly change switches according to switch rate
            if (Math.random() < this.switchRate) {                                      // switch rate is set so there is a 10% chance of one switch being changed
                return Math.floor(Math.random() * (this.neutrality + 1));               // so normally nothing changes here
            } else {
                return s;
            }
        })

    }


    // print out the current active parameters, according to current switch settings
    toString() {
        const params = this.genotype.switches.map((s, i) => {
            return this.genotype.genes[i + s * this.paramCount];
        });
        return `fx: ${params[0]}  fy: ${params[1]}  cx ${params[2]}  cy ${params[3]}  k1 ${params[4]}  tx ${params[5]}  ty ${params[6]}`;
    }


    // create a new decoder based on the current active parameters of this individual
    getDecoder({
        smooth = 0,
        zThreshold = 0,
        checkZ = false
    } = {}) {

        const params = this.genotype.switches.map((s, i) => {
            return this.genotype.genes[i + s * this.paramCount];
        });

        return new DrawingDecoder({
            smooth, zThreshold, checkZ,
            focalLength: { x: params[0], y: params[1] },
            opticalCentre: { x: params[2], y: params[3] },
            k1: params[4],
            tiltFactor: { x: params[5], y: params[6] }
        });

    }

}