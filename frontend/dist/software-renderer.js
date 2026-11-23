import * as T from 'three';
// Portable CPU renderer. Used only when a browser cannot create a WebGL context.
// A depth buffer keeps the same scene and object interactions available without a GPU.
export class SoftwareRenderer{
constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d',{alpha:false});this.shadowMap={};this.textures=new WeakMap();this.color=new T.Color();this.vp=new T.Matrix4();this.width=1;this.height=1;this.last=0;}
setDynamicRoots(...roots) {
  this.dynamicMeshes = new Set();
  for (const root of roots) root.traverse(object => {
    if (object.isMesh) this.dynamicMeshes.add(object);
  });
  this.invalidate();
}
invalidate(){this.staticPixels=null;this.staticDepth=null;}
setPixelRatio(){}
setSize(w,h){const sc=Math.min(1,1000/w,800/h);this.width=Math.max(1,Math.round(w*sc));this.height=Math.max(1,Math.round(h*sc));this.domElement.width=this.width;this.domElement.height=this.height;this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';this.frame=this.ctx.createImageData(this.width,this.height);this.zbuf=new Float32Array(this.width*this.height);this.invalidate();}
getTexture(tex){if(!tex?.image?.getContext)return null;let cache=this.textures.get(tex);if(cache?.version!==tex.version){const im=tex.image;cache={version:tex.version,data:im.getContext('2d').getImageData(0,0,im.width,im.height).data,w:im.width,h:im.height,repeat:tex.repeat};this.textures.set(tex,cache);}return cache;}
render(scene,camera){if(!this.frame)return;if(this.dynamicMeshes&&!this.staticPixels){this.staticPass=true;this.renderPass(scene,camera);this.staticPixels=this.frame.data.slice();this.staticDepth=this.zbuf.slice();this.staticPass=false;}this.renderPass(scene,camera);}
renderPass(scene,camera){scene.updateMatrixWorld();camera.updateMatrixWorld();this.vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const w=this.width,h=this.height,buf=this.frame.data,zbuf=this.zbuf;const restore=this.dynamicMeshes&&!this.staticPass&&this.staticPixels;if(restore){buf.set(this.staticPixels);zbuf.set(this.staticDepth);}else zbuf.fill(Infinity);const bg=scene.background?.isColor?scene.background:new T.Color('#d5d9cb');const gamma=v=>Math.min(255,Math.max(0,Math.round(255*Math.pow(Math.min(1,v),1/2.2))));const br=gamma(bg.r),bgc=gamma(bg.g),bb=gamma(bg.b);if(!restore)for(let i=0;i<buf.length;i+=4){buf[i]=br;buf[i+1]=bgc;buf[i+2]=bb;buf[i+3]=255;}
const keyLight=this.dynamicMeshes && scene.children.find(object=>object.isDirectionalLight);
const fillLight=this.dynamicMeshes && scene.children.find(object=>object.isHemisphereLight);
const dir=keyLight
  ? keyLight.getWorldPosition(new T.Vector3()).sub(keyLight.target.getWorldPosition(new T.Vector3())).normalize()
  : new T.Vector3(-3,8,4).normalize();
const viewDir=new T.Vector3(),normalM=new T.Matrix3(),mvp=new T.Matrix4(),worldV=new T.Vector3(),norm=new T.Vector3();
const toPoint = new T.Vector3(), meshes = [], points = [];
scene.traverseVisible(object => {
  if (keyLight && (object.isPointLight || object.isSpotLight) && object.intensity > .5 && object.distance > 0) {
    const position = object.getWorldPosition(new T.Vector3());
    const axis = object.isSpotLight
      ? position.clone().sub(object.target.getWorldPosition(new T.Vector3())).normalize()
      : null;
    points.push({
      position, axis, color: object.color,
      outer: Math.cos(object.angle), inner: Math.cos(object.angle * (1 - object.penumbra)),
      strength: object.intensity * (axis ? .16 : .24), radiusSquared: object.distance ** 2,
    });
  }
  if (!object.isMesh || object.material?.opacity === 0) return;
  const dynamic = this.dynamicMeshes?.has(object);
  if (this.dynamicMeshes && (this.staticPass ? dynamic : !dynamic)) return;
  meshes.push(object);
});
const ambientLevel=fillLight ? fillLight.intensity * .27 : .42;
const directLevel=keyLight ? keyLight.intensity*.24 : .65;
meshes.sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent));
for (const obj of meshes) {
const geo=obj.geometry,mat=Array.isArray(obj.material)?obj.material[0]:obj.material;
if(!geo?.attributes.position||!mat)continue;
const pos=geo.attributes.position,norms=geo.attributes.normal,uv=geo.attributes.uv,idx=geo.index?.array;
const count=idx?idx.length:pos.count, localLights = !mat.isMeshBasicMaterial && points.length;
normalM.getNormalMatrix(obj.matrixWorld);
mvp.multiplyMatrices(this.vp,obj.matrixWorld);
const e=mvp.elements,vertices=new Array(pos.count);
for (let i=0;i<pos.count;i++) {
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const inv=1/(e[3]*x+e[7]*y+e[11]*z+e[15]);
  norm.set(norms?.getX(i)||0,norms?.getY(i)||0,norms?.getZ(i)||0).applyNormalMatrix(normalM);
  worldV.set(x,y,z).applyMatrix4(obj.matrixWorld);
  let r=0,g=0,b=0;
  if (localLights) for (const point of points) {
    toPoint.copy(point.position).sub(worldV);
    const squared = toPoint.lengthSq();
    if (squared >= point.radiusSquared || squared < 1e-6) continue;
    const distance = Math.sqrt(squared);
    const facing = Math.max(0, norm.dot(toPoint) / distance);
    const cone = point.axis ? T.MathUtils.smoothstep(point.axis.dot(toPoint) / distance, point.outer, point.inner) : 1;
    const falloff = (1 - squared / point.radiusSquared) ** 2;
    const amount = point.strength * facing * cone * falloff / (1 + squared);
    r += point.color.r * amount;
    g += point.color.g * amount;
    b += point.color.b * amount;
  }
  vertices[i]=[(e[0]*x+e[4]*y+e[8]*z+e[12])*inv*w/2+w/2,-(e[1]*x+e[5]*y+e[9]*z+e[13])*inv*h/2+h/2,
    (e[2]*x+e[6]*y+e[10]*z+e[14])*inv,inv,uv?.getX(i)||0,uv?.getY(i)||0,norm.x,norm.y,norm.z,
    worldV.x,worldV.y,worldV.z,r,g,b];
}
const tex=this.getTexture(mat.map),col=mat.color||this.color.set('#fff'),em=mat.emissive;for(let t=0;t<count;t+=3){const a=vertices[idx?idx[t]:t],b=vertices[idx?idx[t+1]:t+1],c=vertices[idx?idx[t+2]:t+2];if(a[3]<=0||b[3]<=0||c[3]<=0||Math.min(a[2],b[2],c[2])>1||Math.max(a[2],b[2],c[2])<-1)continue;const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<.02||(mat.side!==T.DoubleSide&&area>0))continue;const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(w-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(h-1,Math.ceil(Math.max(a[1],b[1],c[1])));if(x0>x1||y0>y1)continue;norm.set(a[6]+b[6]+c[6],a[7]+b[7]+c[7],a[8]+b[8]+c[8]).normalize();const diffuse=Math.max(0,norm.dot(dir));const light=mat.isMeshBasicMaterial?1:ambientLevel+directLevel*diffuse+Math.max(0,norm.y)*.08;
let sr=col.r*light,sg=col.g*light,sb=col.b*light;
if (mat.metalness > .3) {
  worldV.set((a[9]+b[9]+c[9])/3,(a[10]+b[10]+c[10])/3,(a[11]+b[11]+c[11])/3);
  viewDir.copy(camera.position).sub(worldV).normalize().add(dir).normalize();
  const spec=Math.pow(Math.max(0,norm.dot(viewDir)),12)*(keyLight?.25:.6);
  sr+=spec;sg+=spec;sb+=spec*.86;
}
if(em){const intens=mat.emissiveIntensity??1;sr+=em.r*intens;sg+=em.g*intens;sb+=em.b*intens;}
const cr=gamma(sr),cg=gamma(sg),cb=gamma(sb),opacity=mat.opacity;
const lit = a[12] > 0 || b[12] > 0 || c[12] > 0;
const lightColors = lit ? [a, b, c].map(v => [gamma(sr+col.r*v[12]), gamma(sg+col.g*v[13]), gamma(sb+col.b*v[14])]) : null;
const invArea=1/area;for(let y=y0;y<=y1;y++){for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5;const wa=((b[0]-px)*(c[1]-py)-(b[1]-py)*(c[0]-px))*invArea,wb=((c[0]-px)*(a[1]-py)-(c[1]-py)*(a[0]-px))*invArea,wc=1-wa-wb;if(wa<-.0001||wb<-.0001||wc<-.0001)continue;const depth=wa*a[2]+wb*b[2]+wc*c[2],at=y*w+x;if(depth>=zbuf[at])continue;const off=at*4;let r=cr,g=cg,bl=cb,alpha=opacity;
if (lightColors) {
  const [ca, cb, cc] = lightColors;
  r = wa * ca[0] + wb * cb[0] + wc * cc[0];
  g = wa * ca[1] + wb * cb[1] + wc * cc[1];
  bl = wa * ca[2] + wb * cb[2] + wc * cc[2];
}
if(tex){
  const invW=wa*a[3]+wb*b[3]+wc*c[3];
  const u=(wa*a[4]*a[3]+wb*b[4]*b[3]+wc*c[4]*c[3])/invW*tex.repeat.x;
  const v=(wa*a[5]*a[3]+wb*b[5]*b[3]+wc*c[5]*c[3])/invW*tex.repeat.y;
  const tx=Math.min(tex.w-1,Math.floor(((u%1+1)%1)*tex.w));
  const ty=Math.min(tex.h-1,Math.floor((1-((v%1+1)%1))*tex.h));
  const ti=(ty*tex.w+tx)*4;
  r=tex.data[ti]*r/255;
  g=tex.data[ti+1]*g/255;
  bl=tex.data[ti+2]*bl/255;
  if(mat.transparent)alpha*=tex.data[ti+3]/255;
}
if(alpha>0&&alpha<1){buf[off]=buf[off]*(1-alpha)+r*alpha;buf[off+1]=buf[off+1]*(1-alpha)+g*alpha;buf[off+2]=buf[off+2]*(1-alpha)+bl*alpha;}else if(alpha>=1){buf[off]=r;buf[off+1]=g;buf[off+2]=bl;}if(alpha>0&&mat.depthWrite!==false)zbuf[at]=depth;
}}}
}this.ctx.putImageData(this.frame,0,0);
}
}
