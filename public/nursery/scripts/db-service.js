/**
 * db-service.js
 * Handles IndexedDB operations to replace LocalStorage for large datasets.
 */

const DB_NAME = 'NGP_Palawan_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

const DBService = {
    db: null,

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    },

    async save(key, data) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(data, key);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    },

    async get(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },
    
    async delete(key) {
        await this.init();
        return new Promise((resolve, reject) => {
             const transaction = this.db.transaction([STORE_NAME], 'readwrite');
             const store = transaction.objectStore(STORE_NAME);
             const request = store.delete(key);
             
             request.onsuccess = () => resolve();
             request.onerror = (e) => reject(e.target.error);
        });
    }
};

// Export to global scope
window.DBService = DBService;
