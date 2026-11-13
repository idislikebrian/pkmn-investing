"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Navigation.module.css";

export function Navigation() {
  /* const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (pathname === "/login" || pathname === "/signup") {
    return null;
  } */

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/market", label: "Market" },
    { href: "/grading", label: "Grading" },
    { href: "/tax", label: "Tax" },
    // /import 404s outside development, so don't offer a dead link there.
    ...(process.env.NODE_ENV === "development" ? [{ href: "/import", label: "Import" }] : []),
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div>
            <h1>Portfolio</h1>
            <div>
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={styles.link}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          {/* <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button> */}
        </div>
      </div>
    </nav>
  );
}
