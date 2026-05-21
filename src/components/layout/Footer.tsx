import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Instagram } from 'lucide-react';
import { ManageCookiesButton } from '@/components/privacy/manage-cookies-button';
import { AppStoreBadge } from '@/components/layout/AppStoreBadge';

export function Footer() {
    return (
        <footer className="border-t bg-muted/50">
            <div className="container py-8 md:py-12">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="/images/HTlogocr.png"
                                alt="HalalTicketin' Logo"
                                width={120}
                                height={35}
                                className="h-8 w-auto"
                            />
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Your trusted platform for halal events and ticketing.
                        </p>

                        {/* App Store download */}
                        <div className="mt-6">
                            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                                Get the organiser app
                            </p>
                            <AppStoreBadge />
                        </div>

                        <div className="mt-6 hidden md:flex gap-4">
                            <Link
                                href="https://www.linkedin.com/search/results/all/?fetchDeterministicClustersOnly=true&heroEntityKey=urn%3Ali%3Aorganization%3A107720490&keywords=halalticketin%27&origin=RICH_QUERY_SUGGESTION&position=0&searchId=ba6311fc-916d-4a07-b095-44ae38281c9b&sid=A4e&spellCorrectionEnabled=false"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Linkedin className="h-5 w-5" />
                                <span className="sr-only">LinkedIn</span>
                            </Link>
                            <Link
                                href="https://www.instagram.com/halalticketin/?utm_source=ig_web_button_share_sheet"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Instagram className="h-5 w-5" />
                                <span className="sr-only">Instagram</span>
                            </Link>
                        </div>
                    </div>

                    {/* For Attendees */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold">For Attendees</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/events" className="hover:text-foreground transition-colors">
                                    Browse Events
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-foreground transition-colors">
                                    Help Center
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* For Organisers */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold">For Organisers</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/events/new" className="hover:text-foreground transition-colors">
                                    Create Event
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-foreground transition-colors">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="mb-4 text-sm font-semibold">Company</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link href="/about" className="hover:text-foreground transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-foreground transition-colors">
                                    Contact
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy" className="hover:text-foreground transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookie-policy" className="hover:text-foreground transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <ManageCookiesButton />
                            </li>
                            <li>
                                <Link href="/terms" className="hover:text-foreground transition-colors">
                                    Terms &amp; Conditions
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Mobile Social Icons - Bottom Right */}
                <div className="flex md:hidden justify-end gap-4 mt-6">
                    <Link
                        href="https://www.linkedin.com/search/results/all/?fetchDeterministicClustersOnly=true&heroEntityKey=urn%3Ali%3Aorganization%3A107720490&keywords=halalticketin%27&origin=RICH_QUERY_SUGGESTION&position=0&searchId=ba6311fc-916d-4a07-b095-44ae38281c9b&sid=A4e&spellCorrectionEnabled=false"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Linkedin className="h-5 w-5" />
                        <span className="sr-only">LinkedIn</span>
                    </Link>
                    <Link
                        href="https://www.instagram.com/halalticketin/?utm_source=ig_web_button_share_sheet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Instagram className="h-5 w-5" />
                        <span className="sr-only">Instagram</span>
                    </Link>
                </div>

                {/* Copyright */}
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} HalalTicketin&apos;. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
