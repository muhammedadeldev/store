import { state } from '../state';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export async function renderHomeView(): Promise<string> {
  const lang = state.getLang();
  const settings = state.getSettings();

  // Fetch Categories & Featured Products from Firestore
  let categories: any[] = [];
  let newArrivals: any[] = [];
  let bestSellers: any[] = [];

  try {
    const catSnap = await getDocs(query(collection(db, 'categories'), where('isActive', '==', true), limit(6)));
    categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const prodSnap = await getDocs(query(collection(db, 'products'), where('isPublished', '==', true), limit(8)));
    const allProds: any[] = prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    newArrivals = allProds.filter(p => p.isNewArrival);
    bestSellers = allProds.filter(p => p.isBestSeller);
    if (newArrivals.length === 0) newArrivals = allProds.slice(0, 4);
    if (bestSellers.length === 0) bestSellers = allProds.slice(2, 6);
  } catch (e) {
    console.error('Error fetching home data', e);
  }

  const heroTitle = lang === 'ar' ? settings.heroTitleAr : settings.heroTitle;
  const heroSubtitle = lang === 'ar' ? settings.heroSubtitleAr : settings.heroSubtitle;
  const heroCtaText = lang === 'ar' ? settings.heroCtaTextAr : settings.heroCtaText;

  return `
    <div class="home-page animate-fade-in">
      <!-- Hero Section -->
      <section class="hero-section" style="background-image: url('${settings.heroImageUrl}');">
        <div class="hero-overlay"></div>
        <div class="container">
          <div class="hero-content">
            <span class="hero-tagline">${lang === 'ar' ? 'المجموعة الحصرية • خريف وشتاء' : 'Atelier Runway Edition • Autumn/Winter'}</span>
            <h1 class="hero-title">${heroTitle}</h1>
            <p class="hero-description">${heroSubtitle}</p>
            <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
              <a href="${settings.heroCtaLink || '#shop'}" class="btn btn-primary btn-lg" style="background: #ffffff; color: #121212; border-color: #ffffff;">
                ${heroCtaText}
              </a>
              <a href="#shop?cat=cat-coats" class="btn btn-secondary btn-lg" style="color: #ffffff; border-color: rgba(255,255,255,0.6);">
                ${lang === 'ar' ? 'معاطف الكشمير' : 'Explore Outerwear'}
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Brand Pillars / Values -->
      <section style="background-color: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: var(--space-xl) 0;">
        <div class="container">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-lg);" class="pillars-grid">
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
              <span style="font-size: 24px; color: var(--color-brand-gold);">✦</span>
              <div>
                <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${lang === 'ar' ? 'خامات طبيعية نقية 100%' : 'Noble Fibers'}</h4>
                <p style="font-size: 12px; color: var(--color-text-muted);">${lang === 'ar' ? 'كشمير منغولي وحرير التوت الإيطالي' : 'Mongolian cashmere & Mulberry silk'}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
              <span style="font-size: 24px; color: var(--color-brand-gold);">✦</span>
              <div>
                <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${lang === 'ar' ? 'حرفية آتيليه يدوية' : 'Atelier Craft'}</h4>
                <p style="font-size: 12px; color: var(--color-text-muted);">${lang === 'ar' ? 'حياكة دقيقة وقصات باريسية متقنة' : 'Parisian cuts & artisanal finishing'}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
              <span style="font-size: 24px; color: var(--color-brand-gold);">✦</span>
              <div>
                <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${lang === 'ar' ? 'شحن سريع لجميع المحافظات' : 'Fast Express Across Egypt'}</h4>
                <p style="font-size: 12px; color: var(--color-text-muted);">${lang === 'ar' ? 'توصيل مجاني للطلبات فوق 1,500 ج.م' : 'Free express on orders over 1,500 EGP'}</p>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
              <span style="font-size: 24px; color: var(--color-brand-gold);">✦</span>
              <div>
                <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${lang === 'ar' ? 'إرجاع واستبدال مجاني' : '14-Day Returns'}</h4>
                <p style="font-size: 12px; color: var(--color-text-muted);">${lang === 'ar' ? 'استبدال واسترجاع سلس بدون عناء' : 'Effortless courier pick-up'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Collections -->
      <section style="padding: var(--space-4xl) 0;">
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-2xl);">
            <div>
              <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 4px;">${lang === 'ar' ? 'المجموعات والتصنيفات' : 'The Curations'}</span>
              <h2 style="font-family: var(--font-editorial); font-size: clamp(28px, 4vw, 38px); font-weight: 500;">
                ${lang === 'ar' ? 'المجموعات والتصنيفات الفاخرة' : 'Signature Collections'}
              </h2>
            </div>
            <a href="#shop" class="nav-link" style="font-size: 13px; font-weight: 600;">
              ${lang === 'ar' ? 'عرض كل التصنيفات ←' : 'View All Collections →'}
            </a>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-lg);">
            ${categories.map(cat => `
              <a href="#shop?cat=${cat.id}" class="category-card" style="position: relative; aspect-ratio: 4/5; overflow: hidden; border-radius: var(--radius-xs); display: block; background: #222;">
                <img src="${cat.imageUrl}" alt="${cat.name}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.transform='scale(1.06)'" onmouseout="this.style.transform='scale(1)'" />
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%);"></div>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: var(--space-lg); color: #ffffff;">
                  <h3 style="font-family: var(--font-editorial); font-size: 22px; font-weight: 500; margin-bottom: 4px;">
                    ${lang === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                  </h3>
                  <span style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #e2ded5; font-weight: 500;">
                    ${lang === 'ar' ? 'اكتشف القطع ←' : 'Discover Pieces →'}
                  </span>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- New Arrivals Grid -->
      <section style="padding: var(--space-4xl) 0; background-color: var(--color-surface); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);">
        <div class="container">
          <div style="text-align: center; max-width: 600px; margin: 0 auto var(--space-3xl) auto;">
            <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 6px;">
              ${lang === 'ar' ? 'إبداعات الموسم' : 'Runway Highlights'}
            </span>
            <h2 style="font-family: var(--font-editorial); font-size: clamp(30px, 4.5vw, 42px); font-weight: 500;">
              ${state.t('newArrivals')}
            </h2>
            <p style="font-size: 14px; color: var(--color-text-muted); margin-top: var(--space-xs);">
              ${lang === 'ar' ? 'قطع حصرية محدودة الإصدار تم قصها وتفصيلها بأعلى معايير الهوت كوتور.' : 'Limited atelier pieces cut and hand-finished with timeless contemporary proportions.'}
            </p>
          </div>

          <div class="grid-products">
            ${newArrivals.map(prod => renderProductCard(prod, lang)).join('')}
          </div>

          <div style="text-align: center; margin-top: var(--space-3xl);">
            <a href="#shop" class="btn btn-secondary btn-lg">
              ${lang === 'ar' ? 'استعراض كامل التشكيلة' : 'View Full Ready-to-Wear'}
            </a>
          </div>
        </div>
      </section>

      <!-- Editorial Atelier Story Banner -->
      <section style="position: relative; padding: var(--space-4xl) 0; background-color: #121212; color: #ffffff; overflow: hidden;">
        <div class="container" style="position: relative; z-index: 10;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4xl); align-items: center;" class="story-grid">
            <div>
              <span style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: var(--space-sm);">
                ${lang === 'ar' ? 'فلسفة الدار والإنتاج' : 'The Atelier Craft'}
              </span>
              <h2 style="font-family: var(--font-editorial); font-size: clamp(32px, 4.5vw, 48px); line-height: 1.15; font-weight: 400; margin-bottom: var(--space-lg);">
                ${lang === 'ar' ? 'خياطة معمارية دقيقة لا تعترف بمرور الزمن' : 'Sculptural Tailoring Built For A Lifetime'}
              </h2>
              <p style="font-size: 15px; line-height: 1.8; color: #b8b5af; margin-bottom: var(--space-md);">
                ${lang === 'ar' 
                  ? 'في لو إتوال L\'ÉTOILE، نؤمن بأن الأناقة الحقيقية تنبع من نقاء القماش والقصة المثالية. نعتمد فقط على الصوف البكر الإيطالي وحرير التوت الطبيعي وأرقى ألياف الكشمير المنغولي المختارة بعناية فائقة.'
                  : 'At L\'ÉTOILE, true luxury resides in the purity of proportion and the integrity of natural fibers. We source only certified ethical Mongolian cashmere, 22-momme Mulberry silks, and hand-milled Italian wools.'}
              </p>
              <p style="font-size: 14px; line-height: 1.8; color: #8c8984; margin-bottom: var(--space-xl);">
                ${lang === 'ar'
                  ? 'كل تصميم يخضع لعشرات الساعات من التعديل اليدوي في الآتيليه للتأكد من انسيابيته مع حركة الجسد.'
                  : 'Every piece undergoes rigorous hand draping and tailored basting to guarantee an effortless fluid drape.'}
              </p>
              <a href="#page/about" class="btn btn-gold btn-sm">
                ${lang === 'ar' ? 'قراءة قصة الدار الكاملة' : 'Read Atelier Story'}
              </a>
            </div>

            <div style="position: relative;">
              <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85" alt="Atelier Craft" style="width: 100%; border-radius: var(--radius-xs); box-shadow: var(--shadow-lg);" />
            </div>
          </div>
        </div>
      </section>

      <!-- Best Sellers Grid -->
      <section style="padding: var(--space-4xl) 0;">
        <div class="container">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-2xl);">
            <div>
              <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 4px;">${lang === 'ar' ? 'القطع الأيقونية' : 'The Icons'}</span>
              <h2 style="font-family: var(--font-editorial); font-size: clamp(28px, 4vw, 38px); font-weight: 500;">
                ${state.t('bestSellers')}
              </h2>
            </div>
            <a href="#shop?filter=bestseller" class="nav-link" style="font-size: 13px; font-weight: 600;">
              ${lang === 'ar' ? 'عرض الأكثر طلباً ←' : 'View All Best Sellers →'}
            </a>
          </div>

          <div class="grid-products">
            ${bestSellers.map(prod => renderProductCard(prod, lang)).join('')}
          </div>
        </div>
      </section>

      <!-- Instagram / Runway Gallery -->
      <section style="padding: var(--space-3xl) 0; background-color: var(--color-surface); border-top: 1px solid var(--color-border);">
        <div class="container">
          <div style="text-align: center; margin-bottom: var(--space-2xl);">
            <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-brand-gold); display: block;">@letoile_official</span>
            <h3 style="font-family: var(--font-editorial); font-size: 28px; font-weight: 500;">${lang === 'ar' ? 'إطلالات الكوتور في العالم' : 'Worn Across The Globe'}</h3>
          </div>

          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-sm);" class="insta-grid">
            <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80" alt="Runway Look 1" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xs);" />
            <img src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80" alt="Runway Look 2" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xs);" />
            <img src="https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=600&q=80" alt="Runway Look 3" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xs);" />
            <img src="https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?auto=format&fit=crop&w=600&q=80" alt="Runway Look 4" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xs);" />
            <img src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80" alt="Runway Look 5" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xs);" />
          </div>
        </div>
      </section>
    </div>
  `;
}

// Reusable Product Card Component
export function renderProductCard(prod: any, lang: 'ar' | 'en'): string {
  const title = lang === 'ar' ? (prod.nameAr || prod.name) : prod.name;
  const isSale = prod.salePrice && prod.salePrice > 0;
  const displayPrice = isSale ? prod.salePrice : prod.price;
  const originalPrice = isSale ? prod.price : null;
  const primaryImg = (prod.images && prod.images[0]) || '';
  const secondaryImg = (prod.images && prod.images[1]) || primaryImg;

  return `
    <div class="product-card" data-id="${prod.id}">
      <div class="product-image-wrap">
        <a href="#product?id=${prod.id}">
          <img src="${primaryImg}" alt="${title}" class="product-image" loading="lazy" />
        </a>

        ${isSale ? `<span class="product-badge sale">${lang === 'ar' ? 'عرض خاص' : 'Sale'}</span>` : ''}
        ${!isSale && prod.isNewArrival ? `<span class="product-badge">${lang === 'ar' ? 'جديد' : 'New'}</span>` : ''}

        <div class="quick-action-overlay">
          <a href="#product?id=${prod.id}" class="btn btn-primary btn-sm btn-full" style="font-size: 11px;">
            ${lang === 'ar' ? 'عرض التفاصيل واختيار المقاس' : 'Select Size & Details'}
          </a>
        </div>
      </div>

      <div class="product-info">
        <span class="product-category">${prod.categoryName || 'Haute Couture'}</span>
        <a href="#product?id=${prod.id}">
          <h3 class="product-title">${title}</h3>
        </a>
        
        <div class="product-price-row">
          <span class="price-current">${state.formatPrice(displayPrice)}</span>
          ${originalPrice ? `<span class="price-original">${state.formatPrice(originalPrice)}</span>` : ''}
        </div>

        ${prod.colors && prod.colors.length > 0 ? `
          <div class="product-colors-dots">
            ${prod.colors.map((c: any) => `
              <span class="color-dot" style="background-color: ${c.hex};" title="${lang === 'ar' ? (c.nameAr || c.name) : c.name}"></span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}
