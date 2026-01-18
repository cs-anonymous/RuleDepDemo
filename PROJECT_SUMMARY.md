# 规则依赖图可视化系统 - 项目总结

## 项目概述

本项目实现了一个交互式的规则依赖图可视化系统，用于分析知识图谱推理中的规则依赖关系和候选实体排名。

## 核心功能

### ✅ 已实现功能

1. **Query管理**
   - 从example.json加载多个query（每行一个JSON对象）
   - 显示query统计信息表格
   - 支持点击选择query

2. **规则依赖图可视化**
   - 使用Cola.js力导向布局自动排列节点
   - 节点大小映射Support，颜色映射Surprisal
   - 带箭头的有向边表示依赖关系
   - 支持Candidate子图高亮
   - 鼠标悬停显示详细信息（Tooltip）

3. **过滤功能**
   - 按Surprisal范围过滤
   - 按Support范围过滤
   - 按Body Size范围过滤
   - 实时更新图布局

4. **二部图可视化**
   - 展示Rules和Candidates的对应关系
   - D3.js精确绘制
   - GT用绿色标记
   - 支持点击Candidate节点

5. **Candidate信息表格**
   - 展示所有Candidate的详细指标
   - 与二部图垂直对齐
   - 支持点击行高亮子图
   - GT行绿色背景标记

6. **交互功能**
   - Query选择
   - Candidate选择和高亮
   - 节点/边悬停查看详情
   - 过滤器实时调整

## 技术架构

### 前端技术栈
- **Svelte 5**: 轻量级响应式框架，组件化开发
- **Vite**: 快速的开发服务器和构建工具
- **WebCola**: 约束力导向图布局算法
- **D3.js**: 数据驱动的图形绘制

### 项目结构

```
RuleDepDemo/
├── data/
│   ├── example.json              # 主数据文件
│   └── query.json                # 示例query
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── QueryTable.svelte           # Query选择表格
│   │   │   ├── DependencyGraphPanel.svelte # 规则依赖图+过滤面板
│   │   │   ├── BipartitePanel.svelte       # 二部图+信息表格
│   │   │   └── Tooltip.svelte              # Tooltip组件
│   │   ├── lib/
│   │   │   ├── dataProcessor.js            # 数据加载和处理
│   │   │   └── graphLayout.js              # Cola.js布局逻辑
│   │   ├── App.svelte                      # 主应用组件
│   │   ├── app.css                         # 全局样式
│   │   └── main.js                         # 入口文件
│   ├── public/
│   │   └── data/
│   │       └── example.json                # 软链接
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── 使用说明.md                   # 详细使用文档
├── 启动.sh                       # 快速启动脚本
└── PROJECT_SUMMARY.md            # 本文档
```

## 核心模块说明

### 1. dataProcessor.js
- `loadDataFile()`: 加载JSON文件（支持每行一个对象的格式）
- `buildQueryIndex()`: 构建query索引表
- `processQueryData()`: 处理单个query数据，构建图结构
- `calculateMetricRanges()`: 计算指标范围
- `applyFilters()`: 应用过滤器

### 2. graphLayout.js
- `createColaLayout()`: 创建Cola布局实例
- `runLayout()`: 运行布局计算
- `calculateNodeSize()`: 根据Support计算节点大小
- `calculateNodeColor()`: 根据Surprisal计算节点颜色
- `calculateEdgeWidth()`: 计算边宽度

### 3. QueryTable.svelte
- 显示所有query及统计信息
- 支持选择query
- 响应式更新

### 4. DependencyGraphPanel.svelte
- 集成过滤面板和依赖图
- Cola.js力导向布局
- SVG绘制节点和边
- 处理高亮和悬停事件

### 5. BipartitePanel.svelte
- D3.js绘制二部图
- 展示Candidate信息表格
- 处理Candidate选择

### 6. Tooltip.svelte
- 全局tooltip组件
- 显示节点/边详细信息
- 智能定位避免超出屏幕

### 7. App.svelte
- 主应用容器
- 状态管理（query选择、candidate选择、高亮状态）
- 事件处理和组件协调

## 数据流

```
example.json (每行一个query)
    ↓
loadDataFile() - 解析文件
    ↓
buildQueryIndex() - 建立索引
    ↓
QueryTable - 显示表格
    ↓
用户选择query
    ↓
processQueryData() - 处理数据
    ↓
┌─────────────────────┬──────────────────────┐
│ DependencyGraphPanel│   BipartitePanel     │
│  - 过滤面板          │   - 二部图           │
│  - Cola.js依赖图     │   - 信息表格         │
└─────────────────────┴──────────────────────┘
    ↓                       ↓
  用户过滤              用户选择Candidate
    ↓                       ↓
  更新图布局            高亮子图
```

## 视觉设计

### 配色方案
- 主题色：紫色渐变 (#667eea → #764ba2)
- 节点颜色：蓝色(低Surprisal) → 红色(高Surprisal)
- GT标记：绿色 (#4caf50)
- 高亮：红色 (#ff6b6b)
- 背景：浅灰 (#f8f9fa)

### 布局设计
- 顶部：Query表格（固定高度，可滚动）
- 左侧：规则依赖图（flex: 1，自适应）
- 右侧：二部图+信息表格（固定宽度600px）
- 响应式：屏幕<1400px时垂直排列

## 性能优化

1. **按需加载**: 只有选中query时才处理和渲染数据
2. **增量更新**: 使用Svelte的响应式特性，只更新变化的部分
3. **布局缓存**: Cola.js计算的位置会保留，避免重复计算
4. **过滤优化**: 在数据层面过滤，减少渲染节点数量
5. **D3 join模式**: 高效的DOM更新

## 用户体验

### 交互反馈
- 悬停：节点/边显示边框和tooltip
- 点击：Candidate行和节点有选中状态
- 高亮：相关元素高亮，无关元素半透明
- 加载：显示加载动画

### 可用性
- 帮助文本：顶部显示使用流程
- 视觉提示：GT用绿色标记
- 对齐设计：表格行与二部图节点对齐
- 响应式：支持不同屏幕尺寸

## 快速开始

### 方式1：使用启动脚本
```bash
cd RuleDepDemo
./启动.sh
```

### 方式2：手动启动
```bash
cd RuleDepDemo/frontend
npm install  # 首次需要
npm run dev
```

然后打开浏览器访问: http://localhost:5173/

## 文档

- **README.md**: 技术文档和API说明
- **使用说明.md**: 详细的用户使用指南
- **PROJECT_SUMMARY.md**: 本项目总结文档

## 未来扩展

可能的改进方向：

1. **导出功能**: 导出图片、导出选中子图数据
2. **搜索功能**: 按规则内容搜索节点
3. **布局切换**: 支持Dagre分层布局
4. **比较模式**: 并排比较多个Candidate
5. **统计面板**: 显示更多聚合统计信息
6. **历史记录**: 保存用户的选择和过滤状态
7. **自定义配色**: 允许用户自定义颜色映射

## 开发者信息

- 开发时间: 2026年1月
- 框架版本:
  - Svelte: 5.x
  - Vite: 7.3.x
  - WebCola: 最新版
  - D3: 最新版

## 许可证

MIT License
