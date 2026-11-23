export function printState(seconds){
 const layer=(seconds%72)/72, height=.07+.26*layer;
 const a=seconds*4.5, radius=.11+.025*Math.sin(height/.4*Math.PI*2);
 return {height,x:radius*Math.sin(a),z:-radius*Math.cos(a),rockX:.0035*Math.sin(seconds*14)+.0015*Math.sin(seconds*23),rockZ:.0045*Math.sin(seconds*11.5),shiftX:.002*Math.sin(seconds*17)};
}
