import React from 'react'

interface LogoProps {
  className?: string
  iconSize?: number
  textSize?: string
  variant?: 'light' | 'dark'
}

export const LogoIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-7 h-7', size }) => (
  <div 
    className={`relative flex items-center justify-center shrink-0 rounded-xl bg-slate-900 p-1.5 shadow-sm ${className}`}
    style={size ? { width: size, height: size } : undefined}
  >
    <svg 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="clientLoopGradIcon" x1="6" y1="8" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path 
        d="M13 14C9.13401 14 6 17.134 6 21C6 24.866 9.13401 28 13 28C16.866 28 20 24.866 20 21C20 17.134 23.134 14 27 14C30.866 14 34 17.134 34 21C34 24.866 30.866 28 27 28C23.134 28 20 24.866 20 21" 
        stroke="url(#clientLoopGradIcon)" 
        strokeWidth="3.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="13" cy="21" r="2" fill="#60A5FA" />
      <circle cx="27" cy="21" r="2" fill="#2DD4BF" />
    </svg>
  </div>
)

export const Logo: React.FC<LogoProps> = ({
  className = '',
  iconSize = 30,
  textSize = 'text-xl',
  variant = 'dark'
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 font-semibold tracking-tight select-none ${className}`}>
      {/* Custom Loop Geometric Icon */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-slate-900 p-1.5 shadow-sm"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="clientLoopGrad" x1="6" y1="8" x2="34" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="0.5" stopColor="#6366F1" />
              <stop offset="1" stopColor="#14B8A6" />
            </linearGradient>
          </defs>
          {/* Continuous Loop Ribbon */}
          <path 
            d="M13 14C9.13401 14 6 17.134 6 21C6 24.866 9.13401 28 13 28C16.866 28 20 24.866 20 21C20 17.134 23.134 14 27 14C30.866 14 34 17.134 34 21C34 24.866 30.866 28 27 28C23.134 28 20 24.866 20 21" 
            stroke="url(#clientLoopGrad)" 
            strokeWidth="3.75" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <circle cx="13" cy="21" r="2" fill="#60A5FA" />
          <circle cx="27" cy="21" r="2" fill="#2DD4BF" />
        </svg>
      </div>

      {/* Wordmark */}
      <span className={`tracking-tight font-bold ${textSize} ${variant === 'dark' ? 'text-slate-900' : 'text-white'}`}>
        Client<span className="text-blue-600">Loop</span>
      </span>
    </div>
  )
}
