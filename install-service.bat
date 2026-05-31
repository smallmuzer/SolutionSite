@echo off

set NSSM=%~dp0nssm.exe
set SERVICE_NAME=SolutionSiteService
set SCRIPT_PATH=%~dp0server\index.js

if not exist "%NSSM%" (
    echo ERROR: nssm.exe not found in %~dp0
    pause
    exit /b 1
)

echo Installing %SERVICE_NAME%...

"%NSSM%" install %SERVICE_NAME% node "%SCRIPT_PATH%"
"%NSSM%" set %SERVICE_NAME% AppDirectory "%~dp0"
"%NSSM%" set %SERVICE_NAME% AppEnvironmentExtra NODE_ENV=production PORT=4001
"%NSSM%" set %SERVICE_NAME% AppStdout "%~dp0service-stdout.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%~dp0service-stderr.log"
"%NSSM%" set %SERVICE_NAME% Description "SolutionSite Web Service"
"%NSSM%" start %SERVICE_NAME%

echo.
echo Service %SERVICE_NAME% installed and started successfully!
pause