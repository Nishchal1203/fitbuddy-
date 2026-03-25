'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { StaticImageData } from 'next/image'
import logo from '../assets/logo_icon.svg'
import collapser from '../assets/collapser.svg'
import Dietplan from '../assets/Dietplan.svg'
//import schedule from '../assets/calendar.svg'
import Goals from '../assets/goal.svg'
import progress from '../assets/progress.svg'
import workout from '../assets/workouts.svg'
import overview from '../assets/dashboard.svg'
import LogOut  from '../assets/logout.svg'

type SidebarProps = {
  activePath: string
  onLogout: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

type SidebarNavItem = {
  href: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  imageIcon?: StaticImageData
}

export default function Sidebar({ activePath, onLogout, isCollapsed, onToggleCollapse }: SidebarProps) {
  const navItems: SidebarNavItem[] = [
    { href: '/dashboard', label: 'Overview', imageIcon: overview },
    { href: '/dashboard/workouts', label: 'Workouts', imageIcon: workout },
    { href: '/dashboard/plans', label: 'Diet Plan', imageIcon: Dietplan },
    { href: '/dashboard/goals', label: 'Goals', imageIcon: Goals },
    { href: '/dashboard/progress', label: 'Progress', imageIcon: progress },
  ]

  return (
    <aside className="h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col">
      <div className={`py-4 ${isCollapsed ? 'px-2' : 'px-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Image src={logo} alt="Fit Buddy logo" className="h-9 w-9 rounded-xl" width={36} height={36} />
              <div className="text-xl font-semibold">Fit Buddy</div>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-2 transition hover:bg-gray-100"
          >
            <Image
              src={collapser}
              alt="Toggle sidebar"
              width={18}
              height={18}
              className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2 pt-2' : 'px-3 pt-3'}`}>
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon, imageIcon }) => {
            const isActive = activePath === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'}`}
                >
                  {Icon ? (
                    <Icon size={18} />
                  ) : imageIcon ? (
                    <Image src={imageIcon} alt={`${label} icon`} width={18} height={18} className="h-[18px] w-[18px]" />
                  ) : null}
                  {!isCollapsed && <span>{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={`border-t border-gray-200 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
          className={`w-full rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 ${
            isCollapsed ? 'flex items-center justify-center px-2 py-2.5' : 'flex items-center justify-center gap-2 px-3 py-2'
          }`}
        >
          <Image src={LogOut} alt="Logout icon" width={18} height={18} className="h-[18px] w-[18px]" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}


