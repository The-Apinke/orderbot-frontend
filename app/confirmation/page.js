'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useRef } from 'react';

const BG  = '#f5f0e6';
const BGP = '#ede8dd';
const INK = '#1a0c04';
const ACC = '#c25a1c';
const BDR = '#cec6b8';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const name  = searchParams.get('name')  || 'Customer';
  const phone = searchParams.get('phone') || '';
  const total = searchParams.get('total') || '0';

  const orderIdRef = useRef('USS-' + Math.floor(Math.random() * 9000 + 1000));
  const orderId    = orderIdRef.current;
  const today      = new Date().toLocaleDateString('en-GB');

  const whatsappMsg = `Hi Uncle Soji! I just placed an order.\n\nOrder: ${orderId}\nName: ${name}\nPhone: ${phone}\nTotal: ₦${parseInt(total).toLocaleString()}\n\nPlease find my payment receipt attached.`;
  const whatsappUrl = 'https://wa.me/2348012345678?text=' + encodeURIComponent(whatsappMsg);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BGP}; font-family: 'DM Sans', sans-serif; color: ${INK}; }

        .page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 32px 16px; background: ${BGP};
        }

        .wrap { width: 100%; max-width: 400px; position: relative; }

        /* Rotated stamp */
        .stamp {
          position: absolute; top: -16px; right: -8px;
          transform: rotate(-7deg);
          border: 2.5px solid ${ACC}; padding: 7px 14px;
          font-family: 'Bebas Neue', sans-serif; font-size: 15px;
          color: ${ACC}; letter-spacing: 0.1em;
          background: ${BGP}; z-index: 2;
          animation: fadeUp 0.5s 0.1s ease both;
        }
        @keyframes fadeUp { from{opacity:0;transform:rotate(-7deg) translateY(8px)} to{opacity:1;transform:rotate(-7deg) translateY(0)} }

        .receipt {
          background: ${BG}; border: 1.5px solid ${ACC};
          animation: slideUp 0.4s ease both;
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        /* Receipt header */
        .r-head {
          padding: 22px 24px 18px; border-bottom: 1.5px solid ${ACC}; text-align: center;
        }
        .r-brand {
          font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 0.04em;
        }
        .r-tagline {
          font-family: monospace; font-size: 9px; letter-spacing: 0.28em; color: ${ACC}; margin-top: 4px;
        }

        /* Meta grid */
        .r-meta { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1.5px solid ${ACC}; }
        .meta-cell { padding: 12px 16px; }
        .meta-cell:nth-child(odd)  { border-right: 1.5px solid ${ACC}; }
        .meta-cell:nth-child(3),
        .meta-cell:nth-child(4)    { border-top: 1px dashed ${BDR}; }
        .meta-key { font-family: monospace; font-size: 8px; letter-spacing: 0.22em; color: rgba(26,12,4,0.4); margin-bottom: 4px; }
        .meta-val { font-family: monospace; font-size: 12px; font-weight: 700; }

        /* Details */
        .r-detail { padding: 14px 18px; border-bottom: 1.5px solid ${ACC}; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px; }
        .detail-row:last-child { margin-bottom: 0; }
        .detail-key { font-family: monospace; font-size: 9px; letter-spacing: 0.16em; color: rgba(26,12,4,0.45); }
        .detail-val { font-family: monospace; font-size: 12px; font-weight: 700; }
        .acct-num   { font-family: monospace; font-size: 15px; font-weight: 700; color: ${ACC}; letter-spacing: 0.08em; }

        /* Total bar */
        .r-total {
          padding: 14px 18px; background: ${INK}; color: ${BG};
          display: flex; justify-content: space-between; align-items: baseline;
        }
        .total-label { font-family: monospace; font-size: 11px; letter-spacing: 0.18em; }
        .total-amount{
          font-family: 'Bebas Neue', sans-serif; font-size: 34px;
          color: #d6b24a; letter-spacing: 0.02em;
        }

        /* Pay section */
        .r-pay { padding: 16px 18px; border-bottom: 1.5px solid ${ACC}; }
        .pay-label { font-family: monospace; font-size: 9px; letter-spacing: 0.22em; color: ${ACC}; margin-bottom: 10px; }

        /* Footer tear */
        .r-tear {
          padding: 10px; border-top: 1px dashed ${ACC}; text-align: center;
          font-family: monospace; font-size: 9px; letter-spacing: 0.22em;
          color: rgba(26,12,4,0.3);
        }

        /* Buttons */
        .wa-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 14px; padding: 13px;
          background: #25D366; color: #fff;
          text-decoration: none; font-family: monospace; font-size: 10px;
          letter-spacing: 0.18em; font-weight: 700;
          border: 1.5px solid ${ACC};
          transition: opacity 0.15s;
        }
        .wa-btn:hover { opacity: 0.88; }

        .new-order-btn {
          display: block; width: 100%; margin-top: 8px; padding: 13px;
          background: transparent; color: ${INK};
          border: 1.5px solid ${ACC}; text-align: center;
          font-family: monospace; font-size: 10px; letter-spacing: 0.18em;
          font-weight: 700; cursor: pointer; text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .new-order-btn:hover { background: ${INK}; color: ${BG}; }
      `}</style>

      <div className="page">
        <div className="wrap">

          <div className="stamp">RECEIVED →</div>

          <div className="receipt">
            {/* Header */}
            <div className="r-head">
              <div className="r-brand">UNCLE SOJI'S</div>
              <div className="r-tagline">→ LAGOS · SUYA HOUSE ←</div>
            </div>

            {/* Meta */}
            <div className="r-meta">
              <div className="meta-cell">
                <div className="meta-key">ORDER</div>
                <div className="meta-val">{orderId}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-key">DATE</div>
                <div className="meta-val">{today}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-key">NAME</div>
                <div className="meta-val">{name}</div>
              </div>
              <div className="meta-cell">
                <div className="meta-key">PHONE</div>
                <div className="meta-val">{phone}</div>
              </div>
            </div>

            {/* Total */}
            <div className="r-total">
              <span className="total-label">TOTAL DUE</span>
              <span className="total-amount">₦{parseInt(total).toLocaleString()}</span>
            </div>

            {/* Payment */}
            <div className="r-pay">
              <div className="pay-label">→ PAY TO</div>
              <div className="detail-row">
                <span className="detail-key">BANK</span>
                <span className="detail-val">MONIEPOINT MFB</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">NAME</span>
                <span className="detail-val">UNCLE SOJI'S</span>
              </div>
              <div className="detail-row">
                <span className="detail-key">ACCT</span>
                <span className="acct-num">1234 5678 90</span>
              </div>
            </div>

            {/* Tear */}
            <div className="r-tear">
              THANK YOU · COME AGAIN · THANK YOU · COME AGAIN
            </div>
          </div>

          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="wa-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.054 23.447a.5.5 0 00.607.61l5.753-1.507A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.887 9.887 0 01-5.031-1.374l-.361-.214-3.736.979.997-3.648-.235-.374A9.869 9.869 0 012.106 12C2.106 6.527 6.527 2.106 12 2.106S21.894 6.527 21.894 12 17.473 21.894 12 21.894z"/>
            </svg>
            SEND RECEIPT ON WHATSAPP
          </a>

          <a href="/chat" className="new-order-btn">PLACE ANOTHER ORDER →</a>

        </div>
      </div>
    </>
  );
}

export default function ConfirmationPage() {
  return <Suspense><ConfirmationContent /></Suspense>;
}
