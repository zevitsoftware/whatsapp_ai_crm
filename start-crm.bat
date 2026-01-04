@echo off
echo Starting Marketing Automation Engine...
cd /d "%~dp0"
docker-compose up -d
echo.
echo ========================================================
echo   CRM Engine Started! 
echo   Dashboard: http://localhost:3000
echo   WAHA Dashboard (Auto-Login): http://localhost:3001/dashboard/?url=http://localhost:3001^&key=zevitsoft_secret_key
echo   Swagger UI: http://localhost:3000/api-docs
echo ========================================================
timeout /t 5
