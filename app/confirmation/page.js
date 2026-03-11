'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Customer';
  const phone = searchParams.get('phone') || '';
  const total = searchParams.get('total') || '0';

  const whatsappMessage = 'Hi Uncle Soji! I just placed an order.\n\nName: ' + name + '\nPhone: ' + phone + '\nTotal: ₦' + parseInt(total).toLocaleString() + '\n\nPlease find my payment receipt attached.';
  const whatsappUrl = 'https://wa.me/2348012345678?text=' + encodeURIComponent(whatsappMessage);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brown:       #623920;
          --brown-hover: #4e2d18;
          --gold:        #d6b24a;
          --gold-pale:   #f9f0d4;
          --cream:       #f2f0e9;
          --green:       #829460;
          --green-hover: #6b7b4e;
          --white:       #ffffff;
          --text:        #2a1a08;
          --text-mid:    #6b4c2a;
          --text-soft:   #a08860;
          --border:      #ddd5c0;
          --border-soft: #ece8de;
        }

        body { background: var(--cream); font-family: 'DM Sans', sans-serif; color: var(--text); min-height: 100vh; }

        .page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 24px; background: var(--cream);
        }

        .card {
          width: 100%; max-width: 460px;
          background: var(--white); border: 1px solid var(--border);
          border-radius: 24px; overflow: hidden;
          animation: fadeUp 0.45s ease;
          box-shadow: 0 12px 56px rgba(98,57,32,0.1);
        }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

        /* Top section: brown with gold checkmark */
        .card-top {
          background: var(--brown);
          padding: 32px 28px 26px; text-align: center;
          position: relative;
        }

        /* Green bottom border on top section */
        .card-top::after {
          content: ''; display: block;
          height: 4px; background: linear-gradient(90deg, var(--brown), var(--gold) 50%, var(--green));
          position: absolute; bottom: 0; left: 0; right: 0;
        }

        .check-circle {
          width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%;
          background: var(--gold);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 22px rgba(214,178,74,0.4);
        }

        .heading {
          font-family: 'Playfair Display', serif;
          font-size: 25px; font-weight: 700; color: #fff; margin-bottom: 7px;
        }

        .subheading { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.65; }

        .card-body { padding: 24px 26px; display: flex; flex-direction: column; gap: 12px; }

        /* Summary card */
        .info-block {
          background: var(--cream); border: 1px solid var(--border-soft);
          border-radius: 14px; overflow: hidden;
        }

        .block-header {
          background: var(--white); border-bottom: 1px solid var(--border-soft);
          padding: 10px 16px;
          display: flex; align-items: center; gap: 7px;
        }

        .block-dot { width: 6px; height: 6px; border-radius: 50%; }
        .block-dot.brown { background: var(--brown); }
        .block-dot.green { background: var(--green); }

        .block-label {
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          font-weight: 600; color: var(--text-soft);
        }

        .block-rows { padding: 4px 0; }

        .detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 16px; font-size: 13px;
        }

        .detail-row + .detail-row { border-top: 1px solid var(--border-soft); }
        .detail-key { color: var(--text-soft); }
        .detail-value { color: var(--text); font-weight: 500; }

        .total-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; margin-top: 2px;
          border-top: 1px solid var(--border);
          background: var(--white);
        }

        .total-key { font-size: 13px; color: var(--text); font-weight: 600; }
        .total-val { font-family: 'Playfair Display', serif; color: var(--gold); font-size: 22px; font-weight: 700; }

        /* Bank details */
        .acct-number {
          font-family: 'Playfair Display', serif;
          color: var(--gold); font-size: 20px; letter-spacing: 0.08em; font-weight: 700;
        }

        /* WhatsApp button */
        .whatsapp-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: #f1faf1; border: 1px solid #b8ddb8; border-radius: 10px;
          color: #2e7d32; text-decoration: none;
          padding: 12px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          transition: all 0.2s; margin: 0 16px 14px;
        }

        .whatsapp-btn:hover { background: #e3f5e3; border-color: #4caf50; }

        /* Notice */
        .notice {
          font-size: 12px; color: var(--text-soft); text-align: center;
          line-height: 1.65; padding: 0 4px;
        }

        /* CTA */
        .new-order-btn {
          display: block; width: 100%; padding: 14px;
          background: var(--green); color: #fff; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          text-align: center; text-decoration: none; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.02em;
          box-shadow: 0 4px 14px rgba(130,148,96,0.28);
        }

        .new-order-btn:hover { background: var(--green-hover); transform: translateY(-1px); }
      `}</style>

      <div className="page">
        <div className="card">
          {/* TOP */}
          <div className="card-top">
            <div className="check-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#623920" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="heading">Order Received</div>
            <div className="subheading">Thank you for ordering from Uncle Soji's.<br/>Your suya is on its way. 🔥</div>
          </div>

          <div className="card-body">
            {/* Order summary */}
            <div className="info-block">
              <div className="block-header">
                <div className="block-dot brown" />
                <div className="block-label">Order Summary</div>
              </div>
              <div className="block-rows">
                <div className="detail-row">
                  <span className="detail-key">Name</span>
                  <span className="detail-value">{name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Phone</span>
                  <span className="detail-value">{phone}</span>
                </div>
              </div>
              <div className="total-row">
                <span className="total-key">Amount Due</span>
                <span className="total-val">₦{parseInt(total).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment details */}
            <div className="info-block">
              <div className="block-header">
                <div className="block-dot green" />
                <div className="block-label">Payment Details</div>
              </div>
              <div className="block-rows">
                <div className="detail-row">
                  <span className="detail-key">Bank</span>
                  <span className="detail-value">Moniepoint MFB</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Account Name</span>
                  <span className="detail-value">Uncle Soji's Suya Spot</span>
                </div>
                <div className="detail-row">
                  <span className="detail-key">Account Number</span>
                  <span className="acct-number">1234567890</span>
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#4caf50">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.857L.054 23.447a.5.5 0 00.607.61l5.753-1.507A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.887 9.887 0 01-5.031-1.374l-.361-.214-3.736.979.997-3.648-.235-.374A9.869 9.869 0 012.106 12C2.106 6.527 6.527 2.106 12 2.106S21.894 6.527 21.894 12 17.473 21.894 12 21.894z"/>
              </svg>
              Send Payment Receipt on WhatsApp
            </a>

            <p className="notice">We'll contact you on <strong>{phone}</strong> once your payment is confirmed. Sharp sharp! 🔥</p>

            <a href="/chat" className="new-order-btn">Place Another Order</a>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ConfirmationPage() {
  return <Suspense><ConfirmationContent /></Suspense>;
}