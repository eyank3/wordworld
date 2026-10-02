@echo off
pushd "%~dp0"
start "" "http://localhost:8000/index.html"
where py >nul 2>&1
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  python -m http.server 8000
)
popd
pause
