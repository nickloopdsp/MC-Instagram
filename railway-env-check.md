# Railway Environment Variables Checklist for profound-love

## Required Environment Variables

### For Web Service:
```
DATABASE_URL=${{ Postgres.DATABASE_URL }}
PORT=5002
NODE_ENV=production
```

### Additional Variables (if needed):
```
OPENAI_API_KEY=your_openai_api_key
LOOP_API_TOKEN=your_loop_api_token
SOUNDCHARTS_APP_ID=LOOP_A1DFF434
SOUNDCHARTS_API_KEY=bb1bd7aa455a1c5f
SESSION_SECRET=your_session_secret
```

## How to Set Variables in Railway:

1. Go to your profound-love project dashboard
2. Click on your **Web Service** (not the database)
3. Go to **Variables** tab
4. Add each variable using the format above

## Critical Points:

- ✅ **DATABASE_URL**: MUST use `${{ Postgres.DATABASE_URL }}` (not the direct URL)
- ✅ **PORT**: Set to `5002` to match your application
- ✅ **SOUNDCHARTS_APP_ID**: Set to `LOOP_A1DFF434`
- ✅ **SOUNDCHARTS_API_KEY**: Set to `bb1bd7aa455a1c5f`
- ✅ **Service Reference**: The `${{ Postgres.DATABASE_URL }}` automatically connects to your PostgreSQL service

## Verification:

After setting variables, redeploy and check logs for:
- Database connection success
- Server starting on port 5002
- Soundcharts API connection success
- No connection errors 