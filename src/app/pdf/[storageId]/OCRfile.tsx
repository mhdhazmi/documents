import React from 'react';
import { OCRResult } from '../../../../convex/ocrSchema';


export default function OCRFilePreview({
  ocrResult,
  closed
}: {
  ocrResult: OCRResult;
  closed: boolean;
}) {
  // Ensure arrays always exist to avoid length errors
  const keywordsArabic = ocrResult.keywordsArabic || [];
  const keywordsEnglish = ocrResult.keywordsEnglish || [];

  return (
    <div className="my-3 md:my-6">
      <div className="bg-emerald-950/70 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/20 shadow-lg">
        <div className="flex flex-col w-full h-full overflow-y-auto px-2 md:px-4">
          <h2 className="text-xl md:text-2xl font-semibold mb-2 md:mb-4 text-white text-right">نتائج التحويل إلى نصوص</h2>
          
          {closed ? 
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3>
            :
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مفتوح المصدر (يمكن استضافته داخل الوزارة)</h3>
          }

          <div className="flex flex-col gap-4">
            {/* Arabic Text */}
            <div>
              <h4 className="text-white text-right mb-2">النص العربي:</h4>
              <div 
                className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[150px] md:min-h-[200px] max-h-[200px] md:max-h-[300px] overflow-y-auto shadow-inner"
                dir="rtl"
              >
                <pre className="whitespace-pre-wrap text-right font-sans text-sm md:text-base">
                  {ocrResult.arabic || "يتم الآن تحليل الملف وتحويله إلى نص"}
                </pre>
              </div>
            </div>
            
            {/* English Translation */}
            {ocrResult.english && (
              <div>
                <h4 className="text-white text-right mb-2">الترجمة الإنجليزية:</h4>
                <div 
                  className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[100px] md:min-h-[150px] max-h-[200px] overflow-y-auto shadow-inner"
                  dir="ltr"
                >
                  <pre className="whitespace-pre-wrap text-left font-sans text-sm md:text-base">
                    {ocrResult.english}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Keywords */}
            {(keywordsArabic.length > 0 || keywordsEnglish.length > 0) && (
              <div className="flex flex-col md:flex-row gap-4">
                {/* Arabic Keywords */}
                {keywordsArabic.length > 0 && (
                  <div className="flex-1">
                    <h4 className="text-white text-right mb-2">الكلمات الوصفية (عربي):</h4>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {keywordsArabic.map((keyword, index) => (
                        <span 
                          key={index} 
                          className="bg-emerald-700/60 text-white px-3 py-1 rounded-full text-sm"
                          dir="rtl"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* English Keywords */}
                {keywordsEnglish.length > 0 && (
                  <div className="flex-1">
                    <h4 className="text-white text-right mb-2">الكلمات الوصفية (إنجليزي):</h4>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {keywordsEnglish.map((keyword, index) => (
                        <span 
                          key={index} 
                          className="bg-blue-700/60 text-white px-3 py-1 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}