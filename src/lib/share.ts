import { toast } from '@/lib/notifications';

type ShareLinkOptions = {
    url?: string;
    title?: string;
    text?: string;
    copiedMessage?: string;
};

function isLikelyMobile() {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent || '';
    const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    if (userAgentData?.mobile !== undefined) return userAgentData.mobile;
    return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

async function copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to legacy copy.
        }
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
    } catch {
        return false;
    }
}

export async function copyShareUrl(url: string, copiedMessage?: string) {
    if (!url) return;
    const copied = await copyToClipboard(url);
    if (copied) {
        toast.success(copiedMessage ?? 'Link copied');
        return;
    }

    toast.error('Unable to copy link');
}

export async function shareLink({ url, title, text, copiedMessage }: ShareLinkOptions) {
    if (typeof window === 'undefined') return;
    const shareUrl = url || window.location.href;
    if (!shareUrl) return;

    const canNativeShare =
        typeof navigator !== 'undefined' && typeof navigator.share === 'function' && isLikelyMobile();

    if (canNativeShare) {
        try {
            const shareData: ShareData = { url: shareUrl };
            if (title) shareData.title = title;
            if (text) shareData.text = text;
            await navigator.share(shareData);
            return;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return;
            }
        }
    }

    await copyShareUrl(shareUrl, copiedMessage);
}
