import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { MessageIcon } from './icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-4xl mx-auto md:mt-12"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 shadow-lg">
        <div className="grid md:grid-cols-5 gap-0">
          {/* 左侧图像区域 */}
          <div className="md:col-span-2 flex items-center justify-center p-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-zinc-800 dark:to-zinc-700">
            <div className="relative w-full h-64 flex items-center justify-center">
              <div className="absolute w-32 h-32 bg-blue-500 dark:bg-blue-600 rounded-full opacity-20 animate-pulse" style={{ animationDuration: '3s' }}></div>
              <div className="absolute w-48 h-48 bg-indigo-500 dark:bg-indigo-600 rounded-full opacity-10 animate-pulse" style={{ animationDuration: '4s' }}></div>
              <MessageIcon size={64} className="relative z-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          {/* 右侧文字区域 */}
          <div className="md:col-span-3 p-8 flex flex-col justify-center text-left">
            <h1 className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 text-transparent bg-clip-text">
              南山实验教育集团智能助手
            </h1>
            
            <p className="mb-4 text-zinc-700 dark:text-zinc-300 leading-relaxed">
              这是一个专为南山实验教育集团师生打造的智能对话平台。您可以在这里提问学习相关问题、寻求创意灵感、获取知识解答，或者探索各种学科领域的内容。
            </p>
            
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              无论是备课、学习、研究还是日常教学，智能助手都能为您提供及时、专业的支持。请在下方输入框中开始您的提问。
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
