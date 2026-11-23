'use strict';
const API = 'https://myprof-ai-api.quraaty.workers.dev';
const $ = (selector, root=document) => root.querySelector(selector);
const loginPanel = $('#login-panel');
const dashboard = $('#dashboard');
const loginError = $('#login-error');
const postMessage = $('#post-message');

async function api(path, options={}) {
  const response = await fetch(API + path, { credentials:'include', ...options });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || data.success === false) throw new Error(data.message || 'تعذر إكمال الطلب');
  return data;
}
function showLogin() {
  loginPanel.hidden = false;
  dashboard.hidden = true;
  $('#logout').hidden = true;
}
function showDashboard(user) {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  $('#logout').hidden = false;
  $('#admin-email').textContent = user.email || '';
  loadDashboard();
}
async function loadDashboard() {
  await Promise.all([loadIntegrations(), loadPosts()]);
}
async function loadIntegrations() {
  const root = $('#integrations');
  root.replaceChildren();
  try {
    const data = await api('/api/admin/integrations');
    const labels = {facebook:'Facebook',instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube'};
    Object.entries(data.integrations || {}).forEach(([key, connected]) => {
      const card = document.createElement('div');
      card.className = 'integration ' + (connected ? 'connected' : 'disconnected');
      const name = document.createElement('strong'); name.textContent = labels[key] || key;
      const status = document.createElement('span'); status.textContent = connected ? 'إعداد الاتصال موجود' : 'لم يُربط بعد';
      card.append(name,status); root.append(card);
    });
  } catch (error) {
    root.textContent = error.message;
  }
}
async function loadPosts() {
  const root = $('#posts');
  root.replaceChildren();
  try {
    const data = await api('/api/admin/posts');
    if (!data.posts?.length) { root.textContent = 'لا توجد مسودات حتى الآن.'; return; }
    data.posts.forEach(post => {
      const card = document.createElement('article'); card.className='post-card';
      const title = document.createElement('h3'); title.textContent=post.title;
      const caption = document.createElement('p'); caption.textContent=post.caption;
      const meta = document.createElement('small');
      let platforms=[]; try { platforms=JSON.parse(post.platforms_json || '[]'); } catch {}
      meta.textContent='مسودة · '+platforms.join('، ');
      card.append(title,caption,meta);
      if (post.media_url) { const image=document.createElement('img'); image.src=post.media_url; image.alt='صورة المنشور'; image.loading='lazy'; card.append(image); }
      const del=document.createElement('button'); del.type='button'; del.className='button danger'; del.textContent='حذف المسودة';
      del.addEventListener('click', async()=>{
        if(!confirm('هل تريد حذف هذه المسودة؟')) return;
        try { await api('/api/admin/posts/'+post.id+'/delete',{method:'POST'}); await loadPosts(); }
        catch(error){ alert(error.message); }
      });
      card.append(del); root.append(card);
    });
  } catch(error) { root.textContent=error.message; }
}
$('#login-form').addEventListener('submit', async event=>{
  event.preventDefault(); loginError.textContent='';
  const form=new FormData(event.currentTarget);
  try {
    const data=await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email'),password:form.get('password')})});
    showDashboard(data.user);
  } catch(error) { loginError.textContent=error.message; }
});
$('#logout').addEventListener('click',async()=>{
  try { await api('/api/admin/logout',{method:'POST'}); } catch {}
  showLogin();
});
$('#refresh').addEventListener('click',loadDashboard);
$('#post-form').addEventListener('submit',async event=>{
  event.preventDefault(); postMessage.textContent='جارٍ حفظ المسودة...'; postMessage.className='message';
  const form=event.currentTarget;
  const values=new FormData(form);
  const platforms=values.getAll('platforms');
  try {
    if(!platforms.length) throw new Error('اختر منصة واحدة على الأقل.');
    let media_url='';
    const file=values.get('file');
    if(file && file.size) {
      const upload=new FormData(); upload.append('file',file);
      const media=await api('/api/admin/media',{method:'POST',body:upload});
      media_url=media.media_url;
    }
    await api('/api/admin/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      title:values.get('title'),caption:values.get('caption'),platforms,media_url
    })});
    form.reset(); postMessage.textContent='حُفظ المنشور كمسودة بنجاح.'; postMessage.className='message success';
    await loadPosts();
  } catch(error) { postMessage.textContent=error.message; postMessage.className='message error'; }
});
(async()=>{
  try { const data=await api('/api/admin/me'); showDashboard(data.user); }
  catch { showLogin(); }
})();
