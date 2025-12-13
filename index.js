document.addEventListener('DOMContentLoaded', function () {

  // ▼▼▼ Supabase 設定 ▼▼▼
  var SUPABASE_URL = 'https://kmgetttzcynuruvwacld.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZ2V0dHR6Y3ludXJ1dndhY2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDI4MDUsImV4cCI6MjA4MTE3ODgwNX0.6UC6LF7ghREyea0j2lk2UD0jZTaVqL3kkFWJwhEDrbc';
  var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  var thanksPageUrl = 'thanks.html';
  var checkBox = document.getElementById('sg-agree-check');
  var submitBtn = document.getElementById('sg-submit-btn');

  // --- 署名パッド設定 ---
  var canvas = document.getElementById('sg-signature-pad');
  var signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)' // 背景白
  });

  // Canvasサイズ調整（高解像度対応）
  function resizeCanvas() {
    var ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear(); // サイズ変更でクリアされる
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // クリアボタン
  document.getElementById('sg-clear-signature').addEventListener('click', function () {
    signaturePad.clear();
  });

  if (checkBox && submitBtn) {
    var modal = document.getElementById('sg-modal');
    var modalConfirmBtn = document.getElementById('sg-modal-confirm');

    // チェックボックスの変更検知
    checkBox.addEventListener('change', function () {
      if (this.checked) {
        // モーダルを開く
        modal.style.display = 'block';
        resizeCanvas(); // モーダル表示時にリサイズしないと正しく描画できない場合がある
      } else {
        // チェックを外したらボタン無効化
        submitBtn.disabled = true;
        submitBtn.textContent = '署名して送信する';
      }
    });

    // モーダル内の「確定する」ボタン
    modalConfirmBtn.addEventListener('click', function () {
      if (signaturePad.isEmpty()) {
        alert('署名をお願いします。');
        return;
      }
      // 署名があればモーダルを閉じる
      modal.style.display = 'none';

      // 送信ボタンを有効化
      submitBtn.disabled = false;
      submitBtn.textContent = '同意して送信する'; // 文言変更
    });

    // 送信ボタンクリック時の処理
    submitBtn.addEventListener('click', async function (e) {
      e.preventDefault();

      if (signaturePad.isEmpty()) {
        alert('署名が確認できません。再度チェックボックスから署名を行ってください。');
        return;
      }

      // ボタンを無効化（二重送信防止）
      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      try {
        // 1. 署名を画像データ(Blob)に変換
        var dataUrl = signaturePad.toDataURL('image/png');
        var blob = await (await fetch(dataUrl)).blob();
        var fileName = 'sign_' + Date.now() + '.png';

        // 2. Supabase Storageへアップロード
        var { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('signatures')
          .upload(fileName, blob, {
            contentType: 'image/png'
          });

        if (uploadError) throw uploadError;

        var signaturePath = uploadData.path;
        // 公開URLを取得する場合（バケットがPublicなら）
        var { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(signaturePath);
        var publicUrl = publicUrlData.publicUrl;

        // 3. データベースへ保存 (agreementsテーブル)
        // テーブル定義: id (uuid), created_at (timestamp), signature_url (text), user_agent (text)
        var { error: dbError } = await supabase
          .from('agreements')
          .insert([
            {
              signature_url: publicUrl,
              user_agent: navigator.userAgent
            }
          ]);

        if (dbError) throw dbError;

        // 4. サンクスページへ遷移
        window.location.href = thanksPageUrl;

      } catch (error) {
        console.error('Error:', error);
        alert('送信に失敗しました。\nエラー: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = '署名して送信する'; // 文言を元に戻す
      }
    });
  }
});