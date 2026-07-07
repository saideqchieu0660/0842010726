import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Link2, X, Settings } from 'lucide-react';

export function ApiSetupOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleShow = () => setIsVisible(true);
    window.addEventListener('show-api-setup', handleShow);
    return () => window.removeEventListener('show-api-setup', handleShow);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center">
                     <Key className="w-6 h-6" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">Yêu Cầu API Key (BYOK)</h2>
                     <p className="text-zinc-500">Bạn đã hết lượt dùng thử System API miễn phí.</p>
                  </div>
               </div>
               <button onClick={() => setIsVisible(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="space-y-4 text-zinc-700 dark:text-zinc-300">
               <p>
                 Để tiếp tục sử dụng các tính năng AI (Agent, tạo bài tập, tự động hóa), hệ thống yêu cầu bạn phải kết nối <strong>API Key cá nhân</strong>. Việc này giúp đảm bảo tài nguyên hệ thống và cho phép bạn sử dụng AI <strong>không giới hạn</strong>.
               </p>

               <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-5 rounded-xl space-y-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Hướng dẫn kết nối:</h3>
                  <ol className="list-decimal pl-5 space-y-3">
                     <li>
                       <div className="font-medium">Lấy API Key:</div>
                       <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                          <li>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">Google AI Studio (Gemini) <Link2 className="w-3 h-3"/></a> - Khuyên dùng
                          </li>
                          <li>
                            <a href="https://cloud.cerebras.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">Cerebras Cloud <Link2 className="w-3 h-3"/></a> - Rất nhanh
                          </li>
                       </ul>
                     </li>
                     <li>
                        <div className="font-medium">Cấu hình hệ thống:</div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          Vào <strong>Cài đặt</strong> (Biểu tượng <Settings className="w-3 h-3 inline align-middle mx-1" />) {'>'} Tìm mục <strong>Personal API Keys (BYOK)</strong>.
                        </p>
                     </li>
                     <li>Dán mã API Key của bạn vào và nhấn <strong>Lưu</strong>.</li>
                  </ol>
               </div>
               
               <p className="text-sm text-zinc-500 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg border border-orange-100 dark:border-orange-900/20">
                  <strong className="text-orange-700 dark:text-orange-400">Bảo mật:</strong> API Key của bạn được lưu trữ an toàn trong tài khoản của bạn và không bao giờ bị hiển thị cho bất kỳ ai khác (kể cả quản trị viên). Nó chỉ được dùng để gọi AI cho chính bạn.
               </p>
            </div>

            <div className="pt-2 flex justify-end">
               <button onClick={() => setIsVisible(false)} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
                 Đã hiểu
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
