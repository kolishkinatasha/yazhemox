import * as T from 'three';
import { SoftwareRenderer } from './software-renderer.js';
import { loadProduct, createProduct } from './product-models.js';
import { buildShelf } from './shelf-preview.js';

const products = new Set(['table','lamp','pendant','pencil-holder']);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function createExhibitViewer(host, hint, { texturePreview = false } = {}) {
  let renderer, scene, camera, pivot, exhibits, kind, dimensions, model, ticket=0;
  let resizeObserver, environment;
  const events=new AbortController();
  let enabled=false, software=false, frame=0, renderedAt=0, zoom=1, drag=null;
  const guide = 'Потяните для вращения · стрелки на клавиатуре';

  function render() {
    if (!enabled || !renderer || !host.clientWidth || !host.clientHeight) return;
    const aspect=host.clientWidth/host.clientHeight;
    camera.aspect=aspect;
    const distance=3.6/Math.min(1,aspect)/zoom;
    camera.position.set(0,.12*distance,distance);
    camera.lookAt(0,0,0);
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    if (texturePreview) host.dispatchEvent(new Event('surface-render', { bubbles: true }));
  }
  function resize() {
    if (!enabled || !renderer || !host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth,host.clientHeight);
    render();
  }
  function rotate(dx,dy) {
    pivot.rotation.y+=dx;
    pivot.rotation.x=T.MathUtils.clamp(pivot.rotation.x+dy,-1.35,1.35);
    render();
  }
  function magnify(amount) {
    zoom=T.MathUtils.clamp(zoom*amount,.60,1.85);
    render();
  }
  function reset() {
    if (!pivot) return;
    pivot.rotation.set(.08,kind==='generator'?-.55:-.28,0);
    zoom=1;
    render();
  }
  function schedule() {
    cancelAnimationFrame(frame);
    if (!enabled || !model || texturePreview || reduceMotion.matches || document.hidden) return;
    renderedAt=performance.now();
    function tick(time) {
      if (!enabled || document.hidden || reduceMotion.matches) return;
      if (!drag && time-renderedAt>(software?160:40)) {
        pivot.rotation.y+=Math.min(time-renderedAt,200)*.00014;
        renderedAt=time;
        render();
      }
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
  }
  function init() {
    if(renderer) return;
    if (texturePreview) {
      renderer=new SoftwareRenderer(); software=true;
    } else {
      try { renderer=new T.WebGLRenderer({antialias:true,alpha:true}); }
      catch { renderer=new SoftwareRenderer(); software=true; }
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    scene=new T.Scene();
    if (!software) {
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.2;
      const studio=new T.Scene();
      studio.background=new T.Color('#b9beae');
      const panels=[[3,1,1],[-2,4,3],[0,1,-4]];
      for(const pos of panels) {
        const panel=new T.Mesh(new T.PlaneGeometry(3,5),new T.MeshBasicMaterial({color:'#fff8ec'}));
        panel.position.set(...pos); panel.lookAt(0,0,0); studio.add(panel);
      }
      const pmrem=new T.PMREMGenerator(renderer);
      environment=pmrem.fromScene(studio,.06);
      scene.environment=environment.texture;
      pmrem.dispose();
      for(const panel of studio.children) {panel.geometry.dispose(); panel.material.dispose();}
    } else scene.background=new T.Color(texturePreview ? '#203949' : '#dce0d5');
    camera=new T.PerspectiveCamera(37,1,.05,50);
    scene.add(new T.HemisphereLight('#fff3dd','#667666',2.6));
    const light=new T.DirectionalLight('#fff5de',3.4); light.position.set(-2,3,4); scene.add(light);
    const rim=new T.DirectionalLight('#d5e8ff',2.2); rim.position.set(3,2,-2); scene.add(rim);
    pivot=new T.Group(); scene.add(pivot);
    const canvas=renderer.domElement;
    host.append(canvas);
    canvas.addEventListener('pointerdown',e=>{
      if(drag || e.button!==0) return;
      drag={x:e.clientX,y:e.clientY,id:e.pointerId};
      canvas.setPointerCapture(e.pointerId);
    },{signal:events.signal});
    canvas.addEventListener('pointermove',e=>{
      if(drag?.id!==e.pointerId) return;
      rotate((e.clientX-drag.x)*.012,(e.clientY-drag.y)*.009);
      drag.x=e.clientX; drag.y=e.clientY;
    },{signal:events.signal});
    canvas.addEventListener('lostpointercapture',()=>{drag=null;},{signal:events.signal});
    canvas.addEventListener('wheel',e=>{e.preventDefault();magnify(Math.exp(-e.deltaY*.0015));},{passive:false,signal:events.signal});
    host.addEventListener('keydown',e=>{
      const delta={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.13],ArrowDown:[0,.13]}[e.key];
      if(delta){e.preventDefault();rotate(...delta);}
    },{signal:events.signal});
    resizeObserver=new ResizeObserver(resize);
    resizeObserver.observe(host);
  }
  function clear() {
    if (!model) return;
    pivot.remove(model);
    if(model.userData.generated) model.traverse(o=>o.geometry?.dispose());
    model=null;
  }
  function mount(object,generated=false) {
    clear();
    const bounds=new T.Box3().setFromObject(object);
    const sphere=bounds.getBoundingSphere(new T.Sphere());
    object.position.sub(sphere.center);
    model=new T.Group();
    model.add(object);
    model.userData.generated=generated;
    model.scale.setScalar(.98/Math.max(.001,sphere.radius));
    pivot.add(model);
    hint.textContent=guide;
    resize(); schedule();
  }
  function exhibit() {
    const original=exhibits?.[kind];
    if(!original) {hint.textContent='Загрузка экспоната…';return;}
    const clone=original.clone(true);
    clone.position.set(0,0,0); clone.scale.setScalar(1);
    clone.rotation.set(kind==='contacts'?.94:0,0,0);
    mount(clone);
  }
  async function show(nextKind, nextDimensions) {
    const request=++ticket;
    const changed = nextKind!==kind || !enabled;
    enabled=true; kind=nextKind; dimensions=nextDimensions;
    try {
      init();
      if(changed) {clear(); reset(); resize();}
      if(kind==='generator') {mount(buildShelf(dimensions),true);return;}
      if(!products.has(kind)) {exhibit();return;}
      const product=kind;
      hint.textContent='Загрузка модели…';
      await loadProduct(product,'room');
      if(request!==ticket) return;
      mount(createProduct(product,1,{center:true}));
      if(product!=='pencil-holder' && !software) {
        await loadProduct(product,'detail');
        if(request===ticket) mount(createProduct(product,1,{detail:true,center:true}));
      }
    } catch(error) {
      if(request!==ticket) return;
      hint.textContent=model?guide:'Не удалось открыть 3D-модель';
      console.warn('Просмотр модели:',error);
    }
  }
  function hide() {
    enabled=false; ticket++; drag=null;
    cancelAnimationFrame(frame);
    clear();
  }
  function destroy() {
    hide();
    events.abort();
    resizeObserver?.disconnect();
    environment?.dispose();
    renderer?.dispose?.();
    renderer?.domElement.remove();
  }
  reduceMotion.addEventListener('change',schedule,{signal:events.signal});
  document.addEventListener('visibilitychange',schedule,{signal:events.signal});
  return {show, destroy, reset, magnify, setExhibits(value){
    exhibits=value;
    if(enabled && kind!=='generator' && !products.has(kind)) {
      if(exhibits) exhibit();
      else hint.textContent='Не удалось загрузить экспонат мастерской';
    }
  }};
}

