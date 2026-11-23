import * as T from 'three';
import { printState } from './printer-motion.js';
import { roundedBoxGeometry } from './workshop-geometry.js';
import { random, texture } from './workshop-materials.js';
export function createA1(){
 const root=new T.Group();root.name='Bambu Lab A1 on vibration isolators';
 const white=new T.MeshStandardMaterial({color:'#d7dcd8',roughness:.48}),gray=new T.MeshStandardMaterial({color:'#8e9998',roughness:.38,metalness:.52}),dark=new T.MeshStandardMaterial({color:'#313b3b',roughness:.65}),rubber=new T.MeshStandardMaterial({color:'#252f2d',roughness:.93}),gold=new T.MeshStandardMaterial({color:'#b6a367',roughness:.8}),orange=new T.MeshStandardMaterial({color:'#d38d4d',roughness:.7}),yellow=new T.MeshStandardMaterial({color:'#e6ce52',roughness:.5});
 const mesh=(geo,mat,x=0,y=0,z=0,parent=root)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(w,h,d,mat,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,p);
 const rounded=(w,h,d,r,mat,x,y,z,p)=>mesh(roundedBoxGeometry(w,h,d,r,1),mat,x,y,z,p);
 const cyl=(r,h,mat,x,y,z,p,n=24)=>mesh(new T.CylinderGeometry(r,r,h,n),mat,x,y,z,p);
 const ball=(r,mat,x,y,z,p)=>mesh(new T.SphereGeometry(r,16,10),mat,x,y,z,p);
 const tube=(a,b,r,mat,p)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=cyl(r,av.distanceTo(bv),mat,0,0,0,p,8);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return m;};
 function label(text,w,h,size=26,bg='#d6ddd7',fg='#465453'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font=`${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}));}
 const body=new T.Group();body.position.y=.17;root.add(body);
 const feet=[];
 for(const x of [-.54,.54])for(const z of [-.49,.49]){
  const foot=new T.Group();foot.position.set(x,0,z);root.add(foot);
  cyl(.105,.035,white,0,.018,0,foot);cyl(.085,.027,dark,0,.047,0,foot);const b=ball(.068,rubber,0,.089,0,foot);b.scale.set(1,.85,1);feet.push(b);
  cyl(.088,.045,white,x,-.026,z,body);cyl(.105,.025,white,x,-.001,z,body);
 }
 rounded(1.31,.17,1.31,.031,white,0,.105,0,body);
 rounded(1.18,.04,1.19,.012,dark,0,.008,0,body);
 rounded(1.23,.028,1.23,.011,white,0,.205,0,body);
 const brand=label('Bambu Lab  A1',.51,.095,38);brand.position.set(-.22,.11,.659);body.add(brand);
 for(let i=0;i<7;i++)box(.15,.01,.005,dark,.45,.067+i*.016,.663,body);
 // Twin upright columns and the fixed top bridge.
 for(const x of [-.54,.54]){
  rounded(.12,1.42,.16,.018,white,x,.92,-.43,body);
  box(.049,1.29,.015,dark,x,.91,-.351,body);
  box(.028,1.28,.011,gray,x,.91,-.337,body);
  rounded(.15,.075,.2,.013,dark,x,1.66,-.43,body);
  for(const y of [.31,.72,1.13,1.53])cyl(.008,.005,dark,x,y,-.327,body,9).rotation.x=Math.PI/2;
 }
 box(1.08,.075,.13,gray,0,1.66,-.43,body);
 const gantry=new T.Group();gantry.position.set(0,.8,-.32);body.add(gantry);
 box(1.44,.095,.13,gray,0,0,0,gantry);box(1.35,.018,.025,dark,0,.014,.079,gantry);
 for(const x of [-.59,.59])rounded(.19,.19,.22,.023,white,x,0,0,gantry);
 // Front screen, tilted upward on its bracket.
 const lcd=new T.Group();lcd.position.set(.6,.25,.59);lcd.rotation.x=-.48;body.add(lcd);
 rounded(.36,.22,.045,.016,dark,0,0,0,lcd);
 const display=(printing)=>texture(384,208,(ctx,w,h)=>{
  ctx.fillStyle='#162923';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#263e35';ctx.fillRect(11,12,w-22,47);
  ctx.fillStyle='#c2ded2';ctx.font='24px monospace';ctx.fillText('A1',25,43);
  ctx.fillStyle='#7aab89';ctx.fillRect(18,170,w-36,6);
  ctx.fillStyle='#b2d2bc';ctx.fillRect(18,170,126,6);
  ctx.font='20px monospace';ctx.fillText('WORKSHOP / VASE',24,101);
  ctx.fillStyle=printing?'#a8dcb1':'#e2ca8a';
  ctx.fillText(printing?'PRINTING':'PAUSED',24,137);
 });
 const printingMap=display(true), pausedMap=display(false);
 const screen=mesh(new T.PlaneGeometry(.31,.17),new T.MeshBasicMaterial({map:pausedMap}),0,0,.026,lcd);
 screen.castShadow=false;
 rounded(.15,.16,.08,.013,gray,.6,.15,.53,body);
 const peiMap=texture(256,256,(ctx,w,h)=>{
  const sample=random(919);
  ctx.fillStyle='#ada06d';ctx.fillRect(0,0,w,h);
  for(let i=0;i<10500;i++){
   ctx.fillStyle=i%2?'#77640c21':'#fff0b731';
   ctx.fillRect(sample()*w,sample()*h,1+sample()*2,1);
  }
  ctx.strokeStyle='#e8dcaa82';ctx.strokeRect(11,11,w-22,h-22);
 });
 const pei=new T.MeshStandardMaterial({map:peiMap,bumpMap:peiMap,bumpScale:.002,roughness:.79});
 const bed=new T.Group();bed.position.y=.265;body.add(bed);
 rounded(.98,.056,.98,.013,dark,0,0,0,bed);
 box(.97,.012,.97,pei,0,.036,0,bed);
 rounded(.13,.022,.09,.008,gold,-.4,.032,.52,bed);
 const bedMark=label('BAMBU  TEXTURED PEI',.65,.04,23,'#ada06d','#5d5c46');
 bedMark.position.set(0,.044,.43);bedMark.rotation.x=-Math.PI/2;bedMark.castShadow=false;bed.add(bedMark);
 // Printed vase: the visible wall grows upwards with successive layers.
 const vase=new T.Group();vase.position.y=.045;bed.add(vase);const points=[];for(let i=0;i<=24;i++){const v=i/24;points.push(new T.Vector2(.11+.025*Math.sin(v*Math.PI*2),v*.4));}const vaseBands=[];orange.side=T.DoubleSide;for(let i=0;i<40;i++){const y0=i*.01,y1=(i+1)*.01;const radius=y=>.11+.025*Math.sin(y/.4*Math.PI*2);const band=mesh(new T.LatheGeometry([new T.Vector2(radius(y0),y0),new T.Vector2(radius(y1),y1)],24),orange,0,0,0,vase);vaseBands.push(band);}
 const layers=[];for(let i=1;i<28;i++){const y=i*.014;const r=.11+.025*Math.sin((y/.4)*Math.PI*2);const m=mesh(new T.TorusGeometry(r,.0018,4,24),gold,0,y,0,vase);m.rotation.x=Math.PI/2;layers.push(m);}
 const head=new T.Group();head.position.z=.32;gantry.add(head);rounded(.22,.29,.23,.025,white,0,.025,0,head);
 rounded(.18,.07,.17,.016,dark,0,-.14,.02,head);
 const fan=cyl(.056,.013,dark,0,.025,.125,head);fan.rotation.x=Math.PI/2;
 const hub=cyl(.019,.018,yellow,0,.025,.136,head);hub.rotation.x=Math.PI/2;
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const sl=box(.01,.036,.006,gray,Math.sin(a)*.038,.025+Math.cos(a)*.038,.139,head);sl.rotation.z=-a;}
 for(const x of [-.072,.072])for(const y of [-.052,.103]){
  cyl(.009,.005,dark,x,y,.117,head,10).rotation.x=Math.PI/2;
 }
 const nozzle=mesh(new T.ConeGeometry(.019,.055,12),gold,0,-.198,.015,head);nozzle.rotation.x=Math.PI;box(.06,.07,.08,gray,-.13,-.01,.01,head);
 // The filament spool sits on a low stand beside the left upright.
 const spoolStand=new T.Group();spoolStand.name='Filament stand';spoolStand.position.y=body.position.y;root.add(spoolStand);
 box(.26,.035,.47,dark,-.94,-.137,-.45,spoolStand);
 tube([-.99,-.12,-.45],[-.99,.26,-.45],.024,gray,spoolStand);
 tube([-.99,.26,-.45],[-.86,.26,-.45],.021,gray,spoolStand);
 const spoolAxle=new T.Group();spoolAxle.position.set(-.89,.26,-.45);spoolAxle.rotation.z=Math.PI/2;spoolStand.add(spoolAxle);
 const spool=new T.Group();spoolAxle.add(spool);
 const wound=orange.clone();wound.side=T.FrontSide;
 wound.map=texture(128,96,(ctx,w,h)=>{
  const sample=random(221);
  for(let y=0;y<h;y++){
   const value=(y%3===0?184:238)+Math.floor(sample()*12);
   ctx.fillStyle=`rgb(${value},${value},${value})`;
   ctx.fillRect(0,y,w,1);
  }
 });
 cyl(.196,.136,wound,0,0,0,spool,32);
 for(const y of [-.079,.079]){cyl(.228,.025,dark,0,y,0,spool,32);cyl(.068,.03,gray,0,y*1.15,0,spool,24);}
 const filament=[];for(let i=0;i<12;i++)filament.push(tube([0,0,0],[0,.1,0],.011,white));
 const filamentGuide=new T.Vector3(-.35,1.58,.03);
 const filamentPath=new T.CubicBezierCurve3(new T.Vector3(-.89,.64,-.46),new T.Vector3(-.94,1.75,-.51),new T.Vector3(),new T.Vector3());
 const a=new T.Vector3(),b=new T.Vector3(),up=new T.Vector3(0,1,0);
 function update(seconds,still=false){const s=printState(seconds);body.rotation.set(still?0:s.rockX,0,still?0:s.rockZ);body.position.x=still?0:s.shiftX;bed.position.z=s.z;gantry.position.y=.51+s.height;head.position.x=s.x;for(let i=0;i<vaseBands.length;i++)vaseBands[i].visible=(i+1)*.01<=s.height;for(const l of layers)l.visible=l.position.y<s.height;
  screen.material.map=still?pausedMap:printingMap;
  spool.rotation.y=seconds*.12;
  body.updateMatrix();
  filamentPath.v2.copy(filamentGuide).applyMatrix4(body.matrix);
  filamentPath.v3.set(s.x,gantry.position.y+.17,.03).applyMatrix4(body.matrix);
  for(let i=0;i<filament.length;i++){filamentPath.getPoint(i/12,a);filamentPath.getPoint((i+1)/12,b);const m=filament[i];m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b)/.1;m.quaternion.setFromUnitVectors(up,b.sub(a).normalize());}
  for(let i=0;i<feet.length;i++)feet[i].scale.y=.85+(still?0:.03*Math.sin(seconds*14+(i%2)*Math.PI));
 }
 update(15,true);return {root,update};
}
