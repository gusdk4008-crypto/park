@echo off
chcp 65001 > nul
title 큐브단면 스튜디오 - GitHub 자동 업데이트

echo ========================================================
echo   CubeSection Studio (큐브단면 스튜디오)
echo   GitHub 자동 업데이트 전송
echo ========================================================
echo.

git config user.name "gusdk4008-crypto"
git config user.email "gusdk4008-crypto@users.noreply.github.com"

echo [1/3] 변경된 파일들을 정리하고 있습니다...
git add .
git commit -m "Update CubeSection Studio" >nul 2>nul
git branch -M main

echo [2/3] GitHub 저장소와 연결을 확인합니다...
git pull --rebase origin main >nul 2>nul

echo [3/3] GitHub 저장소로 최신 파일을 전송합니다...
echo * 브라우저에 GitHub 로그인 창(Sign in with your browser)이 뜨면
echo   'Authorize' 또는 로그인을 클릭해 주세요.
echo.
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   [성공] GitHub에 정상적으로 업데이트되었습니다!
    echo.
    echo   공유 웹사이트 주소:
    echo   https://gusdk4008-crypto.github.io/park/
    echo.
    echo   * 약 1~2분 뒤 웹사이트에 새로운 화면이 자동 반영됩니다.
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [안내] 전송이 완료되지 않았습니다.
    echo   - 화면에 브라우저 로그인 창이 떴다면 로그인을 완료해 주세요.
    echo   - 인터넷 연결을 확인하신 후 다시 시도해 주세요.
    echo ========================================================
)

echo.
pause
