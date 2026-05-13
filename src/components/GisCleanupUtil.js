import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const cleanupCorruptedPolygons = async () => {
    console.log("Starting GIS Database Integrity Check...");
    const q = collection(db, 'feo_polygons');
    const snapshot = await getDocs(q);
    let deletedCount = 0;
    let totalCount = snapshot.size;

    for (const d of snapshot.docs) {
        const data = d.data();
        let corrupted = false;

        // Check for NaN coordinates or empty coordinates
        if (!data.coordinates || !Array.isArray(data.coordinates) || data.coordinates.length === 0) {
            corrupted = true;
        } else {
            const hasNaN = data.coordinates.some(c => isNaN(c.lat) || isNaN(c.lng) || c.lat === null || c.lng === null);
            if (hasNaN) corrupted = true;
        }

        // Check for invalid area
        if (isNaN(data.area)) corrupted = true;

        if (corrupted) {
            console.warn(`Deleting corrupted polygon: ${d.id} (${data.name || 'Unnamed'})`);
            await deleteDoc(doc(db, 'feo_polygons', d.id));
            deletedCount++;
        }
    }

    console.log(`Integrity Check Complete. Scanned: ${totalCount}, Deleted Corrupted: ${deletedCount}`);
    return { scanned: totalCount, deleted: deletedCount };
};

export const debugAttributes = async () => {
    const q = collection(db, 'feo_polygons');
    const snapshot = await getDocs(q);
    const samples = snapshot.docs.slice(0, 5).map(d => ({
        id: d.id,
        name: d.data().name,
        hasAttributes: !!d.data().attributes,
        attributeKeys: d.data().attributes ? Object.keys(d.data().attributes) : []
    }));
    console.table(samples);
    return samples;
};
