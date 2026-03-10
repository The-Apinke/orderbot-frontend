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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">

        <div className="text-6xl mb-4">✅</div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Order Received!</h1>
        <p className="text-gray-500 mb-6">Thank you for ordering from Uncle Soji's Suya Spot 🔥</p>

        <div className="bg-orange-50 rounded-xl p-4 mb-6 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-800">{name}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">Phone</span>
            <span className="text-sm font-medium text-gray-800">{phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-sm font-bold text-orange-500">₦{parseInt(total).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-bold text-gray-800 mb-2">💳 Complete Your Payment</h3>
          <p className="text-sm text-gray-600 mb-3">
            To confirm your order and start preparation, please transfer your payment to:
          </p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Bank</span>
              <span className="text-sm font-medium text-gray-800">Moniepoint MFB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Account Name</span>
              <span className="text-sm font-medium text-gray-800">Uncle Soji's Suya Spot</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Account Number</span>
              <span className="text-sm font-bold text-orange-500">1234567890</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="text-sm font-bold text-gray-800">Amount to Pay</span>
              <span className="text-sm font-bold text-orange-500">₦{parseInt(total).toLocaleString()}</span>
            </div>
          </div>
          
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 w-full bg-green-500 text-white py-2 rounded-full text-sm font-medium hover:bg-green-600 transition">
            📲 Send Receipt on WhatsApp
          </a>
    
        </div>

        <p className="text-sm text-gray-400 mb-6">
          We will contact you on {phone} once payment is confirmed. Sharp sharp! 🔥
        </p>

        <a href="/chat" className="block w-full bg-orange-500 text-white py-3 rounded-full font-medium hover:bg-orange-600 transition text-center">Place Another Order</a>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}