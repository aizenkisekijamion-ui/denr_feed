// Configuration for NGP Data System
const CONFIG = {
    // TODO: Replace these with your actual Google Cloud Console credentials
    // Follow the guide in the "Drive Files" page to get these.
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
    GOOGLE_API_KEY: 'YOUR_API_KEY_HERE',
    
    // The specific Folder ID to monitor (optional, otherwise root)
    NGP_ROOT_FOLDER_ID: 'root', 
    
    // Scopes required for the app
    SCOPES: 'https://www.googleapis.com/auth/drive.metadata.readonly'
};
