[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$host.UI.RawUI.WindowTitle = "큐브단면 스튜디오 - GitHub 자동 업데이트"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  큐브단면 스튜디오 (CubeSection Studio)" -ForegroundColor Cyan
Write-Host "  GitHub 자동 업데이트 전송" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

git config user.name "gusdk4008-crypto"
git config user.email "gusdk4008-crypto@users.noreply.github.com"

Write-Host "[1/3] 변경된 파일들을 저장하는 중..." -ForegroundColor Yellow
git add .
git commit -m "Update CubeSection Studio" 2>$null
git branch -M main

Write-Host "[2/3] GitHub 저장소와 동기화 확인 중..." -ForegroundColor Yellow
git pull --rebase origin main 2>$null

Write-Host "[3/3] GitHub로 최신 파일을 전송합니다..." -ForegroundColor Yellow
Write-Host "* 브라우저에 GitHub 로그인 창이 뜨면 승인(Authorize)을 클릭해 주세요.`n" -ForegroundColor Gray

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "  [성공] GitHub에 정상적으로 업데이트되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  공유 웹사이트 주소:" -ForegroundColor White
    Write-Host "  https://gusdk4008-crypto.github.io/park/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  * 약 1~2분 뒤 웹사이트에 새로운 내용이 자동 반영됩니다." -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`n========================================================" -ForegroundColor Red
    Write-Host "  [안내] 전송이 완료되지 않았습니다." -ForegroundColor Red
    Write-Host "  브라우저 로그인 팝업 창이 떴는지 확인해 주세요." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Red
}

Write-Host "`n창을 닫으려면 아무 키나 누르세요..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
