import React, { useState, useEffect, useCallback } from 'react';
import { FileText, TrendingUp, Plus, ShieldCheck, CheckCircle2, AlertTriangle, Send, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface RfqAndForecastingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

async function safeParseJson(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Unexpected response format (${response.status})`);
  }
  return await response.json();
}

export const RfqAndForecastingModal: React.FC<RfqAndForecastingModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rfq' | 'forecasting'>('rfq');
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New RFQ form state
  const [itemTitle, setItemTitle] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [targetPrice, setTargetPrice] = useState('');
  const [specs, setSpecs] = useState('');
  const [deadline, setDeadline] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      if (!token) {
        setRfqs([]);
        setPredictions([]);
        setAiSummary('');
        setErrorMsg('Please sign in to access live wholesale RFQs and AI inventory demand forecasting.');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [rfqRes, forecastRes] = await Promise.all([
        fetch('/api/rfq', { headers }),
        fetch('/api/forecasting/predict', { headers })
      ]);

      if (rfqRes.ok) {
        const rfqData = await safeParseJson(rfqRes);
        if (rfqData.success) {
          setRfqs(rfqData.rfqs || []);
        }
      } else {
        const errBody = await safeParseJson(rfqRes).catch(() => ({}));
        setErrorMsg(errBody?.error || 'Could not load active RFQs.');
      }

      if (forecastRes.ok) {
        const forecastData = await safeParseJson(forecastRes);
        if (forecastData.success) {
          setPredictions(forecastData.predictions || []);
          setAiSummary(forecastData.aiSummary || '');
        }
      } else {
        const errBody = await safeParseJson(forecastRes).catch(() => ({}));
        setErrorMsg((prev) => prev || errBody?.error || 'Could not load demand forecasts.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach RFQ & forecasting service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchData();
    }
  }, [isOpen, fetchData]);

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle) return;
    setErrorMsg('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      if (!token) {
        setErrorMsg('Please sign in before broadcasting a bulk RFQ.');
        return;
      }

      const res = await fetch('/api/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          itemTitle,
          quantity: Number(quantity),
          targetPricePerUnit: Number(targetPrice || 0),
          specifications: specs,
          deliveryDeadline: deadline
        })
      });
      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setSuccessMsg('Bulk RFQ submitted successfully to verified wholesalers!');
        setItemTitle('');
        setTargetPrice('');
        setSpecs('');
        void fetchData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data?.error || 'Failed to submit RFQ.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'RFQ submission failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Option 4: AI Demand Forecasting & Bulk RFQ Engine</h2>
              <p className="text-xs text-emerald-100">B2B Wholesaler Procurement & AI Inventory Prediction</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={() => setActiveTab('rfq')}
            className={`py-3 px-6 font-semibold text-sm flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'rfq'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bulk RFQ & Custom Quotes ({rfqs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('forecasting')}
            className={`py-3 px-6 font-semibold text-sm flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'forecasting'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>AI Demand Forecasting ({predictions.length} SKUs)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm font-medium">{errorMsg}</span>
            </div>
          )}

          {activeTab === 'rfq' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* RFQ Creation Form */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2 text-base">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Submit New RFQ</span>
                </h3>
                <form onSubmit={handleCreateRfq} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Product Title / Requirement *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cotton Polo Shirts (Export Quality)"
                      value={itemTitle}
                      onChange={e => setItemTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Quantity (MOQ)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Target Price (BDT)</label>
                      <input
                        type="number"
                        placeholder="e.g. 150"
                        value={targetPrice}
                        onChange={e => setTargetPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Detailed Specifications</label>
                    <textarea
                      rows={2}
                      placeholder="GSM 180, 100% Combed Cotton, Assorted Sizes..."
                      value={specs}
                      onChange={e => setSpecs(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Delivery Deadline</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Broadcast to Verified Wholesalers</span>
                  </button>
                </form>
              </div>

              {/* Active RFQ List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Active RFQs & Vendor Bids</h3>
                {loading ? (
                  <div className="text-center py-10 text-slate-500">Loading RFQs...</div>
                ) : rfqs.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                    No active RFQs. Create one to receive competitive wholesale bids.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rfqs.map(rfq => (
                      <div key={rfq.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                              {rfq.status}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1">{rfq.itemTitle}</h4>
                            <p className="text-xs text-slate-500">Buyer: {rfq.buyerName} • Target: ৳{rfq.targetPricePerUnit || 'Open'} per unit</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Qty: {rfq.quantity?.toLocaleString()} pcs</span>
                            <p className="text-xs text-slate-500">Deadline: {rfq.deliveryDeadline || 'Flexible'}</p>
                          </div>
                        </div>

                        {rfq.specifications && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                            <strong>Specs:</strong> {rfq.specifications}
                          </p>
                        )}

                        {/* Quotes */}
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
                          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Wholesaler Quotes ({rfq.quotes?.length || 0})</span>
                          </h5>
                          {rfq.quotes?.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Waiting for verified wholesalers to submit competitive pricing bids...</p>
                          ) : (
                            <div className="space-y-2">
                              {rfq.quotes.map((q: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900 text-xs">
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-white">{q.vendorName}</span>
                                    <p className="text-slate-600 dark:text-slate-400">{q.notes}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">৳{q.quotedPricePerUnit}/unit</span>
                                    <button className="block mt-1 px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition">
                                      Accept & Escrow
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'forecasting' && (
            <div className="space-y-6">
              {aiSummary && (
                <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-teal-800 dark:text-teal-300 font-semibold text-sm">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Gemini AI Supply Chain & Market Insight</span>
                  </div>
                  <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed">{aiSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {predictions.map((p, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {p.sku}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          p.urgency === 'HIGH' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {p.urgency} URGENCY
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{p.productName}</h4>
                      <p className="text-xs text-slate-500 mt-1">{p.marketTrend}</p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Stock:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{p.currentStock} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stockout Risk:</span>
                        <span className="font-bold text-red-600">{p.stockoutRiskDays} days left</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recommended Reorder:</span>
                        <span className="font-bold text-emerald-600">{p.recommendedReorderQty} units</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMsg(`Generated automated restock order for ${p.recommendedReorderQty} units of ${p.sku}.`);
                        setTimeout(() => setSuccessMsg(''), 4000);
                      }}
                      className="w-full mt-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
                    >
                      Instant Restock (1-Click)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-sm transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
