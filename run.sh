#!/bin/bash

echo "=========================================="
echo "  规则依赖图可视化系统"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -d "frontend" ]; then
    echo "错误: 请在 RuleDepDemo 目录下运行此脚本"
    exit 1
fi

# 检查数据目录
if [ ! -d "data" ]; then
    echo "错误: 找不到数据目录 data/"
    exit 1
fi

# 检查是否已安装依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "检测到首次运行，正在安装依赖..."
    cd frontend
    npm install
    cd ..
    echo "依赖安装完成！"
    echo ""
fi

# 检查软链接（整个data目录）
if [ ! -L "frontend/public/data" ]; then
    echo "创建数据目录软链接..."
    mkdir -p frontend/public
    cd frontend/public
    ln -sf ../../data data
    cd ../..
    echo "软链接创建完成！"
    echo ""
fi

echo "正在启动开发服务器..."
echo ""
cd frontend
npm run dev
