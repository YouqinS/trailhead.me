(() => {
  if (window.preloadFeed && window.preloadFeed.length) {
    const content = document.querySelector('content');
    window.preloadFeed.forEach(post => {
      console.log(post);
      const element = createPost(post, true);
      content.appendChild(element);
    });
  }
})();