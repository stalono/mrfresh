@echo off
cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo Installing dependencies...
    call npm install
)

echo Starting the app...
call npm start