# BSS Windows Server IIS Deploy Script
# Run as Administrator on Windows Server with IIS + URL Rewrite + Node.js installed

param(
    [string]$SiteName = "syssolution",
    [string]$PhysicalPath = "C:\inetpub\wwwroot\syssolution",
    [string]$BackendPort = "3001"
)

Write-Host "=== BSS Full-Stack Deploy to IIS ===" -ForegroundColor Green
Write-Host "Site: $SiteName" -ForegroundColor Cyan
Write-Host "Path: $PhysicalPath" -ForegroundColor Cyan  
Write-Host "Backend Port: $BackendPort`n" -ForegroundColor Cyan

# 1. Stop site if exists
Write-Host "1. Stopping IIS site..." -ForegroundColor Yellow
Import-Module WebAdministration
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Stop-Website $SiteName
}

# 2. Create directory structure
Write-Host "2. Preparing directories..." -ForegroundColor Yellow
$dist = Join-Path $PhysicalPath "dist"
$serverDir = Join-Path $PhysicalPath "server"
$appDb = Join-Path $serverDir "app.db"

New-Item -ItemType Directory -Force -Path $PhysicalPath | Out-Null
New-Item -ItemType Directory -Force -Path $dist | Out-Null
New-Item -ItemType Directory -Force -Path $serverDir | Out-Null

# 3. Copy files from local project (update paths!)
Write-Host "3. Copy project files..." -ForegroundColor Yellow
# UPDATE these paths to your local project location
Copy-Item "d:\Solutions\ss5\SolutionSite\dist\*" $dist -Recurse -Force
Copy-Item "d:\Solutions\ss5\SolutionSite\server\*" $serverDir -Recurse -Force
Copy-Item "d:\Solutions\ss5\SolutionSite\public\web.config" $PhysicalPath -Force

# 4. Backend npm install
Write-Host "4. Backend dependencies..." -ForegroundColor Yellow
Set-Location $serverDir
npm install --production
npm run db:verify

# 5. Create/Configure IIS Site
Write-Host "5. IIS Site Configuration..." -ForegroundColor Yellow
New-WebSite -Name $SiteName -Port 80 -PhysicalPath $PhysicalPath -Force | Out-Null

# 6. URL Rewrite for /api proxy
Write-Host "6. URL Rewrite /api → localhost:$BackendPort..." -ForegroundColor Yellow
$webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)$" />
          <action type="Rewrite" url="http://localhost:$BackendPort/api/{R:1}" />
        </rule>
        <rule name="Static Files" stopProcessing="true">
          <match url="^(assets|logo\.png|.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)).*$" />
          <action type="None" />
        </rule>
        <rule name="Static SPA" stopProcessing="true">
          <match url="^(.*)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/dist/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
"@
$webConfig | Out-File (Join-Path $PhysicalPath "web.config") -Encoding UTF8

# 7. App pool settings
Write-Host "7. App Pool config..." -ForegroundColor Yellow
$appPoolName = "${SiteName}_pool"
New-WebAppPool -Name $appPoolName -Force | Out-Null
Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name enable32BitAppOnWin64 -Value $false

# 8. NSSM Backend Service
Write-Host "8. NSSM Node Service (port $BackendPort)..." -ForegroundColor Yellow
$nssmPath = "C:\nssm\win64\nssm.exe"  # UPDATE NSSM path
&amp;$nssmPath install BSS-API $env:ProgramFiles\nodejs\node.exe
&amp;$nssmPath set BSS-API AppDirectory $serverDir
&amp;$nssmPath set BSS-API AppParameters index.js
&amp;$nssmPath set BSS-API DisplayName "BSS API Server"
&amp;$nssmPath set BSS-API Description "SQLite API Backend - Port $BackendPort"
&amp;$nssmPath start BSS-API

# 9. Permissions
Write-Host "9. Permissions..." -ForegroundColor Yellow
icacls $appDb /grant "IIS_IUSRS:(OI)(CI)F" /T
icacls $serverDir /grant "IIS_IUSRS:(OI)(CI)R" /T

# 10. Start site
Write-Host "10. Starting site..." -ForegroundColor Green
Start-Website $SiteName

Write-Host "`n=== DEPLOY COMPLETE! ===" -ForegroundColor Green
Write-Host "🌐 Frontend: http://$SiteName" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:$BackendPort" -ForegroundColor Cyan
Write-Host "📊 Test API: http://$SiteName/api/db/site_content?section_key=settings" -ForegroundColor Cyan
Write-Host "`n✅ Site: $SiteName | Path: $PhysicalPath`n" -ForegroundColor Green

# Service status check
Write-Host "Service Status:" -ForegroundColor Yellow
&amp;$nssmPath status BSS-API
