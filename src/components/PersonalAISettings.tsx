import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, Loader2, Link2, Trash2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export function PersonalAISettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showCerebras, setShowCerebras] = useState(false);

  useEffect(() => {
    const fetchKeys = async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.personalAiKeys) {
            setGeminiKey(data.personalAiKeys.gemini || '');
            setCerebrasKey(data.personalAiKeys.cerebras || '');
          }
        }
      } catch (err) {
        console.error("Error fetching AI keys", err);
      } finally {
        setLoading(false);
      }
    };
    fetchKeys();
  }, []);

  const handleSave = async () => {
    const user = getAuth().currentUser;
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { personalAiKeys: { gemini: geminiKey, cerebras: cerebrasKey } }, { merge: true });
      toast.success('Lưu API Keys thành công');
    } catch (err) {
      toast.error('Lỗi khi lưu API Keys');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (provider: 'gemini' | 'cerebras') => {
    if (provider === 'gemini') setGeminiKey('');
    else setCerebrasKey('');
    
    const user = getAuth().currentUser;
    if (!user) return;
    try {
       const updateData = provider === 'gemini' ? { gemini: '', cerebras: cerebrasKey } : { gemini: geminiKey, cerebras: '' };
       const docRef = doc(db, 'users', user.uid);
       await setDoc(docRef, { personalAiKeys: updateData }, { merge: true });
       toast.success(\`Đã xoá \${provider} key\`);
    } catch (err) {}
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg">
          <Key className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Personal API Keys (BYOK)</h3>
          <p className="text-sm text-zinc-500">Kết nối API Key của riêng bạn để sử dụng AI không giới hạn.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
             <div>
                <h4 className="font-medium flex items-center gap-2">Gemini API Key</h4>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1 mt-1">
                   Lấy key từ Google AI Studio <Link2 className="w-3 h-3" />
                </a>
             </div>
             {geminiKey && <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-md font-medium">Đã kết nối</span>}
          </div>
          <div className="relative">
             <input 
               type={showGemini ? "text" : "password"} 
               value={geminiKey} 
               onChange={e => setGeminiKey(e.target.value)}
               placeholder="AIzaSy..."
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 pr-24 font-mono text-sm"
             />
             <div className="absolute right-2 top-1.5 flex items-center gap-1">
                <button onClick={() => setShowGemini(!showGemini)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                   {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {geminiKey && (
                   <button onClick={() => handleRemove('gemini')} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                   </button>
                )}
             </div>
          </div>
        </div>

        <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
             <div>
                <h4 className="font-medium flex items-center gap-2">Cerebras API Key</h4>
                <a href="https://cloud.cerebras.ai/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1 mt-1">
                   Lấy key từ Cerebras Cloud <Link2 className="w-3 h-3" />
                </a>
             </div>
             {cerebrasKey && <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-md font-medium">Đã kết nối</span>}
          </div>
          <div className="relative">
             <input 
               type={showCerebras ? "text" : "password"} 
               value={cerebrasKey} 
               onChange={e => setCerebrasKey(e.target.value)}
               placeholder="csk-..."
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 pr-24 font-mono text-sm"
             />
             <div className="absolute right-2 top-1.5 flex items-center gap-1">
                <button onClick={() => setShowCerebras(!showCerebras)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                   {showCerebras ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {cerebrasKey && (
                   <button onClick={() => handleRemove('cerebras')} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                   </button>
                )}
             </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
           <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Lưu API Keys
           </button>
        </div>
      </div>
    </div>
  );
}
