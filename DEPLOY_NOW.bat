@echo off
title DENR FEED - ONE CLICK DEPLOY
echo ===========================================
echo   DENR MEDIA FEED - QUICK DEPLOY TOOL
echo ===========================================
echo.
echo [STEP 1] LOGIN SA VERCEL
echo 1. Mangyaring mag-antay hanggang lumabas ang "Log in with GitHub".
echo 2. Kapag nakita niyo na iyon, pindutin agad ang ENTER sa keyboard niyo.
echo.
echo PINDUTIN ANG KAHIT ANONG KEY PARA MAGSIMULA...
pause > nul
echo.
echo Naglo-load... Mangyaring mag-antay ng 30 seconds...
echo.
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process; npx --yes vercel login"
echo.
echo -------------------------------------------
echo [STEP 2] PAG-UPLOAD NG SITE
echo Kapag tapos na ang login sa browser, bumalik dito at pindutin ang ENTER.
echo -------------------------------------------
pause
echo.
echo Inau-upload na... Mangyaring mag-antay...
echo.
powershell -Command "npx --yes vercel --prod"
echo.
echo ===========================================
echo   DONE! LIVE NA ANG SITE NIYO!
echo   Paki-copy yung "Production" link sa taas.
echo ===========================================
echo.
pause
