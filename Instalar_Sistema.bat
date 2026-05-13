@echo off
setlocal
:: Define os caminhos relativos ao local do script
set "targetPath=%~dp0index.html"
set "iconPath=%~dp0img\app_icon_wealth_planner.ico"
set "shortcutName=Wealth Planner Pro.lnk"

echo ==========================================
echo    INSTALADOR WEALTH PLANNER PRO
echo ==========================================
echo.
echo Identificando sua Area de Trabalho...

:: Pega o caminho correto da Area de Trabalho (mesmo com OneDrive)
for /f "delims=" %%i in ('powershell -Command "[Environment]::GetFolderPath('Desktop')"') do set "desktopPath=%%i"

set "finalShortcutPath=%desktopPath%\%shortcutName%"

echo Criando atalho em: %finalShortcutPath%

:: Executa o PowerShell para criar o atalho com o modo App do Chrome
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%finalShortcutPath%'); $s.TargetPath='C:\Program Files\Google\Chrome\Application\chrome.exe'; $s.Arguments='--app=\"file:///%targetPath%\"'; if(Test-Path '%iconPath%') { $s.IconLocation='%iconPath%' }; $s.Save()"

echo.
echo ------------------------------------------
echo [OK] Atalho criado com sucesso!
echo ------------------------------------------
echo.
pause
