import { state, showToast } from '../state';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export async function renderTrackView(urlParams: URLSearchParams): Promise<string> {
  const lang = state.getLang();
  const orderParam = urlParams.get('order') || '';

  let foundOrder: any = null;
  if (orderParam) {
    try {
      const q = query(collection(db, 'orders'), where('orderNumber', '==', orderParam.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        foundOrder = { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (e) {
      console.error('Error tracking order', e);
    }
  }

  const steps = [
    { key: 'new', label: lang === 'ar' ? 'استلام الطلب' : 'Order Placed' },
    { key: 'confirmed', label: lang === 'ar' ? 'تأكيد الطلب' : 'Confirmed' },
    { key: 'processing', label: lang === 'ar' ? 'تجهيز وتغليف بالآتيليه' : 'Atelier Prep' },
    { key: 'shipped', label: lang === 'ar' ? 'شحن جوي سريع' : 'Dispatched' },
    { key: 'delivered', label: lang === 'ar' ? 'تم التسليم' : 'Delivered' }
  ];

  function getStepIndex(status: string) {
    if (status === 'cancelled') return -1;
    if (status === 'delivered') return 4;
    if (status === 'shipped') return 3;
    if (status === 'packed' || status === 'processing') return 2;
    if (status === 'confirmed') return 1;
    return 0;
  }

  const currentStep = foundOrder ? getStepIndex(foundOrder.status) : 0;

  return `
    <div class="track-page container animate-fade-in" style="padding-top: var(--space-3xl); padding-bottom: var(--space-4xl); max-width: 780px;">
      
      <div style="text-align: center; margin-bottom: var(--space-2xl);">
        <span style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--color-brand-gold); display: block; margin-bottom: 4px;">
          ${lang === 'ar' ? 'خدمة المتابعة والتوصيل' : 'White-Glove Tracking'}
        </span>
        <h1 style="font-family: var(--font-editorial); font-size: 32px; font-weight: 500;">
          ${state.t('trackOrder')}
        </h1>
        <p style="font-size: 13px; color: var(--color-text-muted); margin-top: 4px;">
          ${lang === 'ar' ? 'أدخل رقم الطلب المسجل لمتابعة خط سير التجهيز والشحن لحظة بلحظة.' : 'Enter your order reference to view real-time atelier and air courier milestones.'}
        </p>
      </div>

      <!-- Search Card -->
      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xs); padding: var(--space-lg); margin-bottom: var(--space-2xl); box-shadow: var(--shadow-sm);">
        <form id="track-search-form" style="display: flex; gap: var(--space-sm);">
          <input 
            type="text" 
            id="track-order-input" 
            required 
            value="${orderParam}" 
            placeholder="e.g. ORD-89421-102" 
            class="form-input" 
            style="flex: 1; text-transform: uppercase; font-size: 14px; font-weight: 600;" 
          />
          <button type="submit" class="btn btn-primary" style="padding: 10px 24px;">
            ${lang === 'ar' ? 'بحث وتتبع' : 'Track'}
          </button>
        </form>
      </div>

      <!-- Results Card -->
      ${foundOrder ? `
        <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xs); padding: var(--space-2xl); box-shadow: var(--shadow-sm);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-md); margin-bottom: var(--space-xl); flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-size: 11px; color: var(--color-text-subtle); text-transform: uppercase;">Order Number</span>
              <h2 style="font-family: var(--font-editorial); font-size: 24px; color: var(--color-brand);">${foundOrder.orderNumber}</h2>
            </div>
            <div>
              <span class="status-pill ${foundOrder.status}">
                ${foundOrder.status}
              </span>
            </div>
          </div>

          <!-- Progress Stepper -->
          <div style="margin-bottom: var(--space-3xl); padding: var(--space-md) 0;">
            <div style="display: flex; justify-content: space-between; position: relative;">
              <div style="position: absolute; top: 14px; left: 5%; right: 5%; height: 2px; background: #e2ded5; z-index: 1;">
                <div style="height: 100%; width: ${(currentStep / 4) * 100}%; background: var(--color-brand-gold); transition: width 0.4s ease;"></div>
              </div>

              ${steps.map((st, i) => `
                <div style="position: relative; z-index: 2; text-align: center; flex: 1;">
                  <div style="width: 30px; height: 30px; border-radius: 50%; background: ${i <= currentStep ? 'var(--color-brand)' : '#ffffff'}; border: 2px solid ${i <= currentStep ? 'var(--color-brand)' : '#ccc6bc'}; color: ${i <= currentStep ? '#ffffff' : '#888'}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin: 0 auto 8px auto;">
                    ${i < currentStep ? '✓' : (i + 1)}
                  </div>
                  <span style="font-size: 11px; font-weight: ${i === currentStep ? '700' : '400'}; color: ${i <= currentStep ? 'var(--color-brand)' : 'var(--color-text-subtle)'}; display: block;">
                    ${st.label}
                  </span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Carrier Tracking Info -->
          ${foundOrder.trackingNumber ? `
            <div style="background: var(--color-surface-muted); padding: var(--space-md); border-radius: var(--radius-xs); margin-bottom: var(--space-xl); display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
              <div>
                <strong>${lang === 'ar' ? 'رقم بوليصة الشحن الدولي:' : 'Air Courier Waybill:'}</strong>
                <span style="font-family: monospace; font-size: 14px; margin-left: 6px;">${foundOrder.trackingNumber}</span>
              </div>
              <span style="color: var(--color-brand-gold); font-weight: 600;">DHL Express</span>
            </div>
          ` : ''}

          <!-- Order Items -->
          <div style="margin-bottom: var(--space-xl);">
            <h4 style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-md);">
              ${lang === 'ar' ? 'القطع الموجودة في الطرد' : 'Garments In Package'}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(foundOrder.items || []).map((it: any) => `
                <div style="display: flex; gap: var(--space-sm); align-items: center; font-size: 13px; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 8px;">
                  <img src="${it.image}" alt="" style="width: 44px; height: 56px; object-fit: cover; border-radius: 2px;" />
                  <div style="flex: 1;">
                    <strong>${it.productName}</strong>
                    <div style="font-size: 11px; color: var(--color-text-subtle);">${it.color} • ${it.size} • Qty: ${it.quantity}</div>
                  </div>
                  <span style="font-weight: 600;">$${it.total?.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Address Summary -->
          <div style="font-size: 13px; color: var(--color-text-muted); line-height: 1.8; border-top: 1px solid var(--color-border); padding-top: var(--space-md);">
            <div><strong>${state.t('fullName')}:</strong> ${foundOrder.customerName}</div>
            <div><strong>${state.t('shippingAddress')}:</strong> ${foundOrder.shippingAddress?.city}, ${foundOrder.shippingAddress?.address}</div>
            <div><strong>${state.t('total')}:</strong> $${foundOrder.total?.toFixed(2)} (${foundOrder.paymentMethod?.toUpperCase()})</div>
          </div>

        </div>
      ` : (orderParam ? `
        <div style="text-align: center; padding: var(--space-3xl) 0; background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-xs);">
          <p style="font-size: 15px; color: var(--color-text-main); margin-bottom: 4px;">
            ${lang === 'ar' ? `لم يتم العثور على طلب برقم "${orderParam}"` : `No order found with reference "${orderParam}"`}
          </p>
          <span style="font-size: 12px; color: var(--color-text-muted);">
            ${lang === 'ar' ? 'يرجى التأكد من كتابة الرقم كما ورد في رسالة التأكيد أو الفاتورة.' : 'Please verify the order number on your receipt or confirmation email.'}
          </span>
        </div>
      ` : '')}

    </div>
  `;
}

export function setupTrackEvents() {
  const form = document.getElementById('track-search-form') as HTMLFormElement;
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const val = (document.getElementById('track-order-input') as HTMLInputElement).value.trim();
      if (val) {
        window.location.hash = `track?order=${encodeURIComponent(val)}`;
      }
    };
  }
}
