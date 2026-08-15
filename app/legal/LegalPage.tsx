import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({ eyebrow, title, intro, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <Link className="legal-brand" href="/" aria-label="返回接單雷達首頁">
          <span aria-hidden="true" />
          接單雷達
        </Link>
        <nav aria-label="法律與支援頁面">
          <Link href="/privacy">隱私</Link>
          <Link href="/terms">條款</Link>
          <Link href="/support">支援</Link>
        </nav>
      </header>
      <article className="legal-card">
        <span className="step-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-content">{children}</div>
      </article>
      <footer className="legal-footer">
        <span>最後更新：2026 年 8 月 15 日</span>
        <Link href="/">返回接單雷達</Link>
      </footer>
    </main>
  );
}
