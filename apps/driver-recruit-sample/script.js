// サンプルのため、応募内容はどこにも送信せず画面に表示するだけにする
const form = document.getElementById("apply-form");
const result = document.getElementById("form-result");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  result.textContent = `${data.get("name")} さん、ありがとうございます（サンプルのため送信はされていません）。実際のサイトでは、ここで担当者にメールやLINEで通知が届きます。`;
  result.hidden = false;
  form.reset();
});
