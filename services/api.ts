import { api as firebaseApi } from './firebaseBackend';
import { api as localApi } from './localBackend';

// Determine which backend to use based on environment variable
// FORCING LOCAL BACKEND TO DEBUG
const useLocalBackend = import.meta.env.VITE_USE_LOCAL_BACKEND === 'true';

if (useLocalBackend) {
    console.log('🚀 Using Local Storage Backend');
} else {
    console.log('🔥 Using Firebase Backend');
}

export const api = useLocalBackend ? localApi : firebaseApi;
