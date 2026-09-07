import { Client, Account, Databases, Storage } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69247271000fd2e093f0';

const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage };
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '692472be00265c68d4e3';
export const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID || 'transaction';
export const WALLPAPER_BUCKET_ID = import.meta.env.VITE_APPWRITE_WALLPAPER_BUCKET_ID || '6925e6ad0016ac1036f4';
