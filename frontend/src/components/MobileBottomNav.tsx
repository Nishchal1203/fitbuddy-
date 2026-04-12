"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { StaticImageData } from "next/image";
import Dietplan from "../assets/Dietplan.svg";
import Goals from "../assets/goal.svg";
import progress from "../assets/progress.svg";
import workout from "../assets/workouts.svg";
import overview from "../assets/dashboard.svg";

type NavItem = {
  href: string;
  label: string;
  imageIcon: StaticImageData;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", imageIcon: overview },
  { href: "/dashboard/workouts", label: "Workouts", imageIcon: workout },
  { href: "/dashboard/plans", label: "Plans", imageIcon: Dietplan },
  { href: "/dashboard/goals", label: "Goals", imageIcon: Goals },
  { href: "/dashboard/progress", label: "Progress", imageIcon: progress },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-1.5 backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5 gap-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-[10px] font-semibold transition ${
                  isActive
                    ? "bg-brand-purple/10 text-brand-purple"
                    : "text-brand-slate/55 hover:bg-brand-bg hover:text-brand-slate"
                }`}
              >
                <Image
                  src={item.imageIcon}
                  alt={`${item.label} icon`}
                  width={17}
                  height={17}
                  className={`h-[17px] w-[17px] ${isActive ? "opacity-100" : "opacity-80"}`}
                />
                <span className="mt-1 leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
