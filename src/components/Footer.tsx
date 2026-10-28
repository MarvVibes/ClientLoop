import React from 'react'
import { Logo } from './Logo'

interface FooterProps {
  onOpenPrivacy: () => void
  onOpenTerms: () => void
  onOpenContact: () => void
  onOpenEarlyAccess: () => void
  onOpenSignIn: () => void
  onOpenDashboard?: () => void
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenTerms,
  onOpenContact,
  onOpenEarlyAccess,
  onOpenSignIn,
  onOpenDashboard
}) => {
  return (
    <footer className="border-t border-slate-200 bg-white py-16 px-5 sm:px-8 text-slate-600">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-5">
          
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <a href="#" className="inline-block">
              <Logo />
            </a>
            <p className="max-w-sm text-sm text-slate-500 leading-relaxed">
              Customer insights, follow-ups and reviews for service businesses.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <p className="eyebrow text-slate-400">Product</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#product" className="hover:text-slate-900 transition-colors">
                  Product
                </a>
              </li>
              <li>
                <a href="#how" className="hover:text-slate-900 transition-colors">
                  How it works
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Use cases
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-900 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-slate-900 transition-colors">
                  FAQ
                </a>
              </li>
              {onOpenDashboard && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="hover:text-slate-900 transition-colors cursor-pointer text-left"
                  >
                    Staff Portal
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Use Cases Links */}
          <div className="space-y-3">
            <p className="eyebrow text-slate-400">Use Cases</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Salon & Beauty
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Hospitality
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Repair & Home Services
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Wellness
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-slate-900 transition-colors">
                  Professional Services
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <p className="eyebrow text-slate-400">Company</p>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Privacy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Terms
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 ClientLoop. All rights reserved.</p>
          <p>Product previews use illustrative sample data.</p>
        </div>

      </div>
    </footer>
  )
}
