# Google Authentication Setup Guide

This guide will help you configure Google OAuth authentication for Clear Comply.

## Prerequisites

- A Google Cloud Console account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: "Clear Comply"
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, ensure your "Clear Comply" project is selected
2. Navigate to "APIs & Services" > "Library"
3. Search for "Google+ API"
4. Click on it and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Click "Create"
4. Fill in the required information:
   - **App name**: Clear Comply
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. On the "Scopes" page, click "Add or Remove Scopes"
7. Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `openid`
8. Click "Save and Continue"
9. On "Test users" page (if using External), add your test email addresses
10. Click "Save and Continue"
11. Review and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure the OAuth client:
   - **Name**: Clear Comply Web Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173`
     - `http://localhost:3000`
   - **Authorized redirect URIs**: 
     - `http://localhost:5173`
     - `http://localhost:3000`
5. Click "Create"
6. **IMPORTANT**: Copy the "Client ID" - you'll need this!

## Step 5: Configure Backend Environment

1. Navigate to the `Service` directory
2. Copy `.env.example` to `.env`:
   ```bash
   cd Service
   cp .env.example .env
   ```
3. Edit `.env` and update the following:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-from-step-4.apps.googleusercontent.com
   JWT_SECRET_KEY=your-super-secret-random-string-change-this
   ```
4. Generate a secure JWT secret key:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the output and use it as your `JWT_SECRET_KEY`

## Step 6: Configure Frontend Environment

1. Navigate to the `UI` directory
2. Copy `.env.example` to `.env.local`:
   ```bash
   cd UI
   cp .env.example .env.local
   ```
3. Edit `.env.local` and update:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id-from-step-4.apps.googleusercontent.com
   VITE_API_BASE_URL=http://localhost:8000
   ```

## Step 7: Install Dependencies

### Backend
```bash
cd Service
pip install -r requirements.txt
```

### Frontend
```bash
cd UI
npm install
```

## Step 8: Start the Application

### Start Backend (in Service directory)
```bash
cd Service
python main.py
```
The backend will run on http://localhost:8000

### Start Frontend (in UI directory)
```bash
cd UI
npm run dev
```
The frontend will run on http://localhost:5173

## Step 9: Test Authentication

1. Open your browser to http://localhost:5173
2. You should be redirected to the login page
3. Click "Sign in with Google"
4. Select your Google account
5. Grant permissions
6. You should be redirected to the assessments page

## Troubleshooting

### "Google Client ID is not configured" error
- Make sure you've set `VITE_GOOGLE_CLIENT_ID` in `UI/.env.local`
- Restart the frontend dev server after changing environment variables

### "Invalid Google token" error
- Verify the `GOOGLE_CLIENT_ID` in `Service/.env` matches your Google Cloud Console
- Make sure you've enabled the Google+ API
- Check that your redirect URIs are configured correctly

### "Could not validate credentials" error
- Check that `JWT_SECRET_KEY` is set in `Service/.env`
- Make sure the backend is running
- Clear browser localStorage and try logging in again

### CORS errors
- Verify that `http://localhost:5173` is in the backend CORS allowed origins
- The backend `main.py` already includes this, but double-check

## Security Notes

**IMPORTANT FOR PRODUCTION:**

1. **Never commit `.env` or `.env.local` files to version control**
   - Add them to `.gitignore`

2. **Generate a strong JWT secret**
   - Use at least 32 characters
   - Use random characters (letters, numbers, symbols)
   - Keep it secret!

3. **Update Google OAuth settings for production**
   - Add your production domain to Authorized JavaScript origins
   - Add your production domain to Authorized redirect URIs
   - Switch OAuth consent screen to "Published" status

4. **Use HTTPS in production**
   - Google OAuth requires HTTPS for production domains
   - Get an SSL certificate (Let's Encrypt is free)

5. **Set appropriate token expiration**
   - Current setting: 4 hours (240 minutes)
   - Adjust in `Service/app/auth.py` if needed

## Next Steps

After authentication is working:

1. **Test the protected API endpoints**
   - Create an assessment while logged in
   - Verify the token is being sent in requests

2. **Customize user roles**
   - Currently all users get "assessor" role
   - Update `Service/app/auth_routes.py` to assign roles based on email domain or other criteria

3. **Add database for user persistence**
   - Currently users are created on-the-fly from Google data
   - Add database to store user preferences, roles, and organization mappings

4. **Implement authorization middleware**
   - Protect API endpoints based on user roles
   - Add `Depends(get_current_user)` to routes that require authentication

## API Endpoints

### Public Endpoints (No Authentication Required)
- `POST /api/auth/google/login` - Login with Google

### Protected Endpoints (Require Authentication)
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout
- All other `/api/*` endpoints (will be protected in next step)

## Support

If you encounter any issues, check:
1. Backend logs (terminal where you ran `python main.py`)
2. Frontend console (browser developer tools)
3. Network tab in browser developer tools to see API requests/responses

---

**Ready to provide your Google Client ID?** 
Once you have it, update the `.env` files and you'll be ready to go!
