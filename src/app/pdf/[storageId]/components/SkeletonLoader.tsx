import React from 'react';

export default function SkeletonLoader() {
  return (
    <div 
      className='flex flex-row items-start justify-center min-h-screen p-4 animate-pulse'
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* PDF Viewer Skeleton */}
      <div className="w-1/2 pr-2">
        <div className="w-full h-[900px] bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl"></div>
      </div>
      
      {/* OCR Results Skeleton */}
      <div className="w-1/2 pl-4 pr-2">
        <div className="h-8 w-64 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl mb-6"></div>
        
        {/* Gemini Results Skeleton */}
        <div className="mb-8">
          <div className="h-6 w-48 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl mb-3"></div>
          <div className="h-32 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl mb-3"></div>
          <div className="flex space-x-2 mb-6">
            <div className="h-8 w-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl"></div>
            <div className="h-8 w-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl"></div>
          </div>
        </div>
        
        {/* Replicate Results Skeleton */}
        <div className="mb-8">
          <div className="h-6 w-48 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl mb-3"></div>
          <div className="h-32 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl mb-3"></div>
          <div className="flex space-x-2 mb-6">
            <div className="h-8 w-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl"></div>
            <div className="h-8 w-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 