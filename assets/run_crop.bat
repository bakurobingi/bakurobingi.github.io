@echo off
title 一键缩略图生成器
echo 检查 Python...
python --version || (
    echo [错误] 没有检测到 Python，请先安装再运行。
    pause
    exit /b
)

echo.
echo 开始生成缩略图...
python crop_thumbs.py

echo.
echo =============================
echo 🎉 全部完成！缩略图在 gallery_thumbs 文件夹里
echo =============================

pause
