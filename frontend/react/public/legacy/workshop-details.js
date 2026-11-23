import { catalogue, tables, email, telegram } from './workshop-catalog.js';
import { photos } from './workshop-photos.js';
import { research } from './workshop-research.js';
import { shelfDefaults, shelfFields } from './shelf-preview.js';
import { createExhibitViewer } from './exhibit-viewer.js';

const illustrations=[
  {src:'media/research/mesh-before.webp',caption:'Сетка для расчёта эксперимента',alt:'Конечно-элементная сетка испытательной камеры из автореферата, рисунок 7'},
  {src:'media/research/mesh-after.webp',caption:'После двенадцатого этапа нагнетания',alt:'Деформированная конечно-элементная сетка из автореферата, рисунок 9'},
];
const $=s=>document.querySelector(s);
function element(tag, className, text) {
  const node=document.createElement(tag);
  if(className) node.className=className;
  if(text) node.textContent=text;
  return node;
}
function links(entries) {
  const list=element('div','resource-list');
  for(const entry of entries) {
    const link=element('a','resource');
    link.href=entry.href;
    if(entry.download) link.download='';
    else if(/^(https:|media\/)/.test(entry.href)){link.target='_blank';link.rel='noopener';}
    const label=element('span');
    label.append(element('strong','',entry.title));
    if(entry.meta) label.append(element('small','',entry.meta));
    link.append(label);
    list.append(link);
  }
  return list;
}
function orderBox(price,lead,subject,button='Обсудить заказ') {
  const box=element('div','order-box');
  const terms=element('div','order-terms');
  if(price) terms.append(element('small','','Стоимость'),element('strong','',price));
  if(lead) terms.append(element('span','',lead));
  const actions=element('div','order-actions');
  const chat=element('a','order-primary',button);
  chat.href=telegram+'?text='+encodeURIComponent('Здравствуйте, Иван! Меня интересует '+subject+'.');
  chat.target='_blank'; chat.rel='noopener';
  const mail=element('a','order-mail','По почте');
  mail.href='mailto:'+email+'?subject='+encodeURIComponent('ЯЖЕМОХ · '+subject)+'&body='+encodeURIComponent('Здравствуйте, Иван! Меня интересует '+subject+'.');
  actions.append(chat,mail);
  box.append(terms,actions);
  return box;
}

