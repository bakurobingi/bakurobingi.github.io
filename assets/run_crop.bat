@echo off
setlocal ENABLEDELAYEDEXPANSION
title 一键缩略图生成器

REM 1) 切到本 .bat 所在目录
cd /d "%~dp0"
echo 当前目录: %cd%
echo.

REM 2) 锁定要运行的脚本
set SCRIPT=crop_thumbs.py
if not exist "%SCRIPT%" (
  if exist "assets\crop_thumbs.py" (
    cd /d "assets"
    set SCRIPT=crop_thumbs.py
    echo 已切换到: %cd%
  ) else (
    echo ❌ 未找到 %SCRIPT%（也没有 assets\crop_thumbs.py）
    echo   请把 run_crop.bat 和 crop_thumbs.py 放在同一個文件夾，或把兩個都放到 assets/ 下
    pause
    exit /b
  )
)

REM 3) 选择 Python 入口
where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")

echo 检查 Python...
%PY% --version || (
  echo ❌ 没检测到 Python。请安装或把 Python 加入 PATH。
  pause & exit /b
)
echo.

REM 4) 安装 Pillow（若未安装）
echo 检查 Pillow...
%PY% -m pip show pillow >nul 2>&1 || (
  echo 🔄 正在安装 Pillow...
  %PY% -m pip install --upgrade pip >nul 2>&1
  %PY% -m pip install pillow
)
echo.

REM 5) 确保输入/输出目录
if not exist "gallery_src" mkdir "gallery_src"
if not exist "gallery_thumbs" mkdir "gallery_thumbs"

echo 开始生成缩略图...
%PY% "%SCRIPT%"

echo.
echo =============================
echo 🎉 全部完成！缩略图在 gallery_thumbs 文件夹里
echo =============================
pause
endlocal
