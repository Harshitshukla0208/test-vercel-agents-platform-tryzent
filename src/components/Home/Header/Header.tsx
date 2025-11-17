import React from 'react';
import Logo from './Logo';
import Navbar from './Navbar';

const Header = () => {
    return (
        <header className="bg-[#1F1726]">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
                <Logo />
                <Navbar />
            </div>
        </header>
    );
};

export default Header;
