# Windows Server + IIS Deployment Guide

## Prerequisites
```
Windows Server 2019+
IIS 10+ with URL Rewrite 2.1
Node.js 20+ 
NSSM 2.24+ (https://nssm.cc/download)
PowerShell 5.1+
```

## Local Test First ✅
```
npm run fullstack
# Backend: http://localhost:3001
# Frontend: http://localhost:4173
curl http://localhost:3001/api/db/site_content?section_key=settings
```

## Production Deploy (5 min)

### 1. Build
```
npm run build
cd server
npm install --production
```

### 2. Copy Files to IIS
```
# To C:\inetpub\wwwroot\syssolution\
dist/
server/
server/app.db (ensure write perms)
web.config (from script above)
```

### 3. Run Deploy Script
```
.\deploy-windows.ps1 -SiteName syssolution -PhysicalPath "C:\inetpub\wwwroot\syssolution"
```

### 4. Verify
```
http://syssolution/api/db/site_content?section_key=settings&_single=1  ✅ JSON
http://syssolution/  ✅ Loads homepage (no 502s)
```

## IIS Configuration Summary
```
Site: syssolution (port 80)
├── dist/           (static files)
├── server/         (Node API)
├── app.db         (SQLite - IIS_IUSRS write)
└── web.config     (proxy /api → localhost:3001)
```

## Service Management
```
nssm status BSS-API
nssm stop BSS-API
nssm start BSS-API
nssm edit BSS-API  (edit params)
```

## Troubleshooting
**502 after deploy**:
1. NSSM service running? `nssm status BSS-API`
2. Backend healthy? `curl http://localhost:3001/api/db/site_content`
3. URL Rewrite module installed?
4. app.db writable? `icacls app.db`

**502 → 500**:
```
cd server
npm start
# Check console errors (DB perms/uploads)
```

**"Invalid table" error after deploy**:
1. Check NSSM service is running: `nssm status BSS-API`
2. Test backend directly: `curl http://localhost:3001/api/db/site_content`
3. Check server logs: Look for `server/server.log`
4. Verify app.db exists in server/ folder
5. Rebuild server: `cd server && npm run db:verify`

**Data not loading (site_content, seo_settings, client_logos)**:
1. NSSM service running? `nssm status BSS-API`
2. Test API: `curl http://localhost:3001/api/db/site_content`
3. If returns 404 or error, check Node service logs
4. Rebuild DB: `cd server && npm run db:verify`
5. Ensure app.db has data: check row counts

**Test all endpoints after deploy**:
```
curl http://localhost:3001/api/db/site_content        # Should return JSON array
curl http://localhost:3001/api/db/seo_settings       # Should return JSON array
curl http://localhost:3001/api/db/client_logos        # Should return JSON array
curl http://localhost:3001/api/db/batch?tables=site_content  # Should return JSON object
```

## Monitoring
```
C:\inetpub\logs\LogFiles\W3SVC1\  (IIS access/errors)
nssm logs: NSSM GUI → Log on tab
```

**🚀 Deployed successfully →** Frontend static + Backend Node + SQLite + IIS Proxy = ✅ No more 502s!
