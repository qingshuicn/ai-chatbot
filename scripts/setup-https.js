#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 项目根目录
const rootDir = path.resolve(__dirname, '..');

// 检查证书文件是否存在
const certExists = fs.existsSync(path.join(rootDir, 'localhost.pem'));
const keyExists = fs.existsSync(path.join(rootDir, 'localhost-key.pem'));

// 如果证书不存在，生成新证书
if (!certExists || !keyExists) {
  console.log('生成本地SSL证书...');
  try {
    // 使用node_modules中的mkcert
    const mkcertPath = path.join(rootDir, 'node_modules', '.bin', 'mkcert');
    
    // 创建CA证书
    execSync(`${mkcertPath} create-ca`, { stdio: 'inherit', cwd: rootDir });
    
    // 为localhost创建证书
    execSync(`${mkcertPath} create-cert --domains localhost`, { stdio: 'inherit', cwd: rootDir });
    
    // 重命名证书文件为local-ssl-proxy需要的名称
    if (fs.existsSync(path.join(rootDir, 'cert.crt'))) {
      fs.renameSync(
        path.join(rootDir, 'cert.crt'),
        path.join(rootDir, 'localhost.pem')
      );
    }
    
    if (fs.existsSync(path.join(rootDir, 'cert.key'))) {
      fs.renameSync(
        path.join(rootDir, 'cert.key'),
        path.join(rootDir, 'localhost-key.pem')
      );
    }
    
    console.log('SSL证书生成成功！');
  } catch (error) {
    console.error('生成SSL证书失败:', error.message);
    process.exit(1);
  }
} else {
  console.log('SSL证书已存在，跳过生成步骤');
}

// 创建或更新.env.local文件，添加HTTPS=true
const envPath = path.join(rootDir, '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  
  // 检查是否已经有HTTPS配置
  if (!envContent.includes('HTTPS=')) {
    envContent += '\n# 启用HTTPS\nHTTPS=true\n';
  } else if (!envContent.includes('HTTPS=true')) {
    // 替换HTTPS=false为HTTPS=true
    envContent = envContent.replace(/HTTPS=false/g, 'HTTPS=true');
  }
} else {
  envContent = '# 启用HTTPS\nHTTPS=true\n';
}

fs.writeFileSync(envPath, envContent);
console.log('.env.local文件已更新，HTTPS已启用');

console.log('\n现在可以运行 "pnpm run dev:https" 启动HTTPS开发服务器');
console.log('HTTPS服务将在 https://localhost:3001 上可用');
