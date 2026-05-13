import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const trackEvent = async (eventType, eventData = {}) => {
    try {
        const userAgent = navigator.userAgent;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
        const deviceType = isMobile ? 'Mobile' : 'Desktop';

        // Fetch IP if not already fetched in session
        let ip = sessionStorage.getItem('user_ip');
        if (!ip) {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                ip = data.ip;
                sessionStorage.setItem('user_ip', ip);
            } catch (e) {
                ip = 'unknown';
            }
        }

        const user = auth.currentUser;

        await addDoc(collection(db, 'logs'), {
            eventType,
            deviceType,
            ip,
            user: user ? (user.email || user.uid) : 'public',
            uid: user ? user.uid : null,
            ...eventData,
            timestamp: serverTimestamp(),
            path: window.location.pathname,
            userAgent
        });
    } catch (error) {
        console.error("Analytics Error:", error);
    }
};

