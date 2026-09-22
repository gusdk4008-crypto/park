@echo off
chcp 65001 > nul
echo ========================================================
echo   CubeSection Studio (큐브단면 스튜디오) 실행 중...
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [알림] 로컬 웹 서버를 시작합니다 (http://localhost:8000)...
    start http://localhost:8000
    python -m http.server 8000
) else (
    echo [알림] 기본 웹 브라우저로 index.html을 직접 엽니다...
    start index.html
)
