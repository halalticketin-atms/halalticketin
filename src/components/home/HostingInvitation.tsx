import Link from 'next/link';
import { Button } from '@/components/ui/button';
import HostingIcon from './HostingIcon';
import styles from './HostingInvitation.module.css';

export default function HostingInvitation({ startHref }: { startHref: string }) {
  return (
    <section id="hosting" aria-labelledby="hosting-heading" className={styles.section}>
      <div className={styles.ticket}>
        <span className={`${styles.gradient} text-gradient`} aria-hidden="true" />
        <svg className={styles.watermark} viewBox="0 0 200 180" fill="none" aria-hidden="true">
          <path d="M28 84 77 146 170 28" stroke="currentColor" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className={styles.main}>
          <p className={styles.eyebrow}>Why organisers choose us</p>
          <h2 id="hosting-heading" className={styles.heading}><span>Everything you need</span>{' '}<span>to host meaningful</span>{' '}<span>events.</span></h2>
          <div className={styles.benefits}>
            <div>
              <span className={styles.iconTile}><HostingIcon kind="ticket" /></span>
              <h3>Effortless ticketing</h3>
              <p>Create professional event pages and start selling tickets in minutes.</p>
            </div>
            <div>
              <span className={styles.iconTile}><HostingIcon kind="community" /></span>
              <h3>Community First</h3>
              <p>Designed to support organisers and attendees alike, with a focus on real engagement.</p>
            </div>
          </div>
        </div>
        <div className={styles.stub}>
          <div>
            <span className={styles.iconTile}><HostingIcon kind="checkin" /></span>
            <h3>Seamless Experience</h3>
            <p>From event discovery to check-in, we ensure a smooth, reliable experience.</p>
          </div>
        </div>
        <Button size="lg" className={`${styles.cta} h-14 text-base font-semibold`} asChild>
          <Link href={startHref}>Start For Free</Link>
        </Button>
      </div>
    </section>
  );
}
