document.addEventListener('DOMContentLoaded', function() {
  
  // ▼▼▼ 【重要】URL設定 ▼▼▼
  var thanksPageUrl = 'thanks.html';
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  
  var checkBox = document.getElementById('sg-agree-check');
  var submitBtn = document.getElementById('sg-submit-btn');

  if(checkBox && submitBtn){
    // チェックボックスの変更検知
    checkBox.addEventListener('change', function() {
      if (this.checked) {
        submitBtn.disabled = false;
      } else {
        submitBtn.disabled = true;
      }
    });

    // 送信ボタンクリック時の画面遷移
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // サンクスページへ遷移
      window.location.href = thanksPageUrl;
    });
  }
});