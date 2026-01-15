# Google Maps API Key Configuration Fix

## Current Issue

The Proposals component is showing the error:
```
Oops! Something went wrong.
This page didn't load Google Maps correctly. See the JavaScript console for technical details.
```

**Error Details:**
- Error Type: `RefererNotAllowedMapError`
- Cause: The Google Maps API key has referrer restrictions that don't allow requests from the current domain

## Solution

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console - API Credentials](https://console.cloud.google.com/google/maps-apis/credentials)
2. Log in with your Google account that manages the API key

### Step 2: Find Your API Key

Your current API key is: `AIzaSyDKWLaOgkCj8BxuXVG1tKTTJVnqJIQus1Y`

Look for this key in the credentials list and click on it to edit.

### Step 3: Update Referrer Restrictions

Under **Application restrictions** → **HTTP referrers (websites)**, you need to add the following domains:

#### For Development:
```
localhost:5173
127.0.0.1:5173
localhost:*
127.0.0.1:*
```

#### For WebContainer (Bolt.new/StackBlitz):
```
*.webcontainer.io/*
*.webcontainer-api.io/*
*.local-credentialless.webcontainer-api.io/*
```

#### For Production:
Add your production domain when you deploy:
```
yourdomain.com/*
*.yourdomain.com/*
```

### Step 4: Enable Required APIs

Make sure these APIs are enabled for your project:

1. **Maps JavaScript API** ✅ (Required)
2. **Places API** ✅ (Required)
3. **Geocoding API** ✅ (Required)
4. **Maps Static API** (Optional, for static map images)

### Alternative: Temporarily Remove Restrictions

**⚠️ WARNING: Only for development/testing, NOT for production!**

If you want to test without restrictions:

1. In the API key settings
2. Under **Application restrictions**
3. Select **None**
4. Click **Save**

**Remember to add restrictions back before deploying to production!**

## Verification

After updating the restrictions:

1. Wait 1-2 minutes for changes to propagate
2. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
3. Navigate to the Proposals page
4. The Google Maps should now load without errors

## Environment Variables

The API key is stored in `.env`:
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSyDKWLaOgkCj8BxuXVG1tKTTJVnqJIQus1Y
```

**Note:** Never commit the `.env` file to GitHub! It's already in `.gitignore`.

## Additional Resources

- [Google Maps Error Messages](https://developers.google.com/maps/documentation/javascript/error-messages)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Restrict API Keys](https://cloud.google.com/docs/authentication/api-keys#securing_an_api_key)
