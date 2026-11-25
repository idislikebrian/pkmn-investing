import { Pool } from "@neondatabase/serverless";
import { redirect } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { getOwnerUserId, OwnershipNotClaimedError } from "@/lib/owner";
import { getSession } from "@/lib/session";
import { getDashboardData, sortDashboardCards, type DashboardSort } from "@/lib/dashboard";
import styles from "./dashboard.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function sortFromParam(value: string | string[] | undefined): DashboardSort {
  const sort = Array.isArray(value) ? value[0] : value;
  return sort === "name" || sort === "set" ? sort : "value";
}

function price(value: number | null) {
  return value === null ? "no price" : money.format(value);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ sort?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    let data;
    try {
      const ownerId = await getOwnerUserId(client, session.user.id);
      data = await getDashboardData(client, ownerId);
    } catch (error) {
      if (error instanceof OwnershipNotClaimedError) {
        return (
          <div className="page">
            <Navigation />
            <main className="main">
              <section className={styles.dashboard}>
                <div className={styles.empty}>
                  <h1>No collection is linked to this account yet</h1>
                  <p>Sign in with an account that has an approved collection claim.</p>
                </div>
              </section>
            </main>
          </div>
        );
      }
      throw error;
    }

    const params = await searchParams;
    const sort = sortFromParam(params?.sort);
    const cards = sortDashboardCards(data.cards, sort);
    const topCards = sortDashboardCards(data.cards, "value").slice(0, 5);

    return (
      <div className="page">
        <Navigation />
        <main className="main">
          <section className={styles.dashboard}>
            <header className={styles.header}>
              <p className={styles.eyebrow}>private collection / dashboard</p>
              <h1 className={styles.heading}>the collection, finally visible.</h1>
              <p className={styles.subheading}>Current value and inventory from the cards linked to this account. No shared rows, no mystery portfolio.</p>
            </header>

            <section className={styles.stats} aria-label="Collection summary">
              <div className={styles.stat}><span className={styles.statLabel}>Collection value</span><strong className={styles.statValue}>{money.format(data.totalValue)}</strong></div>
              <div className={styles.stat}><span className={styles.statLabel}>Total cards</span><strong className={styles.statValue}>{data.totalQuantity.toLocaleString()}</strong></div>
              <div className={styles.stat}><span className={styles.statLabel}>Unique cards</span><strong className={styles.statValue}>{data.uniqueCards.toLocaleString()}</strong></div>
              <div className={styles.stat}><span className={styles.statLabel}>Prices updated</span><strong className={styles.statValue}>{data.lastPriceUpdate ? dateTime.format(new Date(data.lastPriceUpdate)) : "never"}</strong></div>
            </section>

            <section className={styles.section} aria-labelledby="top-cards">
              <div className={styles.sectionHeading}><h2 id="top-cards">Top 5 by line value</h2><p>quantity × current price</p></div>
              <div className={styles.topCards}>
                {topCards.map((card, index) => (
                  <article className={styles.topCard} key={card.id}>
                    <span className={styles.rank}>0{index + 1}</span>
                    <strong className={styles.cardName}>{card.name}</strong>
                    <span className={styles.cardMeta}>{card.setName ?? "Unknown set"} · {card.cardNumber ?? "—"}</span>
                    <span className={styles.cardValue}>{money.format(card.lineValue)}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="all-cards">
              <div className={styles.sectionHeading}>
                <div><h2 id="all-cards">All cards</h2><p>{data.uniqueCards} unique rows · {data.totalQuantity} total quantity</p></div>
                <nav className={styles.sortLinks} aria-label="Sort cards">
                  <a className={styles.sortLink} href="/dashboard?sort=value">value</a>
                  <a className={styles.sortLink} href="/dashboard?sort=name">name</a>
                  <a className={styles.sortLink} href="/dashboard?sort=set">set</a>
                </nav>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Name</th><th>Set</th><th>Number</th><th>Variant</th><th>Rarity</th><th className={styles.number}>Qty</th><th className={styles.number}>Unit price</th><th className={styles.number}>Line total</th></tr></thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.id}>
                        <td>{card.name}</td><td>{card.setName ?? "—"}</td><td>{card.cardNumber ?? "—"}</td><td>{card.variant ?? "—"}</td><td>{card.rarity ?? "—"}</td><td className={styles.number}>{card.quantity}</td><td className={styles.number}>{price(card.unitPrice)}</td><td className={styles.number}>{money.format(card.lineValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </main>
      </div>
    );
  } finally {
    client.release();
    await pool.end();
  }
}