export function createWorkshopDetails(onChange) {
  const dialog=$('#detail'), body=$('#entry-body'), canvas=$('#exhibit-canvas');
  const viewer=createExhibitViewer(canvas,$('#exhibit-hint'));
  const menu=$('#catalog-menu'), browse=$('#browse');
  let current, album=[], photoIndex=0, mode, returnFocus;
  let config, variant=0, selectTable;
  function setMenu(open) {
    menu.hidden=!open; browse.setAttribute('aria-expanded',String(open));
  }
  for(const [id,d] of Object.entries(catalogue)) {
    const button=element('button','',d.title); button.type='button';
    button.dataset.open=id; menu.append(button);
  }
  browse.onclick=()=>{setMenu(menu.hidden);if(!menu.hidden)menu.querySelector('button').focus();};
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-open]');
    if(trigger) open(trigger.dataset.open);
    else if(!menu.contains(e.target) && !browse.contains(e.target))setMenu(false);
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !menu.hidden){e.stopImmediatePropagation();setMenu(false);browse.focus();}
  },true);

  const image=$('#album-image'), albumView=$('#album'), large=$('#photo-lightbox');
  function fitPrint() {
    if(image.naturalWidth) albumView.style.setProperty('--ratio',image.naturalWidth/image.naturalHeight);
  }
  image.addEventListener('load',fitPrint);
  let touchStart;
  albumView.addEventListener('touchstart',e=>{
    touchStart=e.touches.length===1?e.touches[0]:null;
  },{passive:true});
  albumView.addEventListener('touchend',e=>{
    if(!touchStart || !album.length)return;
    const dx=e.changedTouches[0].clientX-touchStart.clientX;
    const dy=e.changedTouches[0].clientY-touchStart.clientY;
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.5)showPhoto(photoIndex+(dx<0?1:-1));
    touchStart=null;
  },{passive:true});
  albumView.addEventListener('touchcancel',()=>{touchStart=null;});
  function syncLarge() {
    const photo=album[photoIndex];
    $('#large-photo').src=photo.src;$('#large-photo').alt=photo.alt;
    $('#large-caption').textContent=photo.caption;
    $('#large-position').textContent=(photoIndex+1)+' / '+album.length;
  }
  $('#enlarge-photo').onclick=()=>{syncLarge();large.showModal();};
  $('#shrink-photo').onclick=()=>large.close();
  $('#large-prev').onclick=()=>showPhoto(photoIndex-1);
  $('#large-next').onclick=()=>showPhoto(photoIndex+1);
  large.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft' || e.key==='ArrowRight'){e.preventDefault();showPhoto(photoIndex+(e.key==='ArrowLeft'?-1:1));}
  });
  function showPhoto(index) {
    photoIndex=(index+album.length)%album.length;
    if(current==='portfolio') {
      const table=tables.findIndex(t=>t.photo===photoIndex);
      if(table>=0 && table!==variant) selectTable(table);
    }
    if(large.open)syncLarge();
    const photo=album[photoIndex];
    image.src=photo.src;
    image.alt=photo.alt;
    if(image.complete)fitPrint();
    $('#album-caption').textContent=photo.caption;
    $('#album-position').textContent=(current==='engineering'?'Иллюстрация ':'Снимок ')+(photoIndex+1)+' из '+album.length;
    $('#album').style.setProperty('--tilt',[-2.8,2,-1.4,2.6][photoIndex%4]+'deg');
  }
  function view(choice) {
    mode=choice;
    const isPhoto=choice==='photo';
    $('#see-photos').hidden=!album.length;
    $('#see-photos').setAttribute('aria-pressed',String(isPhoto));
    $('#see-model').setAttribute('aria-pressed',String(!isPhoto));
    $('#album').hidden=!isPhoto;
    canvas.hidden=isPhoto;
    $('#album-controls').hidden=!isPhoto;
    $('#model-controls').hidden=isPhoto;
    if(isPhoto){viewer.hide();showPhoto(photoIndex);}
    else viewer.show(catalogue[current].model,config);
  }
  $('#see-photos').onclick=()=>view('photo');
  $('#see-model').onclick=()=>view('model');
  $('#prev-photo').onclick=()=>showPhoto(photoIndex-1);
  $('#next-photo').onclick=()=>showPhoto(photoIndex+1);
  $('#zoom-out').onclick=()=>viewer.magnify(.88);
  $('#zoom-in').onclick=()=>viewer.magnify(1.14);
  $('#model-reset').onclick=viewer.reset;
  dialog.addEventListener('keydown',e=>{
    if(mode!=='photo' || !album.length || e.target.matches('input,select')) return;
    if(e.key==='ArrowLeft' || e.key==='ArrowRight'){
      e.preventDefault();showPhoto(photoIndex+(e.key==='ArrowRight'?1:-1));
    }
  });

  function furniture() {
    const section=element('section','variant-picker');
    const label=element('label','','Вариант стола');label.htmlFor='table-variant';
    const select=element('select');select.id='table-variant';
    tables.forEach((t,i)=>select.add(new Option(t.name+' · '+t.color,String(i))));
    const size=element('p','variant-size'), order=element('div');
    function update(syncPhoto) {
      const t=tables[variant];
      size.textContent=t.size;
      order.replaceChildren(orderBox(t.price,'Изготовление за 3 недели','стол Hyperline '+t.name,'Заказать '+t.name));
      if(syncPhoto && album.length){photoIndex=t.photo;view('photo');}
    }
    selectTable=(index,syncPhoto=false)=>{variant=index;select.value=String(index);update(syncPhoto);};
    select.onchange=()=>selectTable(Number(select.value),true);
    section.append(label,select,size,order);
    update(false);
    return section;
  }
  function generator() {
    const section=element('section','configurator');
    section.append(element('h3','','Размеры эскиза'));
    const contact=element('div');
    function request() {
      const {width,height,depth,count}=config;
      contact.replaceChildren(orderBox('','','раскрой этажерки '+width+' × '+height+' × '+depth+' мм, полок — '+count,'Обсудить раскрой'));
    }
    for(const field of shelfFields) {
      const row=element('div','config-field');
      const label=element('label','',field.title);
      const input=element('input');input.type='range';input.id='config-'+field.key;
      label.htmlFor=input.id;
      const output=element('output');output.htmlFor=input.id;
      const display=()=>{output.value=config[field.key]+(field.key==='count'?'':' мм');};
      Object.assign(input,{min:field.min,max:field.max,step:field.step,value:config[field.key]});
      input.oninput=()=>{
        config[field.key]=Number(input.value);display();
        view('model');request();
      };
      display();row.append(label,output,input);section.append(row);
    }
    request();section.append(contact);
    return section;
  }
  function renderBody(d) {
    body.replaceChildren();
    if(current==='portfolio')body.append(furniture());
    if(d.order)body.append(orderBox(d.price,d.lead,d.order));
    if(current==='generator') body.append(generator());
    if(current==='contacts' || current==='printer') body.append(links(d.links));
    if(current==='engineering') {
      const work=element('section','entry-section');
      work.append(element('h3','','Диссертация и автореферат'),links(research.documents));
      body.append(work);
      const pubs=element('details','publications');
      pubs.append(element('summary','','Избранные публикации ('+research.publications.length+')'),links(research.publications));
      body.append(pubs);
    }
    for(const item of d.sections || []) {
      const section=element('section','entry-section');
      section.append(element('h3','',item.title),element('p','',item.text));body.append(section);
    }
    if(d.specs) {
      const dl=element('dl','object-specs');
      for(const [key,value] of d.specs){dl.append(element('dt','',key),element('dd','',value));}
      body.append(dl);
    }
    if(d.links && current!=='contacts' && current!=='printer') body.append(links(d.links));
  }
  function open(id,writeHash=true) {
    if(!Object.hasOwn(catalogue,id))return;
    if(!dialog.open) returnFocus=menu.contains(document.activeElement)?browse:document.activeElement;
    setMenu(false);
    if(large.open)large.close();
    viewer.hide();
    current=id; onChange(id);
    const d=catalogue[id];
    album=id==='engineering'?illustrations:photos[d.album]||[];
    photoIndex=0;variant=0;config={...shelfDefaults};
    $('#detail-kicker').textContent=d.category;
    $('#detail-title').textContent=d.title;
    $('#detail-intro').textContent=d.intro;
    $('#exhibit-name').textContent=d.modelLabel;
    $('#see-photos').textContent=id==='engineering'?'Иллюстрации':'Фотографии';
    canvas.setAttribute('aria-label','Вращаемая модель. '+d.modelLabel);
    dialog.dataset.entry=id;
    renderBody(d);
    if(!dialog.open)dialog.showModal();
    window.parent?.postMessage({ type: 'yazhemoh:exhibit-open', id, entry: d, photos: album }, '*');
    $('#close').focus({preventScroll:true});
    view(album.length && id!=='generator'?'photo':'model');
    $('.entry-copy').scrollTop=0; dialog.scrollTop=0;
    if(writeHash && location.hash!=='#'+id)history.pushState(null,'','#'+id);
  }
  function close(writeHash=true) {
    if(!dialog.open)return;
    if(large.open)large.close();
    viewer.hide();current=null;onChange(null);dialog.close();
    window.dispatchEvent(new CustomEvent('yazhemoh:exhibit-closed'));
    if(writeHash)history.replaceState(null,'',location.pathname+location.search);
    returnFocus?.focus({preventScroll:true});
  }
  $('#close').onclick=()=>close();
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();
  });
  function route(){
    const id=location.hash.slice(1);
    if(Object.hasOwn(catalogue,id)) open(id,false);else close(false);
  }
  window.addEventListener('hashchange',route);
  window.addEventListener('message',event=>{
    if(event.data?.type==='yazhemoh:exhibit-close') close();
  });
  return {open,route,setExhibits:viewer.setExhibits};
}

