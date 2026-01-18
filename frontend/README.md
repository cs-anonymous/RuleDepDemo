# 规则依赖图可视化系统

一个用于可视化规则依赖关系的交互式前端应用，支持查看预测规则、Candidate关系以及依赖图分析。

## 功能特性

### 1. Query选择表格
- 显示所有query及其统计信息
- 列：query, #nodes, #edges, #candidates, GT_rank
- 点击行选择要可视化的query

### 2. 规则依赖图（左侧）
- **过滤面板**：根据 Surprisal、Support、Body Size 过滤节点
- **Cola.js力导向布局**：自动排列规则节点，避免重叠
- **节点可视化**：
  - 大小映射到 Support
  - 颜色映射到 Surprisal（蓝色=低，红色=高）
- **边可视化**：带箭头的有向边，表示规则依赖关系
- **高亮功能**：点击Candidate时高亮对应的子图
- **Tooltip**：鼠标悬停显示节点/边的详细信息

### 3. 二部图+Candidate信息（右侧）
- **二部图**：
  - 左列：Rules节点
  - 右列：Candidates节点
  - 连线：展示Candidate包含的规则
  - GT用绿色标记
- **Candidate信息表格**：
  - 与二部图中的candidate位置对齐
  - 显示：name, GT标记, originalSurprisal, baseSurprisal, newSurprisal, rankBefore→rankAfter
  - 点击行高亮对应的规则子图
  - GT Candidate用绿色背景标记

## 技术栈

- **前端框架**: Svelte 5
- **构建工具**: Vite
- **图布局**: webcola (Cola.js力导向布局)
- **可视化**: D3.js (二部图绘制)
- **样式**: 原生CSS

## 安装和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```
然后在浏览器中打开 http://localhost:5173/

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 数据格式

数据文件 `public/data/example.json` 中每行是一个独立的query对象：

```json
{
  "query": "entity relation ?",
  "nodes": [
    ["rule_string", bodySize, supp, surprisal],
    ...
  ],
  "edges": [
    [sourceIdx, targetIdx, bodySize, supp, surprisal],
    ...
  ],
  "candidates": [
    {
      "name": "candidate_name",
      "nodes": [0, 1, 2],
      "edges": [0, 1],
      "GT": true/false,
      "originalSurprisal": 1.5,
      "baseSurprisal": 1.2,
      "newSurprisal": 2.0,
      "rankBefore": 5,
      "rankAfter": 3
    },
    ...
  ]
}
```

## 交互说明

1. **选择Query**：在顶部表格中点击某一行
2. **过滤规则**：使用左侧过滤面板的滑块调整指标范围
3. **查看详情**：鼠标悬停在节点或边上查看详细信息
4. **高亮子图**：
   - 在右侧二部图中点击Candidate节点
   - 或在右侧表格中点击Candidate行
   - 左侧依赖图会高亮显示该Candidate包含的规则和边
5. **取消高亮**：再次点击已选中的Candidate

## 项目结构

```
frontend/
├── src/
│   ├── App.svelte                      # 主应用组件
│   ├── components/
│   │   ├── QueryTable.svelte           # Query选择表格
│   │   ├── DependencyGraphPanel.svelte # 规则依赖图+过滤面板
│   │   ├── BipartitePanel.svelte       # 二部图+Candidate信息表格
│   │   └── Tooltip.svelte              # Tooltip组件
│   ├── lib/
│   │   ├── graphLayout.js              # Cola.js布局逻辑
│   │   └── dataProcessor.js            # 数据加载和处理
│   ├── app.css                         # 全局样式
│   └── main.js                         # 入口文件
├── public/
│   └── data/
│       └── example.json                # 数据文件（软链接）
├── package.json
└── vite.config.js
```

## 开发说明

- 使用Svelte的响应式特性管理状态
- Cola.js自动计算节点位置，避免手动布局
- D3.js用于二部图的精确绘制和数据绑定
- 所有组件都支持响应式更新

## 许可证

MIT
