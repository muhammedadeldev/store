import { state } from '../state';

export function renderFooter(): string {
  const lang = state.getLang();
  const settings = state.getSettings();
  const brandName = lang === 'ar' ? settings.brandNameAr || settings.brandName : settings.brandName;
  const tagline = lang === 'ar' ? settings.taglineAr || settings.tagline : settings.tagline;

  return `
    <footer style="background-color: #121212; color: #a3a19d; padding-top: var(--space-4xl); padding-bottom: var(--space-2xl); border-top: 1px solid #292826;">
      <div class="container">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: var(--space-3xl); margin-bottom: var(--space-3xl);" class="footer-grid">
          
          <!-- Brand Info -->
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: var(--space-md);">
              <img src="/assets/logo-icon-white.png" alt="EIGHTY-EIGHT" style="height: 38px; width: auto;" />
              <h3 style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.08em; margin: 0;">
                EIGHTY-EIGHT
              </h3>
            </div>
            <p style="font-size: 14px; line-height: 1.8; color: #8c8984; max-width: 320px; margin-bottom: var(--space-lg);">
              ${lang === 'ar' ? 'براند أزياء مصري عصري بخامات قطن مصري 100% وتصميمات عصرية راقية تجمع بين الراحة والفخامة اليومية.' : 'Contemporary Egyptian streetwear & fashion crafted from noble 100% Egyptian cotton fibers.'}
            </p>
            <div style="display: flex; gap: var(--space-sm); color: #ffffff;">
              <a href="${settings.socialInstagram}" target="_blank" rel="noopener" class="icon-btn" style="color: #ffffff; background: #222120;" title="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="icon-btn" style="color: #ffffff; background: #222120;" title="WhatsApp">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </a>
            </div>
          </div>

          <!-- Quick Navigation -->
          <div>
            <h4 style="color: #ffffff; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--space-md); font-weight: 700;">
              ${lang === 'ar' ? 'أقسام الكولكشن' : 'Collections'}
            </h4>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
              <li><a href="#shop" style="color: #a3a19d; transition: color 0.2s;">${lang === 'ar' ? 'جميع المنتجات' : 'All Products'}</a></li>
              <li><a href="#shop?filter=new" style="color: #a3a19d;">${state.t('newArrivals')}</a></li>
              <li><a href="#shop?filter=bestseller" style="color: #a3a19d;">${state.t('bestSellers')}</a></li>
              <li><a href="#shop" style="color: #a3a19d;">${lang === 'ar' ? 'هوديز وسويت شيرت' : 'Hoodies & Sweatshirts'}</a></li>
              <li><a href="#shop" style="color: #a3a19d;">${lang === 'ar' ? 'تيشيرتات وبولو' : 'T-Shirts & Polos'}</a></li>
              <li><a href="#shop" style="color: #a3a19d;">${lang === 'ar' ? 'بنطلونات وكارجو' : 'Pants & Cargo'}</a></li>
            </ul>
          </div>

          <!-- Client Care & Policies -->
          <div>
            <h4 style="color: #ffffff; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--space-md); font-weight: 700;">
              ${lang === 'ar' ? 'خدمة العملاء والسياسات' : 'Client Care'}
            </h4>
            <ul style="list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
              <li><a href="#track" style="color: #a3a19d;">${state.t('trackOrder')}</a></li>
              <li><a href="#page/size-guide" style="color: #a3a19d;">${state.t('sizeGuide')}</a></li>
              <li><a href="#page/shipping-policy" style="color: #a3a19d;">${lang === 'ar' ? 'الشحن والتوصيل لجميع المحافظات' : 'Shipping in Egypt'}</a></li>
              <li><a href="#page/returns-policy" style="color: #a3a19d;">${lang === 'ar' ? 'الاستبدال والاسترجاع (14 يوم)' : 'Returns & Exchange'}</a></li>
              <li><a href="#page/about" style="color: #a3a19d;">${state.t('about')}</a></li>
            </ul>
          </div>

          <!-- Newsletter & Concierge -->
          <div>
            <h4 style="color: #ffffff; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: var(--space-md); font-weight: 700;">
              ${lang === 'ar' ? 'انضم لنادي EIGHTY-EIGHT' : 'Join EIGHTY-EIGHT'}
            </h4>
            <p style="font-size: 13px; color: #8c8984; line-height: 1.6; margin-bottom: var(--space-md);">
              ${lang === 'ar' ? 'اشترك لتصلك أحدث القطع قبل نزولها وكوبونات خصم حصرية للأعضاء.' : 'Subscribe for exclusive runway drops, VIP discounts, and early access.'}
            </p>
            <form id="newsletter-form" style="display: flex; gap: var(--space-xs);">
              <input type="email" required placeholder="${lang === 'ar' ? 'اكتب بريدك الإلكتروني...' : 'Your email address...'}" style="flex: 1; padding: 10px 14px; background: #1c1b1a; border: 1px solid #383633; color: #ffffff; font-size: 13px; border-radius: var(--radius-xs);" />
              <button type="submit" class="btn btn-gold btn-sm">${lang === 'ar' ? 'اشتراك' : 'Join'}</button>
            </form>
          </div>

        </div>

        <!-- Sub-footer with Copyright & Payment Badges -->
        <div style="padding-top: var(--space-xl); border-top: 1px solid #222120; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-md); font-size: 13px; color: #8c8984;">
          <div>
            &copy; 2026 EIGHTY-EIGHT. ${lang === 'ar' ? 'جميع الحقوق محفوظة. براند أزياء مصري عصري مسجل.' : 'All rights reserved. Contemporary Egyptian Fashion Brand.'}
          </div>
          <div style="display: flex; gap: var(--space-md); align-items: center; font-size: 12px;">
            <span>الدفع عند الاستلام كاش</span>
            <span>•</span>
            <span>فيزا وماستركارد</span>
            <span>•</span>
            <span>فودافون كاش وإنستاباي InstaPay</span>
            <span>•</span>
            <span>شحن لجميع محافظات مصر</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}
