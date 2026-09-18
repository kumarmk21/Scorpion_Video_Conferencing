import React from "react";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  variant?: "badge" | "inline";
}

export const ScopMeetLogo: React.FC<Props> = ({
  size = "md",
  showWordmark = true,
  className = "",
  variant = "inline",
}) => {
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-11 h-11",
    xl: "w-16 h-16",
  }[size];

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl",
  }[size];

  // The distinctive aerodynamic Scorpion "S" oval emblem
  const Emblem = () => (
    <div
      className={`${iconDimensions} shrink-0 relative rounded-xl bg-[#E10600] flex items-center justify-center shadow-md shadow-red-950/40 overflow-hidden border border-red-500/40`}
      title="ScopMeet"
    >
      <svg
        viewBox="0 0 100 60"
        className="w-4/5 h-4/5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Aerodynamic speed oval in pure white */}
        <path
          d="M12 36 C8 24 22 10 52 7 C82 4 94 16 90 28 C86 40 70 50 44 53 C22 55 14 44 12 36 Z"
          fill="#FFFFFF"
        />
        {/* Dynamic cut-outs creating the sharp Scorpion "S" inside the white oval */}
        <path
          d="M26 30 C34 26 50 24 66 23 C76 22 80 25 72 30 C60 37 42 39 32 40 C26 40 24 33 26 30 Z"
          fill="#E10600"
        />
        <path
          d="M42 18 C58 16 74 15 82 17 C78 20 66 22 52 23 C42 24 38 21 42 18 Z"
          fill="#E10600"
        />
        <path
          d="M20 37 C28 37 36 36 46 34 C40 39 30 42 22 42 C18 42 17 38 20 37 Z"
          fill="#E10600"
        />
      </svg>
    </div>
  );

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-[#E10600] text-white shadow-xl shadow-red-950/50 border border-red-500/60 select-none ${className}`}
      >
        <svg
          viewBox="0 0 120 70"
          className="w-20 sm:w-28 h-auto mb-1.5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 42 C9 28 26 12 62 8 C98 5 112 19 107 33 C102 47 83 58 52 61 C26 64 16 51 14 42 Z"
            fill="#FFFFFF"
          />
          <path
            d="M31 35 C40 30 60 28 79 27 C91 26 95 30 86 35 C71 43 50 45 38 47 C31 47 29 39 31 35 Z"
            fill="#E10600"
          />
          <path
            d="M50 21 C69 19 88 18 98 20 C93 24 79 26 62 27 C50 28 45 25 50 21 Z"
            fill="#E10600"
          />
          <path
            d="M24 43 C33 43 43 42 55 40 C48 45 36 49 26 49 C21 49 20 44 24 43 Z"
            fill="#E10600"
          />
        </svg>
        <span className="text-xl sm:text-2xl font-black italic tracking-wide font-sans text-white drop-shadow-sm flex items-center gap-0.5">
          ScopMeet
          <span className="text-[10px] font-bold not-italic border border-white/80 rounded-full w-3.5 h-3.5 flex items-center justify-center ml-0.5 opacity-90">
            R
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <Emblem />
      {showWordmark && (
        <div className="flex items-baseline gap-1">
          <span
            className={`font-black italic tracking-tight text-white font-sans ${textSizes}`}
          >
            Scop<span className="text-[#E10600]">Meet</span>
          </span>
          <span className="text-[9px] font-bold text-red-400/90 border border-red-500/40 rounded px-1 py-0.2 uppercase tracking-widest hidden sm:inline-block">
            Pro
          </span>
        </div>
      )}
    </div>
  );
};
