export const THEME_INIT_SCRIPT = `
(function(){
  try{
    var t = localStorage.getItem('theme');
    if(!t){
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = t;
  }catch(e){
    document.documentElement.dataset.theme = 'light';
  }
})();
`;
