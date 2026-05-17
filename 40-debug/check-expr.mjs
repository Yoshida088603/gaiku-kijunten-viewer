import fs from "node:fs";
import { buildCircleRadiusExpression } from "../src/style/circleRadius.ts";
import { buildIconSizeExpression } from "../src/style/iconSize.ts";

const style = {
  categories: [
    { kind: "01", sizeRatio: 1 },
    { kind: "02", sizeRatio: 1.2 },
  ],
};

const cr = buildCircleRadiusExpression(style);
const is = buildIconSizeExpression(style);
console.log("circleRadius", JSON.stringify(cr).slice(0, 120));
console.log("iconSize", JSON.stringify(is).slice(0, 120));
const crStr = JSON.stringify(cr);
const bad = crStr.includes('["*",["interpolate"');
console.log("badNestedZoom", bad);
