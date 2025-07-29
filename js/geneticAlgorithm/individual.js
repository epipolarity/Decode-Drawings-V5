import DrawingDecoder from "../drawingDecoderV5.js";

export default class Individual {

    constructor(
        {
            fx = 615, fy = 615,
            cx = 640, cy = 360,
            k1 = 0,
            tx = 0, ty = 0,
            fxScale = 1, fyScale = 1,
            cxScale = 1, cyScale = 1,
            k1Scale = 1e-8,
            txScale = 2, tyScale = 2,
            neutrality = 0,
            parent = {}
        } = {}) {

        if (parent.genotype) {

            this.rates = parent.rates;
            this.paramCount = parent.paramCount;
            this.switchRate = parent.switchRate;
            this.neutrality = parent.neutrality;
            this.genotype = {
                switches: [...parent.genotype.switches],
                genes: [...parent.genotype.genes]
            }

            this.#mutate();

        } else {

            const params = [fx, fy, cx, cy, k1, tx, ty];
            this.rates = [fxScale, fyScale, cxScale, cyScale, k1Scale, txScale, tyScale];
            this.paramCount = params.length;
            this.switchRate = 0.1 / this.paramCount;
            this.neutrality = neutrality;

            this.genotype = {
                switches: [],
                genes: []
            };

            this.genotype.switches = params.map(() => 0);
            for (let i = 0; i < neutrality + 1; i++) {
                this.genotype.genes.push(...params);
            }

        }
    }


    #mutate() {

        this.genotype.genes = this.genotype.genes.map((gene, i) => {
            const rate = this.rates[i % this.paramCount];
            return gene + (Math.random() * 2 * rate) - rate;
        });

        this.genotype.switches = this.genotype.switches.map(s => {
            if (Math.random() < this.switchRate) {
                return Math.floor(Math.random() * (this.neutrality + 1));
            } else {
                return s;
            }
        })

    }


    toString() {
        const params = this.genotype.switches.map((s, i) => {
            return this.genotype.genes[i + s * this.paramCount];
        });
        return `fx: ${params[0]}  fy: ${params[1]}  cx ${params[2]}  cy ${params[3]}  k1 ${params[4]}  tx ${params[5]}  ty ${params[6]}`;
    }


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