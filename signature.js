document.addEventListener('DOMContentLoaded', function () {

    // Supabase 設定削除済み

    var thanksPageUrl = 'thanks.html';
    var confirmBtn = document.getElementById('sg-confirm-btn');
    var clearBtn = document.getElementById('sg-clear-btn');
    var canvas = document.getElementById('sg-full-canvas');

    // --- 署名パッド設定 ---
    // --- 署名パッド設定 ---
    var signaturePad = new SignaturePad(canvas, {
        // backgroundColor: 'rgb(255, 255, 255)' // 背景を透過させるためコメントアウト
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
            // 1. 署名を画像データ(Base64)として取得
            var dataUrl = signaturePad.toDataURL('image/png');
            var fileName = 'sign_' + Date.now() + '.png';

            // 2. Google Driveへアップロード (GAS経由)
            var GAS_URL = 'https://script.google.com/macros/s/AKfycbxHQyw4JmUgp8kZTx1HfGslC0zKeTztUuj0gKWBwcDUTfB1y__VnKGI7ldqEKJGsp43/exec';

            // dataUrl ("data:image/png;base64,...") そのまま送信してもGAS側でパース可能に作ってありますが、
            // ここでは念の為そのまま送ります (GAS側で split 処理などが実装されている前提)

            var response = await fetch(GAS_URL, {
                method: 'POST',
                mode: 'cors', // 必須: GAS Web App は CORS ヘッダーを返す必要がある
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // GASへのPOSTは text/plain が無難 (JSONだとpreflightで弾かれることがあるため)
                },
                body: JSON.stringify({
                    image: dataUrl,
                    filename: fileName
                })
            });

            var result = await response.json();

            if (result.status !== 'success') {
                // 特定のエラー（アクセス拒否）は、ファイルアップロード自体は成功しているため許容する
                // GAS側で setSharing 等に失敗している可能性があるが、運用上は画像が保存されていればOKとする
                if (result.message && (result.message.indexOf('アクセスが拒否されました') !== -1 || result.message.indexOf('Access denied') !== -1)) {
                    console.warn('Google Drive permission error ignored (file assumed uploaded): ' + result.message);
                } else {
                    throw new Error('Google Drive upload failed: ' + (result.message || 'Unknown error'));
                }
            }

            // 3. データベース保存処理は削除 (Google Drive保存のみ)

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
