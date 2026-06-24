@echo off
REM Builds the production version into the dist\ folder.
node "%~dp0node_modules\vite\bin\vite.js" build
pause
