import { checkCircle } from "../circleFit.js";
import Individual from "./individual.js";
import { map } from "../utils.js";

import { balls as balls1 } from "../../data/balls_1.js";
import { balls as balls2 } from "../../data/balls_2.js";
import { balls as balls3 } from "../../data/balls_3.js";
import { balls as balls4 } from "../../data/balls_4.js";
import { balls as balls5 } from "../../data/balls_5.js";
import { balls as balls6 } from "../../data/balls_6.js";

const populationSize = 10;
const generations = 50000;
let g = 0;

const skipFrames = 10;

const adam = new Individual({ neutrality: 2 });

adam.score = getScore(adam);
printScore(adam, g);

let lastScore = adam.score;
let bestScore = adam.score;
let bestParams = adam.toString();

let ctx;
let nodeMode = false;

try {
    ctx = fitness.getContext("2d");
} catch {
    nodeMode = true;
    console.log("Running in Node without canvas");
}

let population = [adam];

while (population.length < populationSize) {
    population.push(new Individual({ parent: adam }));
}

if (nodeMode) {
    while (g < generations) {
        evolve();
    }
    console.log(`Finished: ${g} generations`);
} else {
    evolve();
}

function evolve() {

    if (g === generations) {
        console.log(`Finished: ${g} generations`);
        return;
    };

    const scoredPopulation = population
        .map(individual => {
            individual.score = getScore(individual);
            return individual;
        })
        .sort((a, b) => a.score - b.score);

    const sumExp = scoredPopulation.reduce((sum, individual) => sum + Math.exp(individual.score), 0);
    const normScores = scoredPopulation.map(individual => Math.exp(individual.score) / sumExp);

    const newPopulation = [scoredPopulation[0]];

    while (newPopulation.length < populationSize) {
        const idx = Math.floor(Math.random() * populationSize);
        if (Math.random() < normScores[idx]) {
            newPopulation.push(new Individual({ parent: population[idx] }));
        }
    }

    population = newPopulation;

    if (!nodeMode) {
        ctx.beginPath();
        const start = {
            x: map(g, 0, generations, 0, fitness.width),
            y: map(lastScore, 0, 0.04, fitness.height, 0)
        }
        ctx.moveTo(start.x, start.y);
    }

    lastScore = scoredPopulation[0].score;
    g++;

    if (scoredPopulation[0].score < bestScore) {
        bestScore = scoredPopulation[0].score;
        bestParams = scoredPopulation[0].toString();
        printScore(scoredPopulation[0], g);
    }

    if (!nodeMode) {
        const end = {
            x: map(g, 0, generations, 0, fitness.width),
            y: map(lastScore, 0, 0.04, fitness.height, 0)
        }
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        requestAnimationFrame(evolve);
    }

}



function printScore(individual, generation) {
    console.log(`Gen ${generation}: ${individual.score} - ${individual.toString()}`);
}


function getScore(individual) {

    const decoder = individual.getDecoder();
    for (let i = 0; i < balls1.length; i += skipFrames) {
        const balls = balls1[i];
        decoder.decode(balls.contours);
    }
    return checkCircle(decoder.collector);

}