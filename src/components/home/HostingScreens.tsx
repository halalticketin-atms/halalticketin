import Image from 'next/image';
import { Check, MapPin, QrCode, Ticket } from 'lucide-react';
import styles from './HostingScreens.module.css';

function Logo() {
  return (
    <div className={styles.brand}>
      <Image src="/logos/HTlogocr.png" alt="" width={1186} height={448} className={styles.logo} />
    </div>
  );
}

/** Illustrative product fragments for the hosting section. Sample data only, hidden from screen readers. */
export function MockEventPage() {
  return (
    <div className={styles.window} aria-hidden="true">
      <Logo />
      <div className={styles.poster} />
      <div className={styles.body}>
        <p className={styles.title}>Community Iftar</p>
        <p className={styles.meta}><MapPin /> Sat 6 Mar, 5:30 pm, London</p>
        <div className={styles.tier}>
          <span><b>Early bird</b><small>Selling fast 🔥</small></span>
          <strong>£12</strong>
        </div>
        <div className={styles.tier}>
          <span><b>General</b><small>Available</small></span>
          <strong>£18</strong>
        </div>
        <div className={styles.buy}>Get tickets</div>
      </div>
    </div>
  );
}

const bars = [18, 26, 22, 38, 34, 52, 48, 66, 60, 78, 72, 92];
const orders = [
  { name: 'Aisha R.', detail: '2 General', amount: '£36' },
  { name: 'Yusuf K.', detail: '1 Early bird', amount: '£12' },
  { name: 'Maryam S.', detail: '4 General', amount: '£72' },
];

export function MockSales() {
  return (
    <div className={styles.window} aria-hidden="true">
      <Logo />
      <div className={styles.body}>
        <p className={styles.label}>Tickets sold</p>
        <p className={styles.figure}>186<span> of 220</span></p>
        <div className={styles.chart}>
          {bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
        </div>
        <ul className={styles.orders}>
          {orders.map(order => (
            <li key={order.name}>
              <span className={styles.avatar}>{order.name.charAt(0)}</span>
              <span><b>{order.name}</b><small>{order.detail}</small></span>
              <strong>{order.amount}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MockScanner() {
  return (
    <div className={styles.phone} aria-hidden="true">
      <Logo />
      <div className={styles.viewfinder}>
        <i /><i /><i /><i />
        <QrCode strokeWidth={1.25} />
      </div>
      <div className={styles.admitted}>
        <span className={styles.tick}><Check strokeWidth={3} /></span>
        <span><b>Yusuf K.</b><small>Admitted, Early bird</small></span>
      </div>
      <div className={styles.count}>
        <Ticket />
        <span>142 of 186 checked in</span>
      </div>
    </div>
  );
}
