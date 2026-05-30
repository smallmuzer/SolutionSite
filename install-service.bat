@echo off
set SERVICE_NAME=SolutionSiteService
set SCRIPT_PATH=%~dp0server\index.js

echo Installing %SERVICE_NAME%...
nssm install %SERVICE_NAME% node "%SCRIPT_PATH%"
nssm set %SERVICE_NAME% AppDirectory "%~dp0\"
nssm set %SERVICE_NAME% AppEnvironmentExtra NODE_ENV=production PORT=4001
nssm set %SERVICE_NAME% AppStdout "%~dp0\service-stdout.log"
nssm set %SERVICE_NAME% AppStderr "%~dp0\service-stderr.log"
nssm set %SERVICE_NAME% Description "SolutionSite Web Service"
nssm start %SERVICE_NAME%

echo.
echo Service %SERVICE_NAME% installed and started successfully!
pause
