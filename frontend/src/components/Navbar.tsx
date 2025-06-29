import React from 'react';

const Navbar: React.FC = () => (
  <header className="w-full flex items-center justify-between px-6 py-4 font-bold text-2xl text-primary tracking-tight bg-transparent shadow-none">
    <span className="text-2xl sm:text-3xl font-bold font-[Inter]">
      <span className="text-blue-900">Git</span>
      <span className="text-sky-500">Bridge</span>
    </span>
  </header>
);

export default Navbar; 