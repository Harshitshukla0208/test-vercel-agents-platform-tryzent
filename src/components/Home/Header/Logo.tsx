import React from 'react';
import LogoImage from '../../../assets/logo.jpeg'
import Image from 'next/image';

const Logo = () => {
    return (
        <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="rounded-lg" />
            <Image src={LogoImage} alt='logo' className='h-5 w-5 sm:h-7 sm:w-7 rounded-md' />
            <span className="text-gray-100 font-semibold text-base sm:text-xl">Tryzent</span>
        </div>
    );
};

export default Logo;
