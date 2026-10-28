import React, { useState, useEffect } from 'react'
import { Logo } from './Logo'
import { Menu, X, ArrowRight, Lock } from 'lucide-react'

interface NavbarProps {
  onOpenSignIn: () => void
  onOpenEarlyAccess: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSignIn, onOpenEarlyAccess }) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'How it works', href: '#how' },
    { label: 'Use cases', href: '#use-cases' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ]

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${isScrolled
          ? 'bg-[#FAF9F5]/90 backdrop-blur-md border-b border-slate-200/60 shadow-xs py-3'
          : 'bg-transparent py-4'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
          >
            <Logo />
          </a>

          {/* Desktop Floating Pill Navigation */}
          <nav className="hidden md:flex items-center space-x-6 bg-white/80 border border-slate-200/80 px-6 py-2 rounded-full shadow-xs backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={onOpenSignIn}
              className="text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={onOpenEarlyAccess}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-full shadow-xs transition-all duration-150 cursor-pointer"
            >
              Get started free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[65px] bg-white border-b border-slate-200/90 shadow-xl px-5 pt-4 pb-6 transition-all duration-200 animate-in slide-in-from-top-2">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-sm mx-auto">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenSignIn()
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Sign in
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                onOpenEarlyAccess()
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Get started free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
