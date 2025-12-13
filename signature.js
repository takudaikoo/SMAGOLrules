document.addEventListener('DOMContentLoaded', function () {

    // ▼▼▼ Supabase 設定 ▼▼▼
    var SUPABASE_URL = 'https://kmgetttzcynuruvwacld.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZ2V0dHR6Y3ludXJ1dndhY2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDI4MDUsImV4cCI6MjA4MTE3ODgwNX0.6UC6LF7ghREyea0j2lk2UD0jZTaVqL3kkFWJwhEDrbc';
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    var thanksPageUrl = 'thanks.html';
    var confirmBtn = document.getElementById('sg-confirm-btn');
    var clearBtn = document.getElementById('sg-clear-btn');
    var canvas = document.getElementById('sg-full-canvas');

    // --- 署名パッド設定 ---
    // --- 署名パッド設定 ---
    var signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)' // 背景白
    });

    // v4系は onEnd オプションではなくイベントリスナーを使用
    signaturePad.addEventListener("endStroke", () => {
        if (!signaturePad.isEmpty()) {
            confirmBtn.disabled = false; // ボタン有効化
        }
    });

    // Canvasサイズ調整（フルスクリーン）
    function resizeCanvas() {
        var ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);

        // リサイズ時のクリア対策（今回はリセットさせる仕様）
        signaturePad.clear();
        confirmBtn.disabled = true; // クリアされたらボタンも無効化
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // クリアボタン
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            signaturePad.clear();
            confirmBtn.disabled = true; // ボタン無効化
        });
    }

    // 確定ボタンクリック時の処理
    confirmBtn.addEventListener('click', async function () {
        if (signaturePad.isEmpty()) {
            // 通常はdisabledなのでここには来ないはずだが念のため
            return;
        }

        // 確認ポップアップ
        if (!confirm('送信しますか？')) {
            return; // 「いいえ」なら何もしない
        }

        // 送信処理開始
        confirmBtn.textContent = '送信中...';
        confirmBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true; // 送信中はクリアも無効

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
            // 公開URLを取得
            var { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(signaturePath);
            var publicUrl = publicUrlData.publicUrl;

            // 3. データベースへ保存 (agreementsテーブル)
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
            confirmBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
            confirmBtn.textContent = '確定する';
        }
    });

});
