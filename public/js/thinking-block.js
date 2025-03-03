// 为思考块添加交互功能
document.addEventListener('DOMContentLoaded', function() {
  setupThinkingBlocks();
});

// 监听DOM变化，为新添加的思考块添加交互功能
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
      setupThinkingBlocks();
    }
  });
});

// 开始观察DOM变化
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 设置思考块的交互功能
function setupThinkingBlocks() {
  const thinkingBlocks = document.querySelectorAll('.thinking-block:not(.initialized)');
  
  thinkingBlocks.forEach(block => {
    const header = block.querySelector('.thinking-header');
    if (header) {
      header.addEventListener('click', () => {
        block.classList.toggle('collapsed');
      });
    }
    
    // 标记为已初始化
    block.classList.add('initialized');
  });
}
