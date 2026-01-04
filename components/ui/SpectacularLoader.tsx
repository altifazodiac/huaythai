import React from 'react';

interface SpectacularLoaderProps {
  message?: string;
  baseColor?: 'sky' | 'red' | 'pink' | 'yellow' | 'indigo'; // Add more base colors as needed
}

const SpectacularLoader: React.FC<SpectacularLoaderProps> = ({
  message,
  baseColor = 'sky',
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/85 dark:bg-background/95 backdrop-blur-lg">
      <div className="relative flex justify-center items-center w-32 h-32">
        {/* Multiple rotating arcs for a more dynamic effect */}
        <div className={`absolute w-24 h-24 border-4 border-transparent border-t-${baseColor}-500 border-r-${baseColor}-500 rounded-full animate-spin-slow`}></div>
        <div className={`absolute w-20 h-20 border-4 border-transparent border-b-${baseColor}-400 border-l-${baseColor}-400 rounded-full animate-spin-medium opacity-80`}></div>
        <div className={`absolute w-16 h-16 border-t-2 border-b-2 border-${baseColor}-300 rounded-full animate-spin-fast opacity-70`}></div>
        
        {/* Central pulsating element */}
        <div className={`w-8 h-8 bg-${baseColor}-500 rounded-full animate-pulse opacity-90 shadow-xl`}></div>
      </div>
      {message && (
        <p className={`mt-8 text-foreground/90 text-xl font-semibold tracking-wider animate-pulse text-shadow-lg shadow-${baseColor}-500/50`}>
          {message}
        </p>
      )}
      <style jsx global>{`
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        @keyframes spin-medium {
          to { transform: rotate(-360deg); }
        }
        @keyframes spin-fast {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 3.5s linear infinite; }
        .animate-spin-medium { animation: spin-medium 2.5s linear infinite; }
        .animate-spin-fast { animation: spin-fast 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite; }
        .text-shadow-lg { text-shadow: 0 0 15px var(--tw-shadow-color), 0 0 5px var(--tw-shadow-color); }
      `}</style>
    </div>
  );
};

export default SpectacularLoader;