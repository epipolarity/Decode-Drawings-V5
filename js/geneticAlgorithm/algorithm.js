import { checkCircle } from "../circleFit.js";
import Individual from "./individual.js";
import { map } from "../utils.js";

// load data from the ballContourDetector data files
// didn't get as far as developing a fitness function for drawings 2-6
// but i imagined trying to get the edges of the star to be at expected angles
// the vertical and horizontal parts of the house to be straight
// every drawing to be flat in Z with exception of pen-lifting outliers
import { balls as balls1 } from "../../data/balls_1.js";
import { balls as balls2 } from "../../data/balls_2.js";
import { balls as balls3 } from "../../data/balls_3.js";
import { balls as balls4 } from "../../data/balls_4.js";
import { balls as balls5 } from "../../data/balls_5.js";
import { balls as balls6 } from "../../data/balls_6.js";


// try to find the 'fitness' canvas
// if this fails, assume this script is being run in node.js rather than browser
let ctx;
let nodeMode = false;
try {
    ctx = fitness.getContext("2d");
} catch {
    nodeMode = true;
    console.log("Running in Node without canvas");
}

// 50 'individuals' will battle to survive to reproduce offspring for the next 50000 generations
const populationSize = 50;
const generations = 50000;

// current generation
let g = 0;

// i deemed it unnecessary to process every frame, as this was a little slow
const skipFrames = 10;

// it all starts with one individual
// https://en.wikipedia.org/wiki/Neutral_network_(evolution)
const adam = new Individual({ neutrality: 2 });

// assess to get a baseline fitness to improve upon
adam.score = getScore(adam);
printScore(adam, g);

// keep track of best score
let bestScore = adam.score;

// if runnning in browser with canvas, move the pen to the starting position
if (!nodeMode) {
    ctx.beginPath();
    const start = {
        x: map(g, 0, generations, 0, fitness.width),
        y: map(bestScore, 0, -0.04, fitness.height, 0)
    }
    ctx.moveTo(start.x, start.y);
}

// create a population of adam
let population = [adam];

// and adam's descendants
while (population.length < populationSize) {
    population.push(new Individual({ parent: adam }));
}

if (nodeMode) {                                 // if running under node.js then call evolve() manually for every generation
    while (g < generations) {
        evolve();
    }
    console.log(`Finished: ${g} generations`);
} else {                                        // otherwise evolve() will call requestAnimationFrame() when it's ready
    evolve();
}

// perform the task of assessing each individual and deciding who gets to contribute to the next generation
function evolve() {

    if (g === generations) {
        console.log(`Finished: ${g} generations`);
        return;
    };

    g++;

    // give each individual their score, and sort them according to it
    const scoredPopulation = population
        .map(individual => {
            individual.score = getScore(individual);
            return individual;
        })
        .sort((a, b) => b.score - a.score);

    // perform softmax on scores to get normalised probability distribution to give better scores better chance of reproducing
    const sumExp = scoredPopulation.reduce((sum, individual) => sum + Math.exp(individual.score), 0);
    const normScores = scoredPopulation.map(individual => Math.exp(individual.score) / sumExp);

    // always add the best individual to the next generation without mutation
    const newPopulation = [scoredPopulation[0]];

    // keep picking random individuals from the population and randomly trying to pick a number lower than their softmax score
    // fitter individuals will have slightly better chance of being picked to reproduce (with chance of mutation)
    while (newPopulation.length < populationSize) {
        const idx = Math.floor(Math.random() * populationSize);
        if (Math.random() < normScores[idx]) {
            newPopulation.push(new Individual({ parent: population[idx] }));
        }
    }

    // replace the old population with the new one
    population = newPopulation;

    // see if the score improved
    if (scoredPopulation[0].score > bestScore) {
        bestScore = scoredPopulation[0].score;
        printScore(scoredPopulation[0], g);
    }

    // if running in browser with canvas, draw the tedious descent of fitness score from mediocre to slightly less mediocre
    // until the computer goes to sleep or locks and it just stops trying until you turn it back on again the next morning
    if (!nodeMode) {
        const end = {
            x: map(g, 0, generations, 0, fitness.width),
            y: map(scoredPopulation[0].score, 0, -0.04, fitness.height, 0)
        }
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        requestAnimationFrame(evolve);  // if running browser then request the next animation frame
    }

}


// print out the score and current parameter set for this individual
function printScore(individual, generation) {
    console.log(`Gen ${generation}: ${individual.score} - ${individual.toString()}`);
}


// get the drawing decoder for this individual's set of parameters and decode the circle drawing with it
// then check the circularity of the output
function getScore(individual) {

    const decoder = individual.getDecoder();
    for (let i = 0; i < balls1.length; i += skipFrames) {   // skip some frames to make it go quicker
        const balls = balls1[i];
        decoder.decode(balls.contours);
    }

    return -checkCircle(decoder.collector);     // score is negated because smaller error should mean better score

}