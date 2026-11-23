(() => {
  'use strict';
  const messages = {
    ar: {sending:'جارٍ إرسال رسالتك...',sent:'تم إرسال رسالتك بنجاح. شكرًا لتواصلك معنا.',failed:'تعذّر إرسال الرسالة. تأكد من اتصال الإنترنت وحاول مجددًا. إذا كانت هذه أول رسالة، افحص بريد الإدارة لتفعيل النموذج.',missing:'خدمة استقبال الرسائل غير مهيأة.',button:'إرسال الرسالة'},
    en: {sending:'Sending your message...',sent:'Your message was sent successfully. Thank you!',failed:'Your message could not be sent. Please try again. For first use, check the recipient inbox for activation.',missing:'Contact delivery is not configured.',button:'Send message'},
    fr: {sending:'Envoi de votre message...',sent:'Votre message a bien été envoyé. Merci !',failed:'Envoi impossible. Réessayez. Pour le premier envoi, vérifiez le courriel d’activation.',missing:'Le service de contact n’est pas configuré.',button:'Envoyer le message'}
  };
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const section = form.closest('section');
    if (!section || !['contact','private','institutions'].includes(section.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!form.reportValidity() || form.dataset.sending === 'yes') return;

    const lang = document.documentElement.lang;
    const t = messages[lang] || messages.ar;
    const email = 'alaatarabah.edu@gmail.com';
    const button = form.querySelector('button[type="submit"]');
    const notice = form.querySelector('.contact-notice');
    let status = form.querySelector('.direct-form-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'direct-form-status';
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      form.appendChild(status);
    }
    if (notice) notice.hidden = true;
    const oldLabel = button ? button.textContent : '';
    if (button) { button.disabled = true; button.textContent = t.sending; }
    status.textContent = t.sending;
    status.classList.remove('is-error');
    form.dataset.sending = 'yes';

    const original = new FormData(form);
    const payload = new FormData();
    const titles = {contact:'MyProf - Contact',private:'MyProf - Private lessons',institutions:'MyProf - Institutions'};
    payload.append('_subject', titles[section.id] + ': ' + String(original.get('contact_subject') || original.get('subject') || 'New request'));
    payload.append('_template','table');
    const senderEmail = original.get('contact_email') || original.get('email');
    if (senderEmail) payload.append('email',String(senderEmail));
    for (const [key,value] of original) {
      if (key === 'contact_email' || key === 'email') continue;
      payload.append(key.replace(/^contact_/, ''),String(value));
    }
    try {
      const response = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
        method:'POST',
        body:payload,
        headers:{'Accept':'application/json'}
      });
      const result = await response.json();
      if (!response.ok || !(result.success === true || result.success === 'true')) {
        throw new Error(result.message || 'Submission not accepted');
      }
      form.reset();
      status.textContent = t.sent;
    } catch (error) {
      console.warn('MyProf form submission:', error);
      status.classList.add('is-error');
      status.textContent = t.failed;
    } finally {
      form.dataset.sending = 'no';
      if (button) { button.disabled = false; button.textContent = section.id === 'contact' ? t.button : oldLabel; }
    }
  }, true);
})();
