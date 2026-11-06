import React, { useState } from 'react';
import {
  Car,
  HandHeart,
  Home,
  PawPrint,
  ShieldAlert,
  Shirt,
  Sparkles,
  Wind,
} from 'lucide-react';
import { CategoryIconName } from '../types/commerce';

interface CategoryIconProps {
  name: CategoryIconName;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-6 h-6' }) => {
  switch (name) {
    case 'Home':
      return <Home className={className} />;
    case 'Shirt':
      return <Shirt className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'HandHeart':
      return <HandHeart className={className} />;
    case 'PawPrint':
      return <PawPrint className={className} />;
    case 'Wind':
      return <Wind className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

interface ProductImageProps {
  src: string;
  alt: string;
  volumeLabel?: string;
  className?: string;
}

export const ProductImageWithFallback: React.FC<ProductImageProps> = ({
  src,
  alt,
  volumeLabel,
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] flex flex-col items-center justify-center p-4 text-center text-zinc-900 border border-[#FDE68A]">
        <Sparkles className="w-8 h-8 text-[#E3262E] mb-2" />
        <span className="text-xs font-extrabold uppercase line-clamp-2 max-w-[180px]">{alt}</span>
        {volumeLabel && (
          <span className="mt-1 text-[11px] font-mono font-bold text-[#B45309]">{volumeLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={className}
        loading="lazy"
      />
    </div>
  );
};
