@echo off
REM Starts the local dev server. Works even though the folder path
REM contains spaces and an "&" (which break the normal `npm run dev`).
node "%~dp0node_modules\vite\bin\vite.js"
pause
