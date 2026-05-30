@echo off
set SERVICE_NAME=SolutionSiteService

echo Stopping %SERVICE_NAME%...
nssm stop %SERVICE_NAME%

echo Removing %SERVICE_NAME%...
nssm remove %SERVICE_NAME% confirm

echo.
echo Service %SERVICE_NAME% removed successfully!
pause
