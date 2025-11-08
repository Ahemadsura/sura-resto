# 🔧 Supabase Admin Setup Guide

## Problem: "User not allowed" Error

The error occurs because creating users requires **admin privileges** that the regular anon key doesn't have.

## Solution: Add Service Role Key

### Step 1: Get Your Service Role Key

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (NOT the anon key)

⚠️ **SECURITY WARNING**: The service role key has full admin access. Never expose it in client-side code or commit it to version control.

### Step 2: Add to Environment Variables

Add this to your `.env` file:

```env
# Existing variables
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# Add this new variable
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Restart Your Development Server

```bash
npm start
```

## Alternative Solution: Use Supabase Edge Functions

For production, consider using **Supabase Edge Functions** instead of exposing the service role key in the client:

1. Create an Edge Function for user management
2. Call the function from your client
3. Keep the service role key secure on the server

## Testing

After adding the service role key:

1. Try adding a manager from your dev account
2. The error should be resolved
3. Check the Supabase Auth dashboard to see the created user

## Security Best Practices

- ✅ Use service role key only for development
- ✅ Use Edge Functions for production
- ✅ Never commit `.env` files
- ✅ Rotate keys regularly
- ❌ Never expose service role key in client code
- ❌ Never commit service role key to version control

## Troubleshooting

If you still get errors:

1. **Check RLS Policies**: Ensure your database policies allow the operations
2. **Verify Key Format**: Service role key should start with `eyJ`
3. **Check Console**: Look for detailed error messages in browser console
4. **Test Connection**: Try a simple query first to verify the key works

## Next Steps

Once this is working:
- Test manager creation
- Test manager login
- Verify role-based access control
- Consider implementing Edge Functions for production