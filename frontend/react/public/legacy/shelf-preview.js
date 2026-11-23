import * as T from 'three';

export const shelfFields = [
  {key:'width', title:'Ширина', min:400, max:1200, step:20, value:760},
  {key:'height', title:'Высота', min:600, max:1800, step:20, value:1200},
  {key:'depth', title:'Глубина', min:200, max:500, step:10, value:320},
  {key:'count', title:'Число полок', min:2, max:6, step:1, value:4},
];
export const shelfDefaults = Object.fromEntries(shelfFields.map(f => [f.key, f.value]));

const face = new T.MeshStandardMaterial({color:'#cfaa75',roughness:.78});
const edge = new T.MeshStandardMaterial({color:'#a17a4f',roughness:.92});

function outline(points, path = new T.Shape()) {
  path.moveTo(...points[0]);
  for (const point of points.slice(1)) path.lineTo(...point);
  path.closePath();
  return path;
}
function panel(shape, thickness) {
  return new T.Mesh(new T.ExtrudeGeometry(shape, {depth:thickness,bevelEnabled:false}), [face,edge]);
}

export function buildShelf({width, height, depth, count}) {
  const assembly = new T.Group();
  const w=width/1000, h=height/1000, d=depth/1000, t=.018;
  const levels=Array.from({length:count}, (_,i)=>.055+i*(h-.11-t)/(count-1));
  const side=outline([[0,0],[d,0],[d,h],[0,h]]);
  // Two rectangular mortises per shelf, with matching tenons on both ends.
  const front=d*.2, back=d*.8, tooth=d*.14;
  for(const y of levels) {
    for(const z of [front,back]) side.holes.push(outline([[z,y],[z,y+t],[z+tooth,y+t],[z+tooth,y]],new T.Path()));
  }
  for (const x of [-w/2,w/2-t]) {
    const board=panel(side,t);
    board.rotation.y=Math.PI/2;
    board.position.set(x,-h/2,d/2);
    assembly.add(board);
  }
  const a=-w/2+t, b=w/2-t, tongue=t+.004;
  const blank=outline([[a,0],[b,0],[b,front],[b+tongue,front],[b+tongue,front+tooth],[b,front+tooth],
    [b,back],[b+tongue,back],[b+tongue,back+tooth],[b,back+tooth],[b,d],
    [a,d],[a,back+tooth],[a-tongue,back+tooth],[a-tongue,back],[a,back],
    [a,front+tooth],[a-tongue,front+tooth],[a-tongue,front],[a,front]]);
  for(const y of levels) {
    const shelf=panel(blank,t);
    shelf.rotation.x=-Math.PI/2;
    shelf.position.set(0,y-h/2,d/2);
    assembly.add(shelf);
  }
  return assembly;
}

