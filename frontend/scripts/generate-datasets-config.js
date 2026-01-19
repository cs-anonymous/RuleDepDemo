/**
 * 自动生成datasets-config.json配置文件
 * 扫描out目录下的所有dataset文件夹，并查找每个dataset下的eval-*.json文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, '../public/out');
const configPath = path.join(__dirname, '../public/datasets-config.json');

function generateConfig() {
  const config = { datasets: {} };
  
  // 读取out目录下的所有文件夹
  if (!fs.existsSync(outDir)) {
    console.error(`目录不存在: ${outDir}`);
    return;
  }
  
  const items = fs.readdirSync(outDir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      const datasetName = item.name;
      const datasetPath = path.join(outDir, datasetName);
      
      // 查找该dataset目录下的所有eval-*.json文件
      const records = [];
      try {
        const files = fs.readdirSync(datasetPath);
        for (const file of files) {
          const match = file.match(/^eval-(.+)\.json$/);
          if (match) {
            records.push(match[1]);
          }
        }
        records.sort();
      } catch (e) {
        console.warn(`无法读取目录 ${datasetPath}:`, e.message);
      }
      
      config.datasets[datasetName] = {
        records: records
      };
    }
  }
  
  // 写入配置文件
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`配置文件已生成: ${configPath}`);
  console.log(`找到 ${Object.keys(config.datasets).length} 个datasets`);
}

generateConfig();
