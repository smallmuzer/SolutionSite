## Fix 502 API Errors - Windows Server Deployment

**Current Progress**: 6/12 ✅

### Phase 1: Local Full-Stack Testing ✅
- ✅ 1. Enhanced npm scripts (`package.json`) 
- ✅ 2. `server/package.json` created  
- ✅ 3. Full-stack ready: Frontend 4173 + Backend 4001

**🚀 TEST IMMEDIATELY** (PowerShell/Terminal):
```
npm run fullstack
```
Expected output:
```
[BUILD] dist/index.html created
[API]   SQLite API: http://localhost:4001  
[PREVIEW] Vite Preview: http://localhost:4173
```

**Verify APIs respond** (no 502s):
```
curl "http://localhost:4001/api/db/site_content?section_key=settings&_single=1"
curl "http://localhost:4001/api/db/seo_settings?page_key=home&_single=1"
curl "http://localhost:4001/api/db/batch?tables=client_logos,services&client_logos_filter={\"is_visible\":true}"
```
Frontend loads at http://localhost:4173?

### Phase 2: Windows Server [Next - After local test pass]


### Phase 2: Windows Server Production Deploy [Next]
- [ ] 4. `server/package.json` → Backend deps (`npm install`)
- [ ] 5. Build frontend: `npm run build` → `dist/`
- [ ] 6. Copy to IIS: `dist/`, `server/`, `app.db`
- [ ] 7. NSSM Service: Backend (`node server/index.js`)
- [ ] 8. IIS Config: Static files + `/api → localhost:4001`
- [ ] 9. Test production APIs

### Phase 3: Production hardening
- [ ] 10. app.db permissions (IIS_IUSRS write)
- [ ] 11. HTTPS + trusted origins update
- [ ] 12. Monitoring: NSSM logs + IIS Failed Request Tracing

**Next Step**: Create `server/package.json` for production backend install.

