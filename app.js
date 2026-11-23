'use strict';
const $=(s,root=document)=>root.querySelector(s);
const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const SECTIONS=['services','about','courses','books','private','institutions','contact'];
const KEYS={services:['services_title','services_description'],about:['about_title','about_text'],courses:['courses_title','courses_description'],books:['books_title','books_description'],private:['private_title','private_description'],institutions:['institutions_title','institutions_description'],contact:['contact_title','contact_description']};
const NAV=[['home','⌂','#home'],['courses','▶','#courses'],['books','▤','#books'],['private','◉','#private'],['contact','✉','#contact']];
let app=null,language='ar';
function txt(key){return app?.texts?.[language]?.[key]||app?.texts?.ar?.[key]||key}
function url(s){if(!s)return '';try{const u=new URL(s,location.href);return ['https:','http:','mailto:'].includes(u.protocol)?u.href:''}catch{return ''}}
function img(s){const u=url(s);return u&&!u.startsWith('mailto:')?u:''}
function setText(root=document){root.querySelectorAll('[data-text]').forEach(node=>node.textContent=txt(node.dataset.text))}
function heading(section){const box=E('div','section-heading');const h=E('h2','',txt(KEYS[section][0]));const p=E('p','',txt(KEYS[section][1]));box.append(h,p);return box}
function section(id,alt=false){const s=E('section','section'+(alt?' alt':''));s.id=id;s.append(heading(id));return s}
function link(name,href,cls){const a=E('a',cls,name);a.href=href;return a}
function services(s){const items=[['courses','▶','service_course_title','service_course_text'],['books','▤','service_book_title','service_book_text'],['private','◉','service_private_title','service_private_text'],['institutions','⌂','service_institution_title','service_institution_text']];const grid=E('div','cards');items.forEach(([id,icon,title,description])=>{const c=link('', '#'+id,'card');c.append(E('span','icon',icon),E('h3','',txt(title)),E('p','',txt(description)));grid.append(c)});s.append(grid)}
function about(s){
  const wrap=E('div','about-layout');
  const content=E('div');
  content.append(E('p','',txt('about_text')));
  const features=E('div','features');
  ['feature_one','feature_two','feature_three'].forEach(k=>{
    features.append(E('span','',txt(k)));
  });
  content.append(features);
  wrap.append(content);
  s.append(wrap);
}
function productDetailLabel(){return language==='ar'?'التفاصيل':language==='fr'?'Détails':'Details'}
function products(s,kind){
 const grid=E('div','products');
 (app[kind]||[]).forEach(item=>{
  const card=E('article','product'),art=E('div','product-image'),photo=img(item.image);
  if(photo){const i=E('img');i.src=photo;i.alt=item['title_'+language]||item.title||'';i.loading='lazy';art.append(i)}
  else art.textContent=kind==='books'?'📖':'📚';
  const body=E('div','product-body');
  if(item.language)body.append(E('span','pill',item.language.toUpperCase()));
  body.append(E('h3','',item['title_'+language]||item.title_ar||item.title_en||item.title||''));
  const d=item['description_'+language]||item.description_ar||item.description||'';
  if(d)body.append(E('p','',d));
  if(item.donation===true)body.append(E('p','price',txt('price')));
  const details=link(productDetailLabel(),'#item/'+kind+'/'+encodeURIComponent(item.id||''),'button blue');
  body.append(details);
  card.append(art,body);grid.append(card);
 });
 s.append(grid)
}
function renderItemRoute(){
 const match=location.hash.match(/^#item\\/(books|courses)\\/([^/?#]+)/);
 const container=$('#dynamicSections');
 if(!container)return;
 if(!match)return;
 const kind=match[1],id=decodeURIComponent(match[2]);
 const item=(app[kind]||[]).find(x=>x.id===id);
 if(!item)return;
 container.replaceChildren();
 const page=E('section','section product-detail-page');
 const back=link(language==='ar'?'العودة إلى القائمة':language==='fr'?'Retour à la liste':'Back to list','#'+kind,'detail-back');
 page.append(back);
 const layout=E('div','product-detail-layout');
 const art=E('div','product-detail-image');
 const source=img(item.image);
 if(source){const image=E('img');image.src=source;image.alt=item['title_'+language]||'';art.append(image)}
 const content=E('div','product-detail-content');
 content.append(E('h1','',item['title_'+language]||item.title_ar||item.title_en||''));
 if(item.donation===true)content.append(E('p','price',txt('price')));
 const details=item['details_'+language]||item['description_'+language]||'';
 const paragraph=E('p','product-detail-description',details);
 content.append(paragraph);
 const target=url(item.url);
 if(target){
  const label=item['button_'+language]||(language==='ar'?'فلننطلق':language==='fr'?"C'est parti":"Let's begin");
  const button=link(label,target,'button blue product-detail-cta');
  button.target='_blank';button.rel='noopener noreferrer';content.append(button);
 }
 layout.append(art,content);page.append(layout);container.append(page);
}
function field(name,type='text',required=false,wide=false){const div=E('div','form-field'+(wide?' wide':''));const id='field-'+name+'-'+Math.random().toString(36).slice(2,7);const label=E('label','',txt(name));label.htmlFor=id;const input=type==='textarea'?E('textarea'):E('input');if(type!=='textarea')input.type=type;input.id=id;input.name=name;input.required=required;div.append(label,input);return div}
function form(s,kind){const card=E('div','form-card'),f=E('form'),grid=E('div','form-grid');const names=kind==='private'?[['name','text',true],['email','email',true],['subject','text',true],['level','text',false]]:[['organization','text',true],['person','text',true],['email','email',true],['phone','tel',false]];names.forEach(([k,t,r])=>grid.append(field(k,t,r)));f.append(grid,field(kind==='private'?'details':'requirements','textarea',kind!=='private'));const button=E('button','button blue',txt('send'));button.type='submit';f.append(button);f.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(f);const body=[...data].map(([k,v])=>txt(k)+': '+v).join('\n');const email=app.settings.email;if(!email)return;location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(txt(kind+'_title'))+'&body='+encodeURIComponent(body)});card.append(f);s.append(card)}
function contact(s){
  const layout=E('div','contact-layout');
  const intro=E('div','contact-intro');
  intro.append(E('span','contact-kicker',txt('contact_kicker')));
  intro.append(E('h3','',txt('contact_heading')));
  intro.append(E('p','',txt('contact_intro')));
  const featureList=E('div','contact-points');
  for(const key of ['contact_point_one','contact_point_two','contact_point_three']){
    featureList.append(E('div','contact-point','✓  '+txt(key)));
  }
  intro.append(featureList);
  const social=E('div','contact-social');
  [['Instagram','social_instagram'],['Facebook','social_facebook'],['YouTube','social_youtube'],['TikTok','social_tiktok']].forEach(([label,key])=>{
    const target=url(app.settings[key]);
    if(target&&target.startsWith('https:')){
      const a=link(label,target,'contact-social-link');a.target='_blank';a.rel='noopener noreferrer';social.append(a);
    }
  });
  if(social.childElementCount)intro.append(social);
  const card=E('div','contact-form-card');
  card.append(E('h3','',txt('contact_form_title')));
  card.append(E('p','contact-subtitle',txt('contact_form_description')));
  const f=E('form','contact-form');
  const fields=[['contact_name','text',true],['contact_email','email',true],['contact_subject','text',true],['contact_message','textarea',true]];
  fields.forEach(([key,type,required])=>{
    const wrap=E('div','form-field');
    const label=E('label','',txt(key));
    const id='contact-'+key;
    label.htmlFor=id;
    const input=type==='textarea'?E('textarea'):E('input');
    if(type!=='textarea')input.type=type;
    input.id=id;input.name=key;input.required=required;
    if(type==='textarea')input.rows=5;
    wrap.append(label,input);f.append(wrap);
  });
  const notice=E('p','contact-notice',txt('contact_mail_notice'));
  const submit=E('button','button blue contact-submit',txt('contact_send'));
  submit.type='submit';
  f.append(notice,submit);
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const destination=app.settings.email;
    if(typeof destination!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination)){
      alert(txt('contact_mail_missing'));return;
    }
    const values=new FormData(f);
    const subject=String(values.get('contact_subject')||'');
    const body=fields.map(([key])=>txt(key)+': '+String(values.get(key)||'')).join('\n\n');
    const mail='mailto:'+destination+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    window.location.href=mail;
  });
  card.append(f);
  layout.append(intro,card);
  s.append(layout);
}
function nav(){const desktop=$('#desktopNav'),bottom=$('#bottomNav'),footer=$('#footerLinks');desktop.replaceChildren();bottom.replaceChildren();footer.replaceChildren();const all=[['home','#home'],['courses','#courses'],['books','#books'],['private','#private'],['institutions','#institutions'],['contact','#contact']];all.forEach(([key,target])=>{if(key!=='home'&&app.settings['show_'+key]===false)return;desktop.append(link(txt(key),target,''));footer.append(link(txt(key),target,''))});footer.className='footer-links';NAV.forEach(([key,icon,target])=>{if(key!=='home'&&app.settings['show_'+key]===false)return;const a=link('',target,'');a.append(E('span','',icon),E('small','',txt(key)));bottom.append(a)});const privacy=E('button','',txt('privacy'));privacy.addEventListener('click',()=>$('#privacyDialog').showModal());footer.append(privacy)}
function apply(){const settings=app.settings,root=document.documentElement;root.lang=language;root.dir=language==='ar'?'rtl':'ltr';const colors=[['color_navy','--navy'],['color_blue','--blue'],['color_orange','--orange'],['color_background','--surface']];colors.forEach(([key,variable])=>{if(/^#[0-9a-f]{6}$/i.test(settings[key]||''))root.style.setProperty(variable,settings[key])});const radius=Number(settings.corner_radius);if(Number.isFinite(radius)&&radius>=0&&radius<=70)root.style.setProperty('--radius',radius+'px');const logo=img(settings.logo);if(logo){$('#brandLogo').src=logo;$('#footerLogo').src=logo}const hero=img(settings.hero_image||settings.logo);if(hero)$('#heroImage').src=hero;document.title=(settings.brand||'My Prof')+' | '+(settings.tagline||'');setText();document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===language));nav();const container=$('#dynamicSections');container.replaceChildren();const order=[...new Set([...(Array.isArray(settings.section_order)?settings.section_order:[]),...SECTIONS])].filter(k=>SECTIONS.includes(k));order.forEach((key,index)=>{if(settings['show_'+key]===false)return;const s=section(key,index%2===0);if(key==='services')services(s);if(key==='about')about(s);if(key==='courses'||key==='books')products(s,key);if(key==='private'||key==='institutions')form(s,key);if(key==='contact')contact(s);container.append(s)});renderItemRoute();const yearNode=$('#year');if(yearNode)yearNode.textContent=new Date().getFullYear()}
async function start(){try{const r=await fetch('data/catalog.json',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);app=await r.json();language=localStorage.getItem('myprof-language')||app.settings.default_language||'ar';if(!app.texts[language])language='ar';apply()}catch(err){console.error('MyProf content could not be loaded',err);if(window.myprofLoadRetries === undefined)
window.myprofLoadRetries = 0;
if(window.myprofLoadRetries < 3){
  window.myprofLoadRetries++;
  setTimeout(start, 3000);
}}}
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{if(!app)return;language=b.dataset.lang;localStorage.setItem('myprof-language',language);apply()}));$('#closePrivacy').addEventListener('click',()=>$('#privacyDialog').close());$('#privacyDialog').addEventListener('click',e=>{if(e.target.id==='privacyDialog')e.target.close()});start();if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));

/* MyProf active navigation enhancement */
function updateAppNavigation(){
  const sections=['home',...SECTIONS].filter(id=>document.getElementById(id));
  const y=window.scrollY+Math.min(window.innerHeight*.3,200);
  let current='home';
  for(const id of sections){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top+window.scrollY<=y)current=id;}
  for(const a of document.querySelectorAll('#desktopNav a,#bottomNav a')){
    const selected=a.getAttribute('href')==='#'+current;
    a.classList.toggle('active',selected);
    if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
  }
}
let navTick=false;
window.addEventListener('scroll',()=>{
  if(navTick)return;
  navTick=true;
  requestAnimationFrame(()=>{navTick=false;updateAppNavigation()});
},{passive:true});
window.addEventListener('hashchange',()=>{if(app)renderItemRoute();setTimeout(updateAppNavigation,100)});
const navigationObserver=new MutationObserver(()=>updateAppNavigation());
navigationObserver.observe(document.getElementById('dynamicSections'),{childList:true});
