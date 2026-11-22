/** A word part with a meaning a child can spot across words. Maths ones first; they turn up in class. */
export type WordPart = { part: string; meaning: string; examples: readonly [string, string, string] };

export const WORD_PARTS: readonly WordPart[] = [
  { part: "tri", meaning: "three", examples: ["TRIangle", "TRIcycle", "TRIo"] },
  { part: "bi", meaning: "two", examples: ["BIcycle", "BInoculars", "BIlingual"] },
  { part: "uni", meaning: "one", examples: ["UNIcorn", "UNIcycle", "UNIform"] },
  { part: "quad", meaning: "four", examples: ["QUADrilateral", "QUAD bike", "QUADruple"] },
  { part: "pent", meaning: "five", examples: ["PENTagon", "PENTathlon", "PENTagram"] },
  { part: "hex", meaning: "six", examples: ["HEXagon", "HEXapod", "HEXagonal"] },
  { part: "oct", meaning: "eight", examples: ["OCTopus", "OCTagon", "OCTave"] },
  { part: "dec", meaning: "ten", examples: ["DECade", "DECimal", "DECathlon"] },
  { part: "cent", meaning: "a hundred", examples: ["CENTury", "CENTimetre", "perCENT"] },
  { part: "kilo", meaning: "a thousand", examples: ["KILOmetre", "KILOgram", "KILOwatt"] },
  { part: "multi", meaning: "many", examples: ["MULTIply", "MULTIcoloured", "MULTIplayer"] },
  { part: "semi", meaning: "half", examples: ["SEMIcircle", "SEMI-final", "SEMIcolon"] },
  { part: "equ", meaning: "the same", examples: ["EQUal", "EQUator", "EQUation"] },
  { part: "sub", meaning: "under", examples: ["SUBtract", "SUBmarine", "SUBway"] },
  { part: "meter", meaning: "measure", examples: ["thermoMETER", "speedoMETER", "periMETER"] },
  { part: "poly", meaning: "many", examples: ["POLYgon", "POLYhedron", "POLYglot"] },
  { part: "circ", meaning: "round", examples: ["CIRCle", "CIRCus", "CIRCuit"] },
  { part: "graph", meaning: "write or draw", examples: ["GRAPH", "autoGRAPH", "paraGRAPH"] },
  { part: "re", meaning: "again", examples: ["REpeat", "REbuild", "REplay"] },
  { part: "un", meaning: "not", examples: ["UNequal", "UNhappy", "UNlock"] },
  { part: "pre", meaning: "before", examples: ["PREdict", "PREview", "PREhistoric"] },
  { part: "tele", meaning: "far away", examples: ["TELEscope", "TELEphone", "TELEvision"] },
  { part: "micro", meaning: "tiny", examples: ["MICROscope", "MICROchip", "MICROphone"] },
  { part: "aqua", meaning: "water", examples: ["AQUArium", "AQUAtic", "AQUAmarine"] },
];
