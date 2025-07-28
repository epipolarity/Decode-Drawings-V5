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
let lastScore = getScore(adam);

const ctx = fitness.getContext("2d");

let population = [adam];

while (population.length < populationSize) {
    population.push(new Individual({ parent: adam }));
}

animate();

function animate() {

    if (g === generations) {
        console.log(getScore(population[0]));
        console.log(population[0].toString());
    };

    const scoredPopulation = population
        .map(individual => {
            individual.score = getScore(individual);
            return individual;
        })
        .sort((a, b) => a.score - b.score);

    const bestScore = scoredPopulation[0].score;

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

    ctx.beginPath();
    const start = {
        x: map(g, 0, generations, 0, fitness.width),
        y: map(lastScore, 0, 0.04, fitness.height, 0)
    }
    ctx.moveTo(start.x, start.y);

    lastScore = bestScore;
    g++;

    const end = {
        x: map(g, 0, generations, 0, fitness.width),
        y: map(lastScore, 0, 0.04, fitness.height, 0)
    }
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    requestAnimationFrame(animate);

}


function getScore(individual) {

    const decoder = individual.getDecoder();
    for (let i = 0; i < balls1.length; i += skipFrames) {
        const balls = balls1[i];
        decoder.decode(balls.contours);
    }
    return checkCircle(decoder.collector);

}