import * as T from 'three';
const cache=new Map(),pending=new Map();
const wood={color:'#bb9464',roughness:.78};
const palettes={
 polished:{color:'#bfc0b8',metalness:.94,roughness:.24},
 titanium:{color:'#464b4a',metalness:.78,roughness:.62},
 fibre:{color:'#48a9d5',emissive:'#137aa9',emissiveIntensity:.28,roughness:.42},
 housing:{color:'#656c6b',roughness:.82},
 plate:{color:'#939b99',roughness:.74},
 steel:{color:'#bbc2c2',metalness:.9,roughness:.25},
 diffuser:{color:'#f5ead1',emissive:'#ffdb99',emissiveIntensity:.65,roughness:.45},
 wood, shelfBoards:wood, shelfBack:wood, shelfUprights:wood,
 cord:{color:'#4d5351',roughness:.9},
 plywoodDark:{color:'#363636',roughness:.65},
 paracord:{color:'#af1810',roughness:.75},
 chandelierShade:{color:'#f4e9d8',emissive:'#ffd4a0',emissiveIntensity:.055,roughness:.72,side:T.DoubleSide},
 chandelierMount:{color:'#9e9384',roughness:.67},
 pencilHolderBody:{color:'#a76d49',roughness:.71,side:T.DoubleSide},
 pencilHolderBase:{color:'#c8a281',roughness:.73}
};
function material(kind,source){let key=source;
 if(kind==='lamp')key=source==='Custom'?'fibre':source==='Custom (2)'?'steel':source==='Custom (5)'?'diffuser':source==='Custom (6)'?'plate':'housing';
 if(kind==='table')key=source==='Plywood_Dark'?'plywoodDark':source==='Paracord'?'paracord':'steel';
 const m=new T.MeshStandardMaterial(palettes[key]||palettes.titanium);m.name=key;return m;
}
export async function loadProduct(kind,level='room'){
 const key=kind+'-'+level;if(cache.has(key))return cache.get(key);if(pending.has(key))return pending.get(key);
 const request=(async()=>{
  const base='/models/'+key;
  // The binary payload is gzip data. Decode it here so dev and preview servers serve identical bytes.
  const [a,b]=await Promise.all([fetch(base+'.json'),fetch(base+'.bin')]);
  if(!a.ok||!b.ok)throw new Error('Не удалось загрузить модель '+kind);
  const meta=await a.json();const raw=await new Response(b.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(raw.byteLength!==meta.byteLength)throw new Error('Повреждена модель '+kind);
  const root=new T.Group();root.name='author-'+key;root.userData={authorModel:kind,level,triangles:meta.triangles};
  for(const part of meta.parts){const n=part.vertices*3;const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.BufferAttribute(new Float32Array(raw,part.offset,n),3));
   geo.setAttribute('normal',new T.BufferAttribute(new Float32Array(raw,part.offset+n*4,n),3));
   geo.setIndex(new T.BufferAttribute(new Uint32Array(raw,part.offset+n*8,part.indices),1));geo.computeBoundingSphere();
   const mesh=new T.Mesh(geo,material(kind,part.material));mesh.name=kind+' / '+part.material;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  }
  cache.set(key,root);return root;
 })();pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
export function loadRoomModels(){return Promise.all(['pendant','lamp','table','chandelier','pencil-holder','shelf'].map(k=>loadProduct(k)));}
export function createProduct(kind,height,{detail=false,center=false}={}){
 const template=cache.get(kind+'-'+(detail?'detail':'room'))||cache.get(kind+'-room');
 if(!template)throw new Error('Модель ещё не загружена: '+kind);
 const wrapper=new T.Group();wrapper.name='product-'+kind;
 const bounds=new T.Box3().setFromObject(template),size=bounds.getSize(new T.Vector3()),middle=bounds.getCenter(new T.Vector3());
 const scale=height/size.y,object=template.clone(true);object.scale.setScalar(scale);
 object.position.set(-middle.x*scale,-(center?middle.y:bounds.min.y)*scale,-middle.z*scale);
 wrapper.add(object);return wrapper;
}
