import Image from "next/image";
import styles from "./page.module.css";
import { Navigation } from "@/components/Navigation";

export default function Home() {
  return (
    <div className={styles.page}>
      <Navigation />
      <main className={styles.main}>
        
      </main>
    </div>
  );
}
