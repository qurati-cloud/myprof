/* MyProf catalog: separate category pages and dedicated product details. */
(() => {
  'use strict';
  let catalog = null;
  const LANGS = ['ar', 'en', 'fr'];
  const M = {
    ar: { books:'الكتب الرقمية', courses:'الكورسات المسجلة', booksSub:'استكشف الكتب واختر ما يناسبك', coursesSub:'اختر الكورس المناسب لتبدأ التعلم', details:'عرض التفاصيل', go:'فلننطلق', back:'العودة إلى القائمة', home:'العودة إلى الرئيسية', price:'بالتبرع', language:'لغة المحتوى', emptyBooks:'لا توجد كتب معروضة حاليًا', emptyCourses:'لا توجد كورسات معروضة حاليًا', noLink:'الرابط غير متاح حاليًا', search:'ابحث عن كتاب أو كورس', notFound:'هذا المنتج غير متاح حاليًا', all:'جميع المنتجات' },
    en: { books:'Digital Books', courses:'Recorded Courses', booksSub:'Discover our books and choose what suits you', coursesSub:'Find your next learning course', details:'View details', go:'Let’s go', back:'Back to catalog', home:'Back to home', price:'By donation', language:'Content language', emptyBooks:'No books available yet', emptyCourses:'No courses available yet', noLink:'Link not available yet', search:'Search books or courses', notFound:'This product is currently unavailable', all:'All products' },
    fr: { books:'Livres numériques', courses:'Cours enregistrés', booksSub:'Découvrez les livres et choisissez le vôtre', coursesSub:'Choisissez votre prochain cours', details:'Voir les détails', go:'C’est parti', back:'Retour au catalogue', home:'Retour à l’accueil', price:'Par don', language:'Langue du contenu', emptyBooks:'Aucun livre disponible pour le moment', emptyCourses:'Aucun cours disponible pour le moment', noLink:'Lien temporairement indisponible', search:'Rechercher un livre ou un cours', notFound:'Ce produit est indisponible', all:'Tous les produits' }
  };
  const $ = (s,root=document) => root.querySelector(s);
  const el = (tag,cls,text) => {
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function lang(){return LANGS.includes(document.documentElement.lang)?document.documentElement.lang:'ar';}
  function t(key){return M[lang()][key]||M.ar[key];}
  function local(item,key){return item[key+'_'+lang()]||item[key+'_ar']||item[key+'_en']||item[key+'_fr']||item[key]||'';}
  function website(value){
    if(!value)return '';
    try { const u=new URL(value,location.href); return ['https:','http:'].includes(u.protocol)?u.href:''; }
    catch { return ''; }
  }
  function image(value){return website(value);}
  function a(text,href,cls){const n=el('a',cls,text);n.href=href;return n;}
  function path(kind,item){return '#item/'+kind+'/'+encodeURIComponent(item.id||'');}
  function products(kind){return Array.isArray(catalog?.[kind])?catalog[kind]:[];}
  function cover(item,kind,cls){
    const wrap=el('div',cls);
    const src=image(item.image);
    if(src){const pic=el('img');pic.src=src;pic.alt=local(item,'title');pic.loading='lazy';wrap.append(pic);}
    else wrap.append(el('span','catalog-fallback',kind==='books'?'📖':'🎓'));
    return wrap;
  }
  function card(item,kind){
    const c=el('article','mp-catalog-card');
    const title=local(item,'title');
    c.append(cover(item,kind,'mp-catalog-cover'));
    const body=el('div','mp-catalog-body');
    if(item.language)body.append(el('span','mp-chip',String(item.language).toUpperCase()));
    body.append(el('h3','',title));
    const desc=local(item,'description');
    if(desc)body.append(el('p','mp-summary',desc));
    if(item.price&&catalog?.settings?.show_prices!==false)body.append(el('p','mp-card-price',t('price')+': '+item.price));
    body.append(a(t('details'),path(kind,item),'button blue mp-catalog-cta'));
    c.append(body);
    return c;
  }
  function shell(){
    let page=$('#mpCatalogPage');
    if(!page){page=el('div','mp-page');page.id='mpCatalogPage';page.hidden=true;$('#home').append(page);}
    return page;
  }
  function clearPage(){const page=shell();page.replaceChildren();return page;}
  function head(page,title,subtitle,backHref){
    const area=el('div','mp-catalog-heading');
    area.append(a('← '+t('home'),'#home','mp-text-back'));
    area.append(el('h1','',title));
    if(subtitle)area.append(el('p','',subtitle));
    if(backHref)area.append(a('← '+t('back'),backHref,'mp-text-back'));
    page.append(area);
  }
  function list(kind){
    const page=clearPage();
    head(page,t(kind),t(kind==='books'?'booksSub':'coursesSub'));
    const items=products(kind);
    if(!items.length){page.append(el('p','mp-empty',t(kind==='books'?'emptyBooks':'emptyCourses')));return;}
    const input=el('input','mp-search');
    input.type='search';input.placeholder=t('search');input.setAttribute('aria-label',t('search'));
    page.append(input);
    const grid=el('div','mp-catalog-grid');page.append(grid);
    function show(q=''){
      grid.replaceChildren();
      const matches=items.filter(it=>(local(it,'title')+' '+local(it,'description')+' '+local(it,'details')).toLocaleLowerCase().includes(q.toLocaleLowerCase()));
      if(!matches.length)grid.append(el('p','mp-empty',t('notFound')));
      matches.forEach(item=>grid.append(card(item,kind)));
    }
    input.addEventListener('input',()=>show(input.value.trim()));
    show();
  }
  function detail(kind,id){
    const item=products(kind).find(it=>String(it.id)===id);
    const page=clearPage();
    if(!item){head(page,t('notFound'),'', '#catalog/'+kind);page.append(a(t('back'),'#catalog/'+kind,'button blue'));return;}
    page.append(a('← '+t('back'),'#catalog/'+kind,'mp-text-back mp-return'));
    const layout=el('article','mp-item-detail');
    layout.append(cover(item,kind,'mp-detail-cover'));
    const info=el('div','mp-detail-info');
    if(item.language)info.append(el('span','mp-chip',String(item.language).toUpperCase()));
    info.append(el('h1','',local(item,'title')));
    const description=local(item,'description');
    if(description)info.append(el('p','mp-detail-summary',description));
    const details=local(item,'details');
    if(details)info.append(el('div','mp-detail-description',details));
    if(item.price&&catalog?.settings?.show_prices!==false)info.append(el('strong','mp-detail-price',t('price')+': '+item.price));
    const target=website(item.url);
    if(target){
      const cta=a(local(item,'button')||t('go'),target,'button blue mp-main-cta');
      cta.target='_blank';cta.rel='noopener noreferrer';info.append(cta);
    }else{info.append(el('p','mp-empty',t('noLink')));}
    layout.append(info);page.append(layout);
    document.title=local(item,'title')+' | My Prof';
  }
  function route(){
    if(!catalog)return;
    const hash=decodeURIComponent(location.hash||'#home');
    const match=hash.match(/^#(catalog|item)\/(books|courses)(?:\/(.*))?$/);
    const page=shell();
    const on=!!match;
    document.body.classList.toggle('mp-catalog-active',on);
    page.hidden=!on;
    if(!on){document.title=(catalog.settings?.brand||'My Prof')+' | '+(catalog.settings?.tagline||'');return;}
    const [,mode,kind,id]=match;
    if(mode==='catalog')list(kind);else detail(kind,id||'');
    window.scrollTo({top:0,behavior:'instant'});
  }
  function editHomeCards(){
    for(const kind of ['books','courses']){
      const section=document.getElementById(kind);
      if(!section)continue;
      const grid=section.querySelector('.products');
      if(grid){grid.replaceChildren();products(kind).slice(0,3).forEach(item=>grid.append(card(item,kind)));}
      const more=a(t('all')+' ←','#catalog/'+kind,'button blue mp-all-products');
      section.querySelector('.mp-all-products')?.remove();
      section.append(more);
    }
  }
  function improveLinks(){
    document.querySelectorAll('a[href="#books"],a[href="#courses"]').forEach(node=>{
      const kind=node.getAttribute('href').slice(1);
      node.href='#catalog/'+kind;
    });
  }
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href="#books"],a[href="#courses"]');
    if(!anchor)return;
    event.preventDefault();
    location.hash='#catalog/'+anchor.getAttribute('href').slice(1);
  },true);
  window.addEventListener('hashchange',route);
  document.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>{
    setTimeout(()=>{editHomeCards();improveLinks();route();},0);
  }));
  (async()=>{
    try{
      const resp=await fetch('data/catalog.json',{cache:'no-store'});
      if(!resp.ok)throw new Error('Cannot load products');
      catalog=await resp.json();
      const dynamic=$('#dynamicSections');
      const obs=new MutationObserver(()=>{editHomeCards();improveLinks();route();});
      obs.observe(dynamic,{childList:true});
      editHomeCards();improveLinks();route();
    }catch(err){console.error('MyProf catalog:',err);}
  })();
})();
