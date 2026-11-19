import React, { useState } from 'react';
import {
  Bath,
  Beaker,
  Briefcase,
  Brush,
  Building2,
  Car,
  ChefHat,
  Droplets,
  FlaskConical,
  Flower2,
  HandHeart,
  Home,
  Hospital,
  Leaf,
  Package,
  PaintBucket,
  PawPrint,
  Recycle,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  ShowerHead,
  Sparkles,
  SprayCan,
  Trash2,
  Utensils,
  Waves,
  Wind,
} from 'lucide-react';
import { CategoryIconName } from '../types/commerce';

export interface CategoryIconMeta {
  name: CategoryIconName;
  label: string;
  keywords: string;
}

export const CATEGORY_ICON_CATALOG: CategoryIconMeta[] = [
  { name: 'SprayCan', label: 'Spray Multiuso', keywords: 'spray borrifador multiuso vidro' },
  { name: 'Droplets', label: 'Galões / Líquidos', keywords: 'liquido agua galao detergente' },
  { name: 'FlaskConical', label: 'Químicos / Cloro', keywords: 'quimico cloro hipoclorito acido' },
  { name: 'Beaker', label: 'Diluição / Concentr.', keywords: 'diluicao formula concentrado dosador' },
  { name: 'Sparkles', label: 'Brilho / Geral', keywords: 'brilho limpeza geral multiuso' },
  { name: 'ShieldAlert', label: 'Limpeza Pesada', keywords: 'pesada desincrustante obra industrial' },
  { name: 'ShieldCheck', label: 'Sanitizantes', keywords: 'desinfetante sanitizante bactericida' },
  { name: 'Waves', label: 'Piscina / Água', keywords: 'piscina cloro algicida tratamento' },
  { name: 'Bath', label: 'Banheiro / Louças', keywords: 'banheiro sanitario vaso louca' },
  { name: 'ShowerHead', label: 'Box / Azulejos', keywords: 'box azulejo vidro banheiro' },
  { name: 'Brush', label: 'Escovas / Piso', keywords: 'escova vassoura rodo piso' },
  { name: 'PaintBucket', label: 'Baldes / Ceras', keywords: 'balde cera impermeabilizante piso' },
  { name: 'Utensils', label: 'Cozinha / Food', keywords: 'cozinha restaurante louca prato' },
  { name: 'ChefHat', label: 'Desengordurante', keywords: 'gordura coifa fogao quimi 90' },
  { name: 'Shirt', label: 'Lavanderia', keywords: 'roupa amaciante sabao alvejante' },
  { name: 'Home', label: 'Linha Casa', keywords: 'casa lar domestico ambiente' },
  { name: 'Wind', label: 'Aromatizantes', keywords: 'aroma cheiro odorizador spray' },
  { name: 'Flower2', label: 'Essência Floral', keywords: 'floral lavanda cerejeira perfume' },
  { name: 'Leaf', label: 'Eco / Natural', keywords: 'biodegradavel neutro vegetal eco' },
  { name: 'HandHeart', label: 'Sabonetes / Mãos', keywords: 'sabonete liquido mao alcool gel' },
  { name: 'Car', label: 'Automotivo', keywords: 'carro lava jato pneu pretinho cera' },
  { name: 'PawPrint', label: 'Linha Pet', keywords: 'pet cachorro gato eliminador odor' },
  { name: 'Hospital', label: 'Hospitalar', keywords: 'clinica hospitalar consultorio assepsia' },
  { name: 'Building2', label: 'Condomínios', keywords: 'condominio predio portaria hall' },
  { name: 'Briefcase', label: 'Corporativo', keywords: 'empresa escritorio comercio' },
  { name: 'Trash2', label: 'Sacos / Lixeiras', keywords: 'saco lixo lixeira descarte' },
  { name: 'Recycle', label: 'Coleta / Recicl.', keywords: 'reciclagem coleta seletiva' },
  { name: 'Package', label: 'Fardos / Atacado', keywords: 'atacado fardo caixa estoque' },
];

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
    case 'SprayCan':
      return <SprayCan className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Beaker':
      return <Beaker className={className} />;
    case 'Waves':
      return <Waves className={className} />;
    case 'Bath':
      return <Bath className={className} />;
    case 'ShowerHead':
      return <ShowerHead className={className} />;
    case 'Brush':
      return <Brush className={className} />;
    case 'PaintBucket':
      return <PaintBucket className={className} />;
    case 'Trash2':
      return <Trash2 className={className} />;
    case 'Recycle':
      return <Recycle className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'ChefHat':
      return <ChefHat className={className} />;
    case 'Hospital':
      return <Hospital className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Leaf':
      return <Leaf className={className} />;
    case 'Flower2':
      return <Flower2 className={className} />;
    case 'Package':
      return <Package className={className} />;
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
