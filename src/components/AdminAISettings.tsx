import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Users, Download } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export function AdminAISettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    trialRequests: 10,
    enableSystemApiSharing: true,
    requirePersonalApiAfterTrial: true,
  });
  const [stats, setStats] = useState({ totalAiRequests: 0, systemApiRequests: 0, personalApiRequests: 0 });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'config', 'ai_settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            trialRequests: data.trialRequests ?? 10,
            enableSystemApiSharing: data.enableSystemApiSharing ?? true,
            requirePersonalApiAfterTrial: data.requirePersonalApiAfterTrial ?? true,
          });
          setStats({
            totalAiRequests: data.totalAiRequests || 0,
            systemApiRequests: data.systemApiRequests || 0,
            personalApiRequests: data.personalApiRequests || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching AI settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'config', 'ai_settings');
      await setDoc(docRef, settings, { merge: true });
      toast.success('Lưu cấu hình AI thành công');
    } catch (err) {
      toast.error('Lỗi khi lưu cấu hình');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="card-3d p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">AI Access Control</h3>
            <p className="text-sm text-zinc-500">Quản lý chia sẻ System API và chính sách dùng thử (Personal API/BYOK)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Số lượt dùng thử System API miễn phí (User thông thường)</label>
            <input 
              type="number" 
              value={settings.trialRequests} 
              onChange={e => setSettings(s => ({ ...s, trialRequests: parseInt(e.target.value) || 0 }))}
              className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bật chia sẻ System API</p>
              <p className="text-sm text-zinc-500">Cho phép users dùng thử System API</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.enableSystemApiSharing} onChange={e => setSettings(s => ({ ...s, enableSystemApiSharing: e.target.checked }))} />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-orange-500"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Yêu cầu Personal API sau khi hết lượt thử</p>
              <p className="text-sm text-zinc-500">Nếu tắt, users sẽ bị chặn hoàn toàn</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.requirePersonalApiAfterTrial} onChange={e => setSettings(s => ({ ...s, requirePersonalApiAfterTrial: e.target.checked }))} />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-orange-500"></div>
            </label>
          </div>
          
          <div className="pt-4 flex justify-end">
             <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cấu hình
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-3d p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
           <p className="text-zinc-500 text-sm mb-1">Tổng Requests AI</p>
           <h3 className="text-3xl font-bold font-mono">{stats.totalAiRequests}</h3>
        </div>
        <div className="card-3d p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
           <p className="text-zinc-500 text-sm mb-1">System API Requests</p>
           <h3 className="text-3xl font-bold font-mono text-orange-500">{stats.systemApiRequests}</h3>
        </div>
        <div className="card-3d p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
           <p className="text-zinc-500 text-sm mb-1">Personal API Requests</p>
           <h3 className="text-3xl font-bold font-mono text-green-500">{stats.personalApiRequests}</h3>
        </div>
      </div>
    </div>
  );
}
