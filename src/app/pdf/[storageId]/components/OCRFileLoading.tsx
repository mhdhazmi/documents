// src/app/pdf/[storageId]/components/OCRFileLoading.tsx
import React from 'react';

interface OCRFileLoadingProps {
  // Control which parts of the skeleton to show
  showArabic?: boolean;
  showEnglish?: boolean; 
  showKeywords?: boolean;
  closed: boolean; // Match the OCRFilePreview API
}

export default function OCRFileLoading({
  showArabic = true,
  showEnglish = true,
  showKeywords = true,
  closed
}: OCRFileLoadingProps) {
  return (
    <div className="my-3 md:my-6">
      <div className="bg-emerald-950/70 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/20 shadow-lg">
        <div className="flex flex-col w-full h-full overflow-y-auto px-2 md:px-4">
          {/* Title */}
          <h2 className="text-xl md:text-2xl font-semibold mb-2 md:mb-4 text-white text-right">نتائج التحويل إلى نصوص</h2>
          
          {/* Subtitle */}
          {closed ? 
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3>
            :
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مفتوح المصدر (يمكن استضافته داخل الوزارة)</h3>
          }

          <div className="flex flex-col gap-4">
            {/* Arabic Text Skeleton */}
            {showArabic && (
              <div>
                <h4 className="text-white text-right mb-2">النص العربي:</h4>
                <div className="bg-white/40 p-3 rounded-lg min-h-[150px] md:min-h-[200px] animate-pulse">
                  <div className="h-4 bg-emerald-800/20 rounded w-full mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-4/5 mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-2/3"></div>
                </div>
              </div>
            )}
            
            {/* English Translation Skeleton */}
            {showEnglish && (
              <div>
                <h4 className="text-white text-right mb-2">الترجمة الإنجليزية:</h4>
                <div className="bg-white/40 p-3 rounded-lg min-h-[100px] md:min-h-[150px] animate-pulse">
                  <div className="h-4 bg-emerald-800/20 rounded w-full mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-emerald-800/20 rounded w-5/6"></div>
                </div>
              </div>
            )}
            
            {/* Keywords Skeleton */}
            {showKeywords && (
              <div className="flex flex-col md:flex-row gap-4">
                {/* Arabic Keywords */}
                <div className="flex-1">
                  <h4 className="text-white text-right mb-2">الكلمات الوصفية (عربي):</h4>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="bg-emerald-700/60 text-transparent px-3 py-1 rounded-full text-sm animate-pulse"
                      >
                        كلمة وصفية
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* English Keywords */}
                <div className="flex-1">
                  <h4 className="text-white text-right mb-2">الكلمات الوصفية (إنجليزي):</h4>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="bg-emerald-700/60 text-transparent px-3 py-1 rounded-full text-sm animate-pulse"
                      >
                        keyword
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}