import React from 'react';

interface MiningLogoProps {
  className?: string; // Additional Tailwind utility classes
  iconOnly?: boolean; // Whether to hide text
  light?: boolean; // Light or dark color style
}

export const MiningLogo: React.FC<MiningLogoProps> = ({
  className = "h-14",
  iconOnly = false,
  light = false
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {!iconOnly && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-wider text-xl md:text-2xl ${light ? 'text-white' : 'text-slate-900'}`}>
              WATU<span className="text-[#E85A1B]">PERKASA</span>ABADI
            </span>
          </div>
          <span className={`text-[10px] tracking-[0.25em] skeleton-text uppercase font-bold leading-none mt-1 ${light ? 'text-slate-400' : 'text-slate-500'}`}>
            PT. WATU PERKASA ABADI
          </span>
        </div>
      )}
    </div>
  );
};
