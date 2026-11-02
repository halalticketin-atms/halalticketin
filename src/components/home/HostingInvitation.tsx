import Link from 'next/link';
import type { ReactNode } from 'react';
import { MockEventPage, MockSales, MockScanner } from './HostingScreens';
import styles from './HostingInvitation.module.css';

const stages: { title: string; text: string; screen: ReactNode }[] = [
  { title: 'Publish your event', text: 'Build the page, set your ticket types and go live in minutes.', screen: <MockEventPage /> },
  { title: 'Sell and fill the room', text: 'Take card payments, open a waitlist when you sell out and watch every order arrive.', screen: <MockSales /> },
  { title: 'Scan at the door', text: 'Check guests in from the organiser app on your phone. No printed lists.', screen: <MockScanner /> },
];

/** The organiser's journey in three steps, with no container around the section. */
export default function HostingInvitation({ startHref }: { startHref: string }) {
  return (
    <section id="hosting" aria-labelledby="hosting-heading" className={styles.section}>
      <div className={`container ${styles.intro}`}>
        <h2 id="hosting-heading" className={styles.heading}>Everything you need to host <span className="text-gradient">meaningful events.</span></h2>
        <Link href={startHref} className={styles.link}>Start For Free</Link>
      </div>
      <ol className={`container ${styles.stages}`}>
        {stages.map(stage => (
          <li key={stage.title} className={styles.stage}>
            <h3>{stage.title}</h3>
            <p>{stage.text}</p>
            <div className={styles.screen}>{stage.screen}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
