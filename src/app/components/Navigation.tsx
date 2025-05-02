import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 flex items-center justify-center border-b border-emerald-900 bg-emerald-950 backdrop-blur-sm z-10">
      <div className="max-w-screen-xl w-full mx-auto px-4 flex justify-center">
        <Link href="/" className="flex items-center">
          {/* Replace with your actual logo or use a placeholder */}
          <div className="relative w-40 h-10">
            <Image 
              src="/logo.svg" 
              alt="Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
            />
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation; 