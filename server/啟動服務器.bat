@echo off
chcp 65001 >nul
title 全校教師課表管理系統
cd /d "%~dp0"
echo ==================================
echo   全校教師課表管理系統
echo ==================================
echo.
node server.js
pause
