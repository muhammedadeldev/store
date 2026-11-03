import { state } from '../state';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export async function renderPageView(slug: string): Promise<string> {
  const lang = state.getLang();

  let pageData: any = null;
  try {
    const q = query(collection(db, 'pages'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      pageData = snap.docs[0].data();
    }
  } catch (e) {
    console.error('Error fetching CMS page', e);
  }

  if (!pageData) {
    // Default fallback content for essential pages
    if (slug === 'about') {
      pageData = {
        title: "The Atelier Story",
        titleAr: "قصة الدار والحرفية",
        content: "Founded with an uncompromising devotion to fabric integrity and architectural silhouettes, L'ÉTOILE represents modern minimalism elevated to haute couture standards. Every garment is meticulously patterned in our Parisian atelier and hand-finished by master artisans in northern Italy and Scotland.",
        contentAr: "تأسست دار لو إتوال L'ÉTOILE انطلاقاً من شغف استثنائي بنقاء الخامات ودقة الخطوط التصميمية لتصل بالبساطة الحديثة إلى آفاق الهوت كوتور العالمية. يتم تصميم وقص كل قطعة داخل الآتيليه الخاص بنا في باريس، وتُستكمل الحياكة يدوياً على أيدي أمهر الحرفيين في شمال إيطاليا واسكتلندا."
      };
    } else {
      return `
        <div class="container" style="padding: 100px 0; text-align: center;">
          <h2 style="font-family: var(--font-editorial); font-size: 32px; margin-bottom: 16px;">Page Not Found</h2>
          <a href="#home" class="btn btn-primary">${state.t('home')}</a>
        </div>
      `;
    }
  }

  const title = lang === 'ar' ? (pageData.titleAr || pageData.title) : pageData.title;
  const content = lang === 'ar' ? (pageData.contentAr || pageData.content) : pageData.content;

  return `
    <div class="cms-page container animate-fade-in" style="padding-top: var(--space-3xl); padding-bottom: var(--space-4xl); max-width: 860px;">
      <div style="text-align: center; margin-bottom: var(--space-3xl); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-2xl);">
        <span style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 6px;">
          ${lang === 'ar' ? 'صفحات وميثاق الدار' : 'Atelier Documentation'}
        </span>
        <h1 style="font-family: var(--font-editorial); font-size: clamp(32px, 5vw, 48px); font-weight: 500;">
          ${title}
        </h1>
      </div>

      <div style="font-size: 16px; line-height: 2; color: var(--color-text-main); font-weight: 300;">
        <p style="margin-bottom: var(--space-xl); white-space: pre-line;">${content}</p>
      </div>

      <div style="margin-top: var(--space-4xl); border-top: 1px solid var(--color-border); padding-top: var(--space-xl); display: flex; justify-content: space-between; align-items: center;">
        <a href="#shop" class="btn btn-primary btn-sm">
          ${lang === 'ar' ? 'استعراض التشكيلة الحالية' : 'Explore Current Runway'}
        </a>
        <a href="https://wa.me/+971501234567" target="_blank" class="btn btn-secondary btn-sm">
          💬 ${lang === 'ar' ? 'محادثة المساعد الشخصي (Concierge)' : 'Chat with Atelier Concierge'}
        </a>
      </div>
    </div>
  `;
}
